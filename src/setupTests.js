// jest-dom adds custom jest matchers for asserting on DOM nodes, e.g.
// expect(element).toBeInTheDocument()
import '@testing-library/jest-dom';

// react-router-dom v7 references TextEncoder/TextDecoder at module load
// time; CRA's bundled jsdom test environment doesn't provide them as
// globals the way a real browser or modern Node runtime does. Polyfilled
// here (once, for tests only) rather than anywhere in app code.
import { TextEncoder, TextDecoder } from 'util';
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// jsdom doesn't implement createObjectURL/revokeObjectURL for File/Blob —
// components that show an image preview before upload (e.g.
// BannerManagement) call these directly. Stubbed here (once, for tests
// only) rather than in app code; the fake URL value is never asserted on,
// only that the preview <img> itself renders.
if (typeof global.URL.createObjectURL === 'undefined') {
  global.URL.createObjectURL = () => 'blob:mock-preview-url';
}
if (typeof global.URL.revokeObjectURL === 'undefined') {
  global.URL.revokeObjectURL = () => {};
}

// jsdom never computes real layout, so `offsetParent` — the standard way
// to check "is this element actually visible/rendered" — always reads
// null for every element (see https://github.com/jsdom/jsdom/issues/1590,
// closed as "won't implement"), regardless of any inline/CSS display
// value. useFocusTrap's own candidate-element filter (ConfirmDialog,
// StockAdjustModal) checks exactly `el.offsetParent !== null`, so without
// this stub every focusable element in a test looks invisible and the
// trap's candidate list is always empty — not a real bug, a jsdom gap in
// the test environment itself (confirmed live against a real Chromium
// browser via Pattern 21's axe-core scan, which found no such issue).
// Falling back to parentNode is good enough for tests: never null while
// actually attached to the test's rendered tree, which is the only case
// that matters here. Unconditional (not "define only if missing") because
// jsdom already defines its own getter — one that always returns null —
// so a missing-check would never actually replace it.
Object.defineProperty(global.HTMLElement.prototype, 'offsetParent', {
  get() {
    return this.parentNode;
  },
  configurable: true,
});
