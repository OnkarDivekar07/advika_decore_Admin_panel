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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // A 401 from the login request itself just means "wrong credentials" —
    // there's no session yet to invalidate, and LoginPage already shows
    // that error inline. Only react to 401/403 on requests that were
    // relying on an existing session.
    const isLoginRequest = error.config?.url?.includes('/api/admin/login');

    if (!isLoginRequest && (status === 401 || status === 403)) {
      clearStoredSession();
      if (onSessionInvalidated) {
        // 401 = missing/invalid/expired token ("please log in again").
        // 403 = a syntactically valid token that just isn't an admin's
        // ("this account doesn't have admin access") — see
        // authorizeAdminOnly.js. Kept distinguishable so the UI can say
        // the right thing instead of a generic "logged out".
        onSessionInvalidated(status === 403 ? 'forbidden' : 'expired');
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
