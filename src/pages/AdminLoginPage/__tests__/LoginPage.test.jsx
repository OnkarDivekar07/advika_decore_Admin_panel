import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage, { getLoginErrorMessage } from '../LoginPage';

// LoginPage only talks to the backend through useAuth().login — mock the
// hook directly so these tests exercise LoginPage's own behavior (loading
// state, duplicate-submit guard, error rendering) independent of
// AuthContext's implementation, which has its own test suite.
const mockLogin = jest.fn();
const mockClearSessionMessage = jest.fn();
let mockAuthState;

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );

describe('getLoginErrorMessage', () => {
  it('reports a network error when there is no response at all', () => {
    expect(getLoginErrorMessage({})).toMatch(/network error/i);
  });

  it('joins express-validator field messages on a 422', () => {
    const err = {
      response: {
        status: 422,
        data: { errors: [{ field: 'password', message: 'Password is required' }] },
      },
    };
    expect(getLoginErrorMessage(err)).toBe('Password is required');
  });

  it('uses the backend message on a 401', () => {
    const err = { response: { status: 401, data: { message: 'Incorrect password' } } };
    expect(getLoginErrorMessage(err)).toBe('Incorrect password');
  });

  it('falls back to a generic invalid-credentials message on a 401 with no message', () => {
    const err = { response: { status: 401, data: {} } };
    expect(getLoginErrorMessage(err)).toMatch(/invalid email or password/i);
  });

  it('surfaces the rate-limit message on a 429', () => {
    const err = {
      response: { status: 429, data: { message: 'Too many login attempts. Please try again later.' } },
    };
    expect(getLoginErrorMessage(err)).toBe('Too many login attempts. Please try again later.');
  });
});

describe('LoginPage', () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockClearSessionMessage.mockReset();
    mockAuthState = {
      login: mockLogin,
      isAuthenticated: false,
      sessionMessage: null,
      clearSessionMessage: mockClearSessionMessage,
    };
  });

  it('shows the field validation message returned by the backend on a 422', async () => {
    mockLogin.mockRejectedValue({
      response: {
        status: 422,
        data: { errors: [{ field: 'email', message: 'Must be a valid email' }] },
      },
    });
    renderPage();

    await userEvent.type(screen.getByLabelText(/email address/i), 'not-an-email');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText('Must be a valid email')).toBeInTheDocument();
  });

  it('shows an invalid-credentials message on a 401', async () => {
    mockLogin.mockRejectedValue({
      response: { status: 401, data: { message: 'Incorrect password' } },
    });
    renderPage();

    await userEvent.type(screen.getByLabelText(/email address/i), 'admin@x.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong-pass');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText('Incorrect password')).toBeInTheDocument();
  });

  it('shows a network-error message when the request never gets a response', async () => {
    mockLogin.mockRejectedValue({});
    renderPage();

    await userEvent.type(screen.getByLabelText(/email address/i), 'admin@x.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });

  it('disables the submit button while the request is pending and calls login only once for a rapid double click', async () => {
    let resolveLogin;
    mockLogin.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      })
    );
    renderPage();

    await userEvent.type(screen.getByLabelText(/email address/i), 'admin@x.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret123');

    const button = screen.getByRole('button', { name: /login/i });
    await userEvent.click(button);

    // Button must be disabled the instant a request is in flight.
    expect(screen.getByRole('button', { name: /logging in/i })).toBeDisabled();

    // A second click while pending must not fire a second login() call.
    await userEvent.click(screen.getByRole('button', { name: /logging in/i }));
    expect(mockLogin).toHaveBeenCalledTimes(1);

    resolveLogin({ id: '1', role: 'admin' });
    await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(1));
  });

  it('surfaces an expired-session notice passed in from AuthContext', () => {
    mockAuthState.sessionMessage = 'Your session has expired. Please log in again.';
    renderPage();

    expect(
      screen.getByText('Your session has expired. Please log in again.')
    ).toBeInTheDocument();
    expect(mockClearSessionMessage).toHaveBeenCalled();
  });
});
