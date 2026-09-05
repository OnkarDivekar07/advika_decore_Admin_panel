// src/api/session.js
//
// Single owner of the admin session's localStorage keys. Before this file
// existed, 'token' / 'user' were read and written directly from five
// different places (LoginPage, ProtectedRoute, apiClient, Header,
// Settings) with slightly different behavior each time — e.g. Header's
// old logout only ever cleared 'token', never 'user'. Every read/write of
// admin session storage should go through here so there's exactly one
// place that knows the key names and the shape of what's stored.
//
// NOTE: this module only persists what the backend already told us at
// login time (see admin.service.js's login()). It never derives or
// invents authorization state — the backend remains authoritative, and
// AuthContext re-confirms that via GET /api/admin/me on load.

// Exported so AuthContext's cross-tab logout listener can filter on the
// exact same key this module writes, rather than a second hardcoded copy
// of the string that could silently drift out of sync with this one.
export const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    // Corrupted/old value — treat as "no user" rather than throwing.
    return null;
  }
}

export function setStoredSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
