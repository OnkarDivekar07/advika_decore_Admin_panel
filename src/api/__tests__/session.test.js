import {
  getStoredToken,
  getStoredUser,
  setStoredSession,
  clearStoredSession,
} from '../session';

describe('session storage helper', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('returns null when nothing is stored', () => {
    expect(getStoredToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });

  it('round-trips a token and user through setStoredSession', () => {
    const user = { id: '1', name: 'Admin', email: 'admin@x.com', role: 'admin' };
    setStoredSession('jwt-token', user);

    expect(getStoredToken()).toBe('jwt-token');
    expect(getStoredUser()).toEqual(user);
  });

  it('clears both keys on clearStoredSession', () => {
    setStoredSession('jwt-token', { id: '1' });
    clearStoredSession();

    expect(getStoredToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });

  it('treats corrupted stored user JSON as no user rather than throwing', () => {
    // token stays in localStorage (cross-tab logout depends on it — see
    // AuthContext.jsx), but user is sessionStorage-only — see session.js's
    // own comment on why it moved there.
    localStorage.setItem('token', 'jwt-token');
    sessionStorage.setItem('user', '{not-valid-json');

    expect(() => getStoredUser()).not.toThrow();
    expect(getStoredUser()).toBeNull();
  });

  it('stores the token in localStorage and the user in sessionStorage', () => {
    const user = { id: '1', name: 'Admin', email: 'admin@x.com', role: 'admin' };
    setStoredSession('jwt-token', user);

    expect(localStorage.getItem('token')).toBe('jwt-token');
    expect(localStorage.getItem('user')).toBeNull();
    expect(JSON.parse(sessionStorage.getItem('user'))).toEqual(user);
  });
});
