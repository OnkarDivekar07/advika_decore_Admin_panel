import apiClient, { setSessionInvalidatedHandler } from '../apiClient';
import { setStoredSession, getStoredToken } from '../session';

// axios exposes registered interceptors via .handlers — reaching in here
// lets us exercise apiClient's actual request/response interceptor logic
// (the real thing sent over the wire) without needing a mock HTTP layer.
const requestInterceptor = () => apiClient.interceptors.request.handlers[0];
const responseInterceptor = () => apiClient.interceptors.response.handlers[0];

describe('apiClient', () => {
  beforeEach(() => {
    localStorage.clear();
    setSessionInvalidatedHandler(null);
  });

  describe('request interceptor', () => {
    it('attaches the Authorization header when a token is stored', () => {
      setStoredSession('jwt-token', { id: '1' });

      const config = requestInterceptor().fulfilled({ headers: {} });

      expect(config.headers.Authorization).toBe('Bearer jwt-token');
    });

    it('does not attach an Authorization header when there is no token', () => {
      expect(getStoredToken()).toBeNull();

      const config = requestInterceptor().fulfilled({ headers: {} });

      expect(config.headers.Authorization).toBeUndefined();
    });
  });

  describe('response interceptor', () => {
    const makeError = (status, url = '/api/admin/stats', data = {}) => ({
      config: { url },
      response: { status, data },
    });

    it('clears the session and reports "expired" on a 401 from a non-login request', async () => {
      setStoredSession('jwt-token', { id: '1' });
      const handler = jest.fn();
      setSessionInvalidatedHandler(handler);

      await expect(
        responseInterceptor().rejected(makeError(401))
      ).rejects.toBeDefined();

      expect(getStoredToken()).toBeNull();
      expect(handler).toHaveBeenCalledWith('expired');
    });

    it('clears the session and reports "forbidden" on a 403 from a non-login request', async () => {
      setStoredSession('jwt-token', { id: '1' });
      const handler = jest.fn();
      setSessionInvalidatedHandler(handler);

      await expect(
        responseInterceptor().rejected(makeError(403))
      ).rejects.toBeDefined();

      expect(getStoredToken()).toBeNull();
      expect(handler).toHaveBeenCalledWith('forbidden');
    });

    it('leaves the session alone on a 403 when the request opted out via __skipAuthHandling', async () => {
      setStoredSession('jwt-token', { id: '1' });
      const handler = jest.fn();
      setSessionInvalidatedHandler(handler);

      await expect(
        responseInterceptor().rejected({
          config: { url: '/api/orders/order_1', __skipAuthHandling: true },
          response: { status: 403, data: {} },
        })
      ).rejects.toBeDefined();

      // A resource-scoped 403 (orderviewpage.jsx/userviewpage.jsx's own
      // "Access denied" state) must not log the admin out of an otherwise
      // perfectly valid session.
      expect(getStoredToken()).toBe('jwt-token');
      expect(handler).not.toHaveBeenCalled();
    });

    it('still clears the session on a 401 even when __skipAuthHandling is set — only 403 is scoped', async () => {
      setStoredSession('jwt-token', { id: '1' });
      const handler = jest.fn();
      setSessionInvalidatedHandler(handler);

      await expect(
        responseInterceptor().rejected({
          config: { url: '/api/orders/order_1', __skipAuthHandling: true },
          response: { status: 401, data: {} },
        })
      ).rejects.toBeDefined();

      expect(getStoredToken()).toBeNull();
      expect(handler).toHaveBeenCalledWith('expired');
    });

    it('does NOT clear session state or fire the handler for a 401 on the login request itself', async () => {
      setStoredSession('jwt-token', { id: '1' });
      const handler = jest.fn();
      setSessionInvalidatedHandler(handler);

      await expect(
        responseInterceptor().rejected(makeError(401, '/api/admin/login'))
      ).rejects.toBeDefined();

      // Wrong-credentials on login must not wipe out an unrelated existing
      // admin session in another tab, and must not fire the redirect logic.
      expect(getStoredToken()).toBe('jwt-token');
      expect(handler).not.toHaveBeenCalled();
    });

    it('leaves the session alone for statuses other than 401/403 (e.g. 429, 500)', async () => {
      setStoredSession('jwt-token', { id: '1' });
      const handler = jest.fn();
      setSessionInvalidatedHandler(handler);

      await expect(
        responseInterceptor().rejected(makeError(429))
      ).rejects.toBeDefined();

      expect(getStoredToken()).toBe('jwt-token');
      expect(handler).not.toHaveBeenCalled();
    });

    // PHASE 13 — see apiClient.js's isTokenFailure comment: authenticate.js
    // returns 400 (not 401) for both a malformed and an EXPIRED token, so
    // an admin's 1-hour session silently timing out must still be caught
    // here or they're left looking at broken screens with no redirect.
    it('treats a 400 "Invalid token." as an expired session (backend\'s authenticate.js quirk)', async () => {
      setStoredSession('jwt-token', { id: '1' });
      const handler = jest.fn();
      setSessionInvalidatedHandler(handler);

      await expect(
        responseInterceptor().rejected(makeError(400, '/api/admin/stats', { error: 'Invalid token.' }))
      ).rejects.toBeDefined();

      expect(getStoredToken()).toBeNull();
      expect(handler).toHaveBeenCalledWith('expired');
    });

    it('does not treat an unrelated 400 validation error as a session failure', async () => {
      setStoredSession('jwt-token', { id: '1' });
      const handler = jest.fn();
      setSessionInvalidatedHandler(handler);

      await expect(
        responseInterceptor().rejected(
          makeError(400, '/api/inventory/prod_1', { message: 'Unknown stock action: teleport' })
        )
      ).rejects.toBeDefined();

      expect(getStoredToken()).toBe('jwt-token');
      expect(handler).not.toHaveBeenCalled();
    });

    it('rejects without throwing when there is no handler registered', async () => {
      setStoredSession('jwt-token', { id: '1' });
      setSessionInvalidatedHandler(null);

      await expect(
        responseInterceptor().rejected(makeError(401))
      ).rejects.toBeDefined();

      expect(getStoredToken()).toBeNull();
    });

    it('passes through network errors (no response) unchanged', async () => {
      setStoredSession('jwt-token', { id: '1' });
      const handler = jest.fn();
      setSessionInvalidatedHandler(handler);

      const networkError = { config: { url: '/api/admin/stats' } }; // no `.response`

      await expect(
        responseInterceptor().rejected(networkError)
      ).rejects.toBe(networkError);

      expect(getStoredToken()).toBe('jwt-token');
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
