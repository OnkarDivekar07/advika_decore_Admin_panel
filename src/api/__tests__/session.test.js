import {
  getStoredToken,
  getStoredUser,
  setStoredSession,
  clearStoredSession,
} from '../session';

describe('session storage helper', () => {
  beforeEach(() => {
    localStorage.clear();
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
    localStorage.setItem('token', 'jwt-token');
    localStorage.setItem('user', '{not-valid-json');

    expect(() => getStoredUser()).not.toThrow();
    expect(getStoredUser()).toBeNull();
  });
});
