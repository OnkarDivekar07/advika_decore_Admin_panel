// src/context/AuthContext.jsx
//
// Single source of truth for admin authentication/session state in the
// panel. Everything that used to touch localStorage directly for auth
// (LoginPage, ProtectedRoute, Header, Settings) now goes through this
// context instead, so there is exactly one login() and exactly one
// logout() in the whole app.
//
// Important: this context is a UX layer, not a security boundary. The
// backend's authenticate + authorizeAdminOnly middleware is what actually
// enforces admin-only access on every request (see
// backend/src/middlewares/authorizeAdminOnly.js). This context:
//   - stores what POST /api/admin/login returned, so screens don't
//     re-fetch it,
//   - re-confirms that with the backend via GET /api/admin/me on load
//     (a stored token string is never treated as proof of authorization
//     by itself),
//   - and reacts to apiClient's session-invalidated signal (fired on any
//     401/403) by clearing state and redirecting to /login.
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { setSessionInvalidatedHandler } from '../api/apiClient';
import {
  getStoredToken,
  getStoredUser,
  setStoredSession,
  clearStoredSession,
} from '../api/session';

const AuthContext = createContext(undefined);

const SESSION_MESSAGES = {
  expired: 'Your session has expired. Please log in again.',
  forbidden: 'This account does not have admin access.',
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => getStoredUser());
  // 'checking' | 'ready' — whether GET /api/admin/me has resolved yet for
  // an existing stored token. ProtectedRoute uses this to avoid a flash of
  // "redirecting to login" while that authoritative check is in flight.
  const [status, setStatus] = useState(() =>
    getStoredToken() ? 'checking' : 'ready'
  );
  const [sessionMessage, setSessionMessage] = useState(null);
  const navigate = useNavigate();

  const clearSession = useCallback(() => {
    clearStoredSession();
    setToken(null);
    setUser(null);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSessionMessage(null);
    setStatus('ready');
    navigate('/', { replace: true });
  }, [clearSession, navigate]);

  // Register the apiClient hook once. Using a ref for the navigate-driven
  // logic avoids re-registering (and briefly leaving no handler wired up)
  // every time `navigate` identity changes.
  const handleInvalidatedRef = useRef();
  handleInvalidatedRef.current = (reason) => {
    clearSession();
    setSessionMessage(SESSION_MESSAGES[reason] || SESSION_MESSAGES.expired);
    setStatus('ready');
    navigate('/', { replace: true });
  };

  useEffect(() => {
    setSessionInvalidatedHandler((reason) => handleInvalidatedRef.current(reason));
    return () => setSessionInvalidatedHandler(null);
  }, []);

  // Authoritative session check: a token surviving in localStorage proves
  // nothing by itself (it could be expired, or the account could have been
  // deleted/demoted since). Confirm with the backend once per token — a
  // token we just got directly from a successful login() response is
  // already backend-confirmed, so verifiedTokenRef lets that skip this
  // redundant extra round trip while still re-checking any *stored*
  // token found on mount/refresh.
  const verifiedTokenRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    if (!token || verifiedTokenRef.current === token) {
      setStatus('ready');
      return undefined;
    }

    apiClient
      .get('/api/admin/me')
      .then((response) => {
        if (cancelled) return;
        const freshUser = response.data.data;
        verifiedTokenRef.current = token;
        setUser(freshUser);
        setStoredSession(token, freshUser);
        setStatus('ready');
      })
      .catch(() => {
        // apiClient's response interceptor already clears storage and
        // will fire the session-invalidated handler for 401/403; nothing
        // further to do here. Guard status in case that hasn't run yet
        // (e.g. network error, no response at all).
        if (!cancelled) setStatus('ready');
      });

    return () => {
      cancelled = true;
    };
    // Only re-run if the token itself changes (e.g. a fresh login) — not on
    // every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = useCallback(async ({ email, password }) => {
    const response = await apiClient.post('/api/admin/login', {
      email,
      password,
    });
    const { token: newToken, user: newUser } = response.data.data;
    setStoredSession(newToken, newUser);
    verifiedTokenRef.current = newToken;
    setToken(newToken);
    setUser(newUser);
    setSessionMessage(null);
    setStatus('ready');
    return newUser;
  }, []);

  const clearSessionMessage = useCallback(() => setSessionMessage(null), []);

  const value = {
    token,
    user,
    // Deliberately does NOT decode/inspect the JWT. `user` only ever comes
    // from a backend response (login, or the /me re-check above), and the
    // backend only ever returns a role-'admin' user from either endpoint.
    isAuthenticated: Boolean(token && user),
    isCheckingSession: status === 'checking',
    sessionMessage,
    clearSessionMessage,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
