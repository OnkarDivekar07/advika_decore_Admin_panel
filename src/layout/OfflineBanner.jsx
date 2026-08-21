// src/layout/OfflineBanner.jsx
//
// PHASE 16 — rendered once, in AdminLayout, so every admin screen gets
// the same connectivity signal without each page wiring it up itself.
// Deliberately doesn't block or disable anything on its own — screens
// still attempt requests while offline and get a normal (network-error)
// failure back through the usual loading/error/retry states (see
// utils/apiError.js's isNetworkError). This is purely informational: it
// tells the admin *why* things are about to start failing, and
// confirms when connectivity is back, without taking any action for
// them.
import useNetworkStatus from '../hooks/useNetworkStatus';

const OfflineBanner = () => {
  const { isOnline, justReconnected } = useNetworkStatus();

  if (isOnline && !justReconnected) return null;

  if (!isOnline) {
    return (
      <div
        role="alert"
        className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white"
      >
        <i className="fas fa-wifi" aria-hidden="true"></i>
        You're offline. Changes won't save until your connection comes back.
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-green-600 px-4 py-2 text-center text-sm font-medium text-white"
    >
      <i className="fas fa-check" aria-hidden="true"></i>
      Back online.
    </div>
  );
};

export default OfflineBanner;
