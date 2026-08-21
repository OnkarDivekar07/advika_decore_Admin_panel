import { getErrorMessage, getFieldErrors, isNetworkError, isCancelError, isRetryable, isRetryableStatus } from '../apiError';

describe('apiError', () => {
  describe('isNetworkError', () => {
    it('is true for an axios error with a request but no response', () => {
      expect(isNetworkError({ request: {}, message: 'timeout' })).toBe(true);
    });

    it('is true for an axios ERR_NETWORK error', () => {
      expect(isNetworkError({ code: 'ERR_NETWORK' })).toBe(true);
    });

    it('is true for axios\'s generic "Network Error" message', () => {
      expect(isNetworkError(new Error('Network Error'))).toBe(true);
    });

    it('is false for a plain JS error with neither request nor response', () => {
      expect(isNetworkError(new Error('network down'))).toBe(false);
    });

    it('is false for a normal HTTP error response', () => {
      expect(isNetworkError({ request: {}, response: { status: 500 } })).toBe(false);
    });

    it('is false for null/undefined', () => {
      expect(isNetworkError(null)).toBe(false);
      expect(isNetworkError(undefined)).toBe(false);
    });
  });

  describe('isCancelError', () => {
    it('recognizes axios cancellation shapes', () => {
      expect(isCancelError({ code: 'ERR_CANCELED' })).toBe(true);
      expect(isCancelError({ name: 'CanceledError' })).toBe(true);
      expect(isCancelError({ message: 'canceled' })).toBe(true);
    });

    it('is false for a normal error', () => {
      expect(isCancelError(new Error('boom'))).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('returns the fallback for a falsy error', () => {
      expect(getErrorMessage(null, 'Failed to load.')).toBe('Failed to load.');
    });

    it('returns the fallback for a bare JS error with no response', () => {
      expect(getErrorMessage(new Error('network down'), 'Failed to load products.')).toBe(
        'Failed to load products.'
      );
    });

    it('returns a friendly message for a real network error', () => {
      expect(getErrorMessage({ request: {}, message: 'timeout' }, 'Failed to load.')).toBe(
        'Network error. Please check your connection and try again.'
      );
    });

    it("prefers the backend's own message", () => {
      const err = { response: { data: { message: 'Cannot delete: referenced by an order' } } };
      expect(getErrorMessage(err, 'Failed to delete.')).toBe('Cannot delete: referenced by an order');
    });

    it('joins field-validation error messages when there is no top-level message', () => {
      const err = {
        response: {
          data: {
            errors: [
              { field: 'name', message: 'Name is required' },
              { field: 'price', message: 'Price must be positive' },
            ],
          },
        },
      };
      expect(getErrorMessage(err, 'fallback')).toBe('Name is required Price must be positive');
    });

    it('falls back when errors is an empty array', () => {
      const err = { response: { data: { errors: [] } } };
      expect(getErrorMessage(err, 'fallback')).toBe('fallback');
    });

    it('returns empty string for a cancelled request', () => {
      expect(getErrorMessage({ code: 'ERR_CANCELED' }, 'fallback')).toBe('');
    });

    it('uses the default fallback when none is supplied', () => {
      expect(getErrorMessage({ response: { data: {} } })).toBe('Something went wrong. Please try again.');
    });
  });

  describe('getFieldErrors', () => {
    it('maps a field-validation array to a field->message object', () => {
      const err = {
        response: {
          data: {
            errors: [
              { field: 'name', message: 'Name is required' },
              { field: 'price', message: 'Price must be positive' },
            ],
          },
        },
      };
      expect(getFieldErrors(err)).toEqual({
        name: 'Name is required',
        price: 'Price must be positive',
      });
    });

    it('returns {} when errors is not an array (e.g. a keyed object)', () => {
      const err = { response: { data: { errors: { currentStock: 6 } } } };
      expect(getFieldErrors(err)).toEqual({});
    });

    it('returns {} when there is no error', () => {
      expect(getFieldErrors(null)).toEqual({});
      expect(getFieldErrors({})).toEqual({});
    });

    it('skips entries without a field', () => {
      const err = { response: { data: { errors: [{ message: 'no field here' }] } } };
      expect(getFieldErrors(err)).toEqual({});
    });
  });

  describe('isRetryableStatus / isRetryable', () => {
    it('treats 408, 429, and 5xx as retryable', () => {
      expect(isRetryableStatus(408)).toBe(true);
      expect(isRetryableStatus(429)).toBe(true);
      expect(isRetryableStatus(500)).toBe(true);
      expect(isRetryableStatus(503)).toBe(true);
    });

    it('does not treat 400/401/404 as retryable', () => {
      expect(isRetryableStatus(400)).toBe(false);
      expect(isRetryableStatus(401)).toBe(false);
      expect(isRetryableStatus(404)).toBe(false);
    });

    it('is retryable for a real network error regardless of status', () => {
      expect(isRetryable({ request: {}, message: 'timeout' })).toBe(true);
    });

    it('is retryable for a 500 response', () => {
      expect(isRetryable({ request: {}, response: { status: 500 } })).toBe(true);
    });

    it('is not retryable for a 400 response', () => {
      expect(isRetryable({ request: {}, response: { status: 400 } })).toBe(false);
    });

    it('is false for a falsy error', () => {
      expect(isRetryable(null)).toBe(false);
    });
  });
});
