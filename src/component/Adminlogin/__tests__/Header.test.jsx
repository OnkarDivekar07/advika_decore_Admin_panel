import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import Header from '../Header';

const mockLogout = jest.fn();
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

jest.mock('../../../api/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

// eslint-disable-next-line import/first
import apiClient from '../../../api/apiClient';

const mockAlerts = (overrides = {}) => ({
  data: {
    data: {
      lowStock: { count: 0, items: [] },
      pendingOrders: { count: 0, items: [] },
      paymentExceptions: { count: 0, items: [] },
      shipmentExceptions: { count: 0, items: [] },
      ...overrides,
    },
  },
});

const renderHeader = () =>
  render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>
  );

describe('Header notification bell', () => {
  beforeEach(() => {
    apiClient.get.mockReset();
  });

  it('fetches real alerts from the backend rather than showing a static count', async () => {
    apiClient.get.mockResolvedValue(mockAlerts());
    renderHeader();

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/api/admin/alerts'));
  });

  it('shows no badge at all when there are no alerts', async () => {
    apiClient.get.mockResolvedValue(mockAlerts());
    renderHeader();

    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    expect(screen.queryByText('5')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Operational alerts' })).toBeInTheDocument();
  });

  it('sums every section into the badge count, straight from the backend', async () => {
    apiClient.get.mockResolvedValue(
      mockAlerts({
        lowStock: { count: 2, items: [] },
        pendingOrders: { count: 3, items: [] },
        paymentExceptions: { count: 1, items: [] },
        shipmentExceptions: { count: 1, items: [] },
      })
    );
    renderHeader();

    expect(await screen.findByText('7')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /operational alerts, 7 needing attention/i })).toBeInTheDocument();
  });

  it('links the bell to the Alerts page', async () => {
    apiClient.get.mockResolvedValue(mockAlerts({ lowStock: { count: 1, items: [] } }));
    renderHeader();

    await screen.findByText('1');
    expect(screen.getByRole('link', { name: /operational alerts/i })).toHaveAttribute('href', '/alerts');
  });

  it('degrades gracefully (no badge, no crash) if the alerts request fails', async () => {
    apiClient.get.mockRejectedValue(new Error('network down'));
    renderHeader();

    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    expect(screen.getByRole('link', { name: 'Operational alerts' })).toBeInTheDocument();
  });
});
