import { Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// This is a UX guard, not a security boundary — the backend's authenticate
// + authorizeAdminOnly middleware (see
// backend/src/middlewares/authorizeAdminOnly.js) is the only thing that
// actually enforces admin-only access, verifying the token's signature and
// role server-side on every request. What this component adds on top:
//   - keeps a signed-in *customer* (a valid but non-admin token) from
//     landing on admin screens that would just 401/403 underneath them,
//   - and waits for AuthContext's GET /api/admin/me re-check to finish
//     before deciding, so a stored token is never treated as proof of
//     authorization by itself — if the backend says the session is no
//     longer valid, AuthContext already clears it before this renders.
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isCheckingSession } = useAuth();

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Checking session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
