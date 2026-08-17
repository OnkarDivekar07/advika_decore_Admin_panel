import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '../AuthContext';

// AuthContext talks to the real apiClient module, so we mock apiClient
// itself (not axios) — this exercises AuthContext's own logic (state,
// storage, navigation) against a controlled backend response, the same
// boundary the rest of the app sees.
jest.mock('../../api/apiClient', () => {
  return {
    __esModule: true,
    default: { get: jest.fn(), post: jest.fn() },
    setSessionInvalidatedHandler: jest.fn(),
  };
});

// eslint-disable-next-line import/first
import apiClient, { setSessionInvalidatedHandler } from '../../api/apiClient';

// Grabs the handler AuthProvider most recently registered with apiClient,
// rather than relying on any extra global wiring in the mock.
const getRegisteredInvalidatedHandler = () => {
  const calls = setSessionInvalidatedHandler.mock.calls;
  const lastRealHandlerCall = [...calls].reverse().find(([arg]) => typeof arg === 'function');
  return lastRealHandlerCall ? lastRealHandlerCall[0] : undefined;
};

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="isAuthenticated">{String(auth.isAuthenticated)}</div>
      <div data-testid="isChecking">{String(auth.isCheckingSession)}</div>
      <div data-testid="sessionMessage">{auth.sessionMessage || ''}</div>
      <div data-testid="userEmail">{auth.user?.email || ''}</div>
      <button onClick={() => auth.login({ email: 'a@b.com', password: 'secret123' })}>
        login
      </button>
      <button onClick={() => auth.logout()}>logout</button>
    </div>
  );
}

const renderWithProvider = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthProvider>
        <Routes>
          <Route path="*" element={<Probe />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    apiClient.get.mockReset();
    apiClient.post.mockReset();
    setSessionInvalidatedHandler.mockClear();
  });

  it('starts unauthenticated with no stored token, and skips the /me check', async () => {
    renderWithProvider();

    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('isChecking')).toHaveTextContent('false');
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('login() stores the session and flips isAuthenticated', async () => {
    apiClient.post.mockResolvedValue({
      data: {
        data: {
          token: 'jwt-token',
          user: { id: '1', name: 'Admin', email: 'a@b.com', role: 'admin' },
        },
      },
    });

    renderWithProvider();
    await userEvent.click(screen.getByText('login'));

    await waitFor(() =>
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
    );
    expect(screen.getByTestId('userEmail')).toHaveTextContent('a@b.com');
    expect(localStorage.getItem('token')).toBe('jwt-token');
  });

  it('re-verifies a stored token against GET /api/admin/me on mount', async () => {
    localStorage.setItem('token', 'stored-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: '1', name: 'Old Name', email: 'a@b.com', role: 'admin' })
    );
    apiClient.get.mockResolvedValue({
      data: { data: { id: '1', name: 'Fresh Name', email: 'a@b.com', role: 'admin' } },
    });

    renderWithProvider();

    expect(screen.getByTestId('isChecking')).toHaveTextContent('true');
    expect(apiClient.get).toHaveBeenCalledWith('/api/admin/me');

    await waitFor(() =>
      expect(screen.getByTestId('isChecking')).toHaveTextContent('false')
    );
    expect(localStorage.getItem('token')).toBe('stored-token');
  });

  it('logout() clears storage and flips isAuthenticated back to false', async () => {
    apiClient.post.mockResolvedValue({
      data: {
        data: {
          token: 'jwt-token',
          user: { id: '1', name: 'Admin', email: 'a@b.com', role: 'admin' },
        },
      },
    });
    renderWithProvider();
    await userEvent.click(screen.getByText('login'));
    await waitFor(() =>
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
    );

    await userEvent.click(screen.getByText('logout'));

    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('registers a session-invalidated handler that clears state on a 401/403 elsewhere in the app', async () => {
    localStorage.setItem('token', 'stored-token');
    localStorage.setItem('user', JSON.stringify({ id: '1', email: 'a@b.com', role: 'admin' }));
    apiClient.get.mockResolvedValue({
      data: { data: { id: '1', email: 'a@b.com', role: 'admin' } },
    });

    renderWithProvider();
    await waitFor(() => expect(setSessionInvalidatedHandler).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
    );

    const invalidatedHandler = getRegisteredInvalidatedHandler();
    expect(typeof invalidatedHandler).toBe('function');

    act(() => {
      invalidatedHandler('expired');
    });

    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('sessionMessage')).toHaveTextContent(
      'Your session has expired. Please log in again.'
    );
  });
});
