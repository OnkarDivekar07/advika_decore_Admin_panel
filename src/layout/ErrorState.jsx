// src/layout/ErrorState.jsx
const ErrorState = ({
  message = 'Something went wrong.',
  onRetry,
  className = '',
  'data-testid': dataTestId,
}) => (
  <div
    role="alert"
    data-testid={dataTestId}
    className={`rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 ${className}`}
  >
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-start gap-2">
        <i className="fas fa-circle-exclamation mt-0.5" aria-hidden="true"></i>
        <span>{message}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          data-testid={dataTestId ? `${dataTestId}-retry-btn` : undefined}
          className="shrink-0 rounded font-medium text-red-700 underline hover:text-red-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
        >
          Retry
        </button>
      )}
    </div>
  </div>
);

export default ErrorState;
