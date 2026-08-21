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
