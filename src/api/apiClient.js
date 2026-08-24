// src/api/apiClient.js
//
// Single shared axios instance for the admin panel. Every admin API call
// should go through this instance so:
//   1. The Bearer token is attached exactly once, in exactly one place
//      (previously several screens independently built
//      `axios.get(url, { headers: { Authorization: ... } })`, and some of
//      them just forgot the header).
//   2. A 401/403 from ANY request — not just login — is handled
//      consistently, since the backend's authenticate + authorizeAdminOnly
//      middleware (see backend/src/middlewares/authorizeAdminOnly.js) is
//      the actual security boundary. This client never decides on its own
//      that a session is valid; it only reacts to what the backend says.
//
// The backend's response envelope (see backend/src/utils/sendResponse.js) is
// ALWAYS: { success, message, data, meta }. Screens still read
// `response.data.data` / `response.data.meta` themselves (kept explicit
// rather than "magically" unwrapped here) so it's always clear in each
// component which part of the envelope is being used.
import axios from 'axios';
import { getStoredToken, clearStoredSession } from './session';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Registered by AuthProvider on mount. Kept as a plain module-level
// callback (rather than importing AuthContext here) so this file has no
// dependency on React/React Router — an axios interceptor isn't a hook and
// can't call useNavigate() itself. AuthProvider owns turning "the backend
// just told us this session is invalid" into actual React state + a
// redirect to /login.
let onSessionInvalidated = null;
export function setSessionInvalidatedHandler(handler) {
  onSessionInvalidated = handler;
}

// PHASE 13 — "handle session expiration gracefully". The backend's own
// authenticate.js isn't fully consistent: it returns 401 when no token is
// sent, but 400 ("Invalid token.") for both a malformed AND an expired
// token (jwt.verify's TokenExpiredError falls into the same catch as
// everything else there) — see
// backend/src/middlewares/authenticate.js. Admin sessions are 1-hour JWTs
// (backend/src/utils/generateToken.js), so this isn't a hypothetical edge
// case: any admin who leaves a tab open past that just hit a 400 that
// this interceptor used to silently ignore, leaving them looking at
// broken screens with no explanation instead of being redirected to
// /login. The customer frontend already solved this the same way (see
// frontend/src/utils/apiClient.js) without needing a backend contract
// change, since re-shaping authenticate.js's response would touch every
// authenticated route in the app, admin and customer-facing alike — this
// mirrors that exact approach for consistency between the two clients.
const AUTH_FAILURE_MESSAGES = [
  'invalid token',
  'access denied',
  'no token provided',
  'jwt expired',
  'jwt malformed',
];

function isTokenFailure(status, data) {
  if (status !== 400) return false;
  const message = String(data?.error || data?.message || '').toLowerCase();
  return AUTH_FAILURE_MESSAGES.some((needle) => message.includes(needle));
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // A 401 from the login request itself just means "wrong credentials" —
    // there's no session yet to invalidate, and LoginPage already shows
    // that error inline. Only react to 401/403 on requests that were
    // relying on an existing session.
    const isLoginRequest = error.config?.url?.includes('/api/admin/login');

    // A handful of screens (orderviewpage.jsx, userviewpage.jsx) fetch a
    // single resource whose 403 means "this specific record is denied to
    // you" rather than "your session/role is invalid" — and build their
    // own dedicated in-page "Access denied" state for exactly that case.
    // Without this opt-out, this interceptor always won the race: it
    // clears the session and redirects to /login before the page's own
    // catch block ever gets to render that UI, making it permanently
    // unreachable. 401 and a malformed/expired-token-shaped 400 are never
    // skippable this way — those always mean the token itself is no
    // longer usable for *any* request, not just this one. Mirrors
    // frontend/src/utils/apiClient.js's identical `__skipAuthHandling`
    // convention for the customer-facing app.
    const skips403Handling = status === 403 && error.config?.__skipAuthHandling;

    const isAuthFailure =
      !isLoginRequest &&
      !skips403Handling &&
      (status === 401 || status === 403 || isTokenFailure(status, error.response?.data));

    if (isAuthFailure) {
      clearStoredSession();
      if (onSessionInvalidated) {
        // 401/expired-or-malformed-400 = no valid token ("please log in
        // again"). 403 = a syntactically valid token that just isn't an
        // admin's ("this account doesn't have admin access") — see
        // authorizeAdminOnly.js. Kept distinguishable so the UI can say
        // the right thing instead of a generic "logged out".
        onSessionInvalidated(status === 403 ? 'forbidden' : 'expired');
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
