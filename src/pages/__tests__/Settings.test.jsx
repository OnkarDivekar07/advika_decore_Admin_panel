import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Settings from '../Settings';

const mockLogout = jest.fn();
let mockUser = { id: 'admin_1', name: 'Ava Admin', email: 'ava@example.com', role: 'admin' };

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, logout: mockLogout }),
}));

jest.mock('../../api/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

// eslint-disable-next-line import/first
import apiClient from '../../api/apiClient';

describe('Settings page', () => {
  beforeEach(() => {
    apiClient.get.mockReset();
    mockLogout.mockReset();
    mockUser = { id: 'admin_1', name: 'Ava Admin', email: 'ava@example.com', role: 'admin' };
  });

  it('shows the real signed-in account — name, email, role — never an editable form', async () => {
    apiClient.get.mockResolvedValue({
      data: { status: 'ok', checks: { database: 'ok', redis: 'ok' }, timestamp: '2026-01-01T00:00:00.000Z' },
    });

    render(<Settings />);

    expect(screen.getByText('Ava Admin')).toBeInTheDocument();
    expect(screen.getByText('ava@example.com')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();

    // No text input for name/email/role — this page never lets you "edit"
    // the account, because there's no backend endpoint to save that to.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('calls logout() — the same one every other screen uses — and nothing else', async () => {
    apiClient.get.mockResolvedValue({ data: { status: 'ok', checks: {} } });
    render(<Settings />);

    await userEvent.click(screen.getByRole('button', { name: /log out/i }));

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('fetches and shows real system status from GET /health', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        status: 'ok',
        checks: { database: 'ok', redis: 'ok' },
        timestamp: '2026-01-01T00:00:00.000Z',
      },
    });

    render(<Settings />);

    expect(apiClient.get).toHaveBeenCalledWith('/health');
    expect((await screen.findAllByText('ok')).length).toBeGreaterThanOrEqual(2); // overall + database
    expect(screen.getByText('Database')).toBeInTheDocument();
    expect(screen.getByText('Redis / job queue')).toBeInTheDocument();
  });

  it('shows the degraded status exactly as the backend reports it, not a generic failure', async () => {
    apiClient.get.mockRejectedValue({
      response: { status: 503, data: { status: 'error', checks: { database: 'error', redis: 'ok' } } },
    });

    render(<Settings />);

    // Two "error" badges: overall + database — never silently hidden or
    // downgraded to a generic message when the backend actually reported
    // a real failure.
    expect((await screen.findAllByText('error')).length).toBeGreaterThanOrEqual(2);
  });

  it('shows an honest failure message when the API cannot be reached at all', async () => {
    apiClient.get.mockRejectedValue(new Error('Network Error'));

    render(<Settings />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the api/i);
  });

  it('refetches system status when Refresh is clicked', async () => {
    apiClient.get.mockResolvedValue({ data: { status: 'ok', checks: { database: 'ok' } } });
    render(<Settings />);
    await screen.findAllByText('ok');
    apiClient.get.mockClear();

    apiClient.get.mockResolvedValue({ data: { status: 'error', checks: { database: 'error' } } });
    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/health'));
    expect((await screen.findAllByText('error')).length).toBeGreaterThanOrEqual(1);
  });

  it('handles no user gracefully instead of crashing', () => {
    mockUser = null;
    apiClient.get.mockResolvedValue({ data: { status: 'ok', checks: {} } });

    render(<Settings />);

    expect(screen.getByText(/no account information available/i)).toBeInTheDocument();
  });
});
