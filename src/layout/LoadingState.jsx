// src/layout/LoadingState.jsx
const LoadingState = ({ label = 'Loading…' }) => (
  <div
    className="flex items-center justify-center gap-3 py-12 text-sm text-gray-500"
    role="status"
    aria-live="polite"
  >
    <svg className="h-5 w-5 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
    <span>{label}</span>
  </div>
);

export default LoadingState;
