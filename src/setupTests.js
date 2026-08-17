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
