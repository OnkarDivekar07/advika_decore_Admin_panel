// src/utils/apiError.js
//
// PHASE 16 — Error Handling, Recovery & Reliability.
//
// Before this, every screen independently wrote its own
// `err.response?.data?.message || 'Some fallback.'` (see Products.jsx,
// StockAdjustModal.jsx, bannerManagemen.jsx, etc.) — functionally
// consistent, but duplicated in a dozen places and blind to two cases
// none of them handled uniformly:
//   1. A *true* network failure (offline, DNS, CORS, timeout) — axios
//      surfaces this as an error with no `.response` at all, so the old
//      pattern silently fell through to whatever generic fallback string
//      that screen happened to have, e.g. "Failed to load products."
//      even when the real problem was "you're offline".
//   2. Field-level validation errors sent back as an array (see
//      validateRequest.js — `errors: [{ field, message }]`) rather than
//      a single top-level `message`.
//
// This is intentionally the ONLY place that inspects an axios error's
// shape to decide what to tell an admin. Screens that need field-level
// mapping (ProductForm, StockAdjustModal's 409 handling) still own that
// themselves — this only standardizes the general "what single sentence
// do we show" case every list/detail/mutation screen already needed.
//
// A bare JS Error (no `.response`, no `.request` — e.g. a thrown local
// error, or a test's `new Error('network down')`) is deliberately NOT
// classified as a network error: only axios errors carrying a live
// `.request` with no `.response` are, since that's the actual shape a
// browser gives axios when a request never got a response at all.
// Treating every non-axios error as "you're offline" would misinform an
// admin when the real cause is a frontend bug (which the error boundary,
// not this, is responsible for).

/**
 * True for an axios error that represents "the request never got a
 * response" — offline, DNS failure, CORS, a dropped connection, or a
 * client-side timeout. False for a normal HTTP error response (4xx/5xx)
 * and false for a plain non-axios Error/exception.
 */
export function isNetworkError(err) {
  if (!err) return false;
  if (err.code === 'ERR_NETWORK') return true;
  if (err.message === 'Network Error') return true;
  // A real axios request that got no response at all has `.request` set
  // (the underlying XHR/fetch handle) but no `.response`.
  return Boolean(err.request) && !err.response;
}

/** True for axios's own cancellation errors (aborted/superseded requests) — never a user-facing failure. */
export function isCancelError(err) {
  return Boolean(err) && (err.code === 'ERR_CANCELED' || err.name === 'CanceledError' || err.message === 'canceled');
}

/**
 * A best-effort single sentence to show an admin for a failed request.
 * Priority: field-validation messages (joined) > the backend's own
 * `message` > a caller-supplied fallback > a last-resort generic string.
 * Never returns a raw JS error message (a stack-trace-adjacent string
 * like "Cannot read properties of undefined") — that's exactly the class
 * of thing an admin shouldn't see as if it were an application message.
 */
export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback;
  if (isCancelError(err)) return '';
  if (isNetworkError(err)) {
    return 'Network error. Please check your connection and try again.';
  }

  const data = err.response?.data;
  const fieldErrors = data?.errors;
  if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
    const joined = fieldErrors
      .map((e) => (typeof e === 'string' ? e : e?.message))
      .filter(Boolean)
      .join(' ');
    if (joined) return joined;
  }

  return data?.message || fallback;
}

/**
 * Field -> message map from a 422 validation response shaped as
 * `{ errors: [{ field, message }] }` (validateRequest.js's convention).
 * Returns {} for any other shape (e.g. StockAdjustModal's 409
 * `{ errors: { currentStock, insufficientItems } }`, which isn't this
 * per-field-array shape and is handled by that screen directly).
 */
export function getFieldErrors(err) {
  const errors = err?.response?.data?.errors;
  if (!Array.isArray(errors)) return {};
  const map = {};
  errors.forEach((e) => {
    if (e?.field) map[e.field] = e.message;
  });
  return map;
}

/** HTTP status codes worth an automatic/one-click retry — transient, not the request's fault. */
export function isRetryableStatus(status) {
  return status === 408 || status === 429 || (typeof status === 'number' && status >= 500);
}

/** True when retrying the exact same request has a real chance of succeeding (network blip, rate limit, transient 5xx). */
export function isRetryable(err) {
  if (!err) return false;
  if (isNetworkError(err)) return true;
  return isRetryableStatus(err.response?.status);
}
