import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import DashboardCards from '../DashboardOverview';

// DashboardOverview talks to the real apiClient module, so mock apiClient
// itself (not axios) — same boundary the component actually sees.
jest.mock('../../../api/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

// eslint-disable-next-line import/first
import apiClient from '../../../api/apiClient';

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <DashboardCards />
    </MemoryRouter>
  );

describe('DashboardCards', () => {
  beforeEach(() => {
    apiClient.get.mockReset();
  });

  it('shows loading skeletons while the request is in flight', () => {
    apiClient.get.mockReturnValue(new Promise(() => {})); // never resolves
    renderDashboard();

    expect(screen.getAllByRole('status', { name: /loading statistic/i }).length).toBeGreaterThan(0);
  });

  it('renders every backend stat field once loaded, with no hardcoded values', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        data: {
          totalUsers: 42,
          totalOrders: 17,
          totalProducts: 9,
          deliveredOrders: 5,
          pendingOrders: 3,
          totalRevenue: 125000,
        },
      },
    });
    renderDashboard();

    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    // Revenue is formatted as currency and explicitly labeled as backend-calculated.
    expect(screen.getByText('₹1,25,000')).toBeInTheDocument();
    expect(screen.getByText(/backend-calculated/i)).toBeInTheDocument();

    expect(apiClient.get).toHaveBeenCalledWith('/api/admin/stats');
  });

  it('renders true zero-data states as 0, not blank or hidden', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        data: {
          totalUsers: 0,
          totalOrders: 0,
          totalProducts: 0,
          deliveredOrders: 0,
          pendingOrders: 0,
          totalRevenue: 0,
        },
      },
    });
    renderDashboard();

    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    expect(await screen.findAllByText('0')).toHaveLength(5);
    expect(screen.getByText('₹0')).toBeInTheDocument();
  });

  it('shows an error state with a working retry on failure', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('network down'));
    renderDashboard();

    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load dashboard statistics/i);

    apiClient.get.mockResolvedValueOnce({
      data: {
        data: {
          totalUsers: 1,
          totalOrders: 1,
          totalProducts: 1,
          deliveredOrders: 1,
          pendingOrders: 0,
          totalRevenue: 500,
        },
      },
    });
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });

  it('provides quick links to Orders, Low Stock, Products, and Customers', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        data: {
          totalUsers: 1,
          totalOrders: 1,
          totalProducts: 1,
          deliveredOrders: 1,
          pendingOrders: 0,
          totalRevenue: 500,
        },
      },
    });
    renderDashboard();
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());

    expect(screen.getByRole('link', { name: /orders/i })).toHaveAttribute('href', '/orders');
    expect(screen.getByRole('link', { name: /low stock/i })).toHaveAttribute('href', '/inventory');
    expect(screen.getByRole('link', { name: /products/i })).toHaveAttribute('href', '/products');
    expect(screen.getByRole('link', { name: /customers/i })).toHaveAttribute('href', '/users');
  });
});
