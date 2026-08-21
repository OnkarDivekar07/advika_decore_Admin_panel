import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AnalyticsOverview from '../AnalyticsOverview';

jest.mock('../../../api/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

// eslint-disable-next-line import/first
import apiClient from '../../../api/apiClient';

const overviewResponse = (overrides = {}) => ({
  data: {
    data: {
      range: { from: null, to: null },
      grossRevenue: 128450.5,
      paidOrderCount: 64,
      averageOrderValue: 2007.04,
      orderCount: 71,
      deliveredOrders: 58,
      pendingOrders: 4,
      newCustomers: 22,
      totalActiveProducts: 96,
      definitions: {
        grossRevenue: 'Sum of Order.total for paid orders in range. Gross revenue, not profit.',
        paidOrderCount: 'Count of paid orders in range.',
        averageOrderValue: 'grossRevenue / paidOrderCount.',
        orderCount: 'Count of all non-draft orders in range.',
        deliveredOrders: 'Count of delivered orders in range.',
        pendingOrders: 'Count of pending orders in range.',
        newCustomers: 'Count of new customers in range.',
        totalActiveProducts: 'Live catalog snapshot, not range-scoped.',
      },
      ...overrides,
    },
  },
});

const trendResponse = (buckets = []) => ({
  data: {
    data: {
      range: { from: '2026-07-19T00:00:00.000Z', to: '2026-08-18T23:59:59.999Z' },
      granularity: 'day',
      buckets,
      definitions: {
        revenue: 'Sum of Order.total for paid orders in this bucket.',
        orderCount: 'Count of paid orders in this bucket.',
      },
    },
  },
});

const renderComponent = () =>
  render(
    <MemoryRouter>
      <AnalyticsOverview />
    </MemoryRouter>
  );

describe('AnalyticsOverview', () => {
  beforeEach(() => {
    apiClient.get.mockReset();
  });

  it('fetches both overview and revenue-trend on mount', async () => {
    apiClient.get.mockImplementation((url) => {
      if (url.includes('revenue-trend')) return Promise.resolve(trendResponse());
      return Promise.resolve(overviewResponse());
    });

    renderComponent();

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));
    expect(apiClient.get).toHaveBeenCalledWith('/api/admin/analytics/overview', { params: {} });
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/admin/analytics/revenue-trend',
      { params: { granularity: 'day' } }
    );
  });

  it('renders every KPI straight from the backend response, clearly labeling revenue as gross', async () => {
    apiClient.get.mockImplementation((url) => {
      if (url.includes('revenue-trend')) return Promise.resolve(trendResponse());
      return Promise.resolve(overviewResponse());
    });

    renderComponent();

    expect(await screen.findByText('₹1,28,450.5')).toBeInTheDocument();
    expect(screen.getByText(/gross, not profit/i)).toBeInTheDocument();
    expect(screen.getByText('64')).toBeInTheDocument(); // paidOrderCount
    expect(screen.getByText('71')).toBeInTheDocument(); // orderCount
    expect(screen.getByText('58')).toBeInTheDocument(); // deliveredOrders
    expect(screen.getByText('4')).toBeInTheDocument(); // pendingOrders
    expect(screen.getByText('22')).toBeInTheDocument(); // newCustomers
    expect(screen.getByText('96')).toBeInTheDocument(); // totalActiveProducts
  });

  it('never renders a profit, margin, or inventory-valuation figure', async () => {
    apiClient.get.mockImplementation((url) => {
      if (url.includes('revenue-trend')) return Promise.resolve(trendResponse());
      return Promise.resolve(overviewResponse());
    });

    renderComponent();
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));

    expect(screen.queryByText(/profit/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/margin/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/inventory valuation/i)).not.toBeInTheDocument();
  });

  it('re-fetches with dateFrom/dateTo when the date filter changes', async () => {
    apiClient.get.mockImplementation((url) => {
      if (url.includes('revenue-trend')) return Promise.resolve(trendResponse());
      return Promise.resolve(overviewResponse());
    });

    renderComponent();
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));

    await userEvent.type(screen.getByLabelText(/from date/i), '2026-01-01');

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith('/api/admin/analytics/overview', {
        params: { dateFrom: '2026-01-01' },
      })
    );
  });

  it('re-fetches with the new granularity when the chart interval changes', async () => {
    apiClient.get.mockImplementation((url) => {
      if (url.includes('revenue-trend')) return Promise.resolve(trendResponse());
      return Promise.resolve(overviewResponse());
    });

    renderComponent();
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));

    await userEvent.selectOptions(screen.getByLabelText(/chart granularity/i), 'month');

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith('/api/admin/analytics/revenue-trend', {
        params: { granularity: 'month' },
      })
    );
  });

  it('shows an error state with a working retry on failure', async () => {
    apiClient.get.mockRejectedValue({ response: { data: { message: 'Network error' } } });

    renderComponent();

    expect(await screen.findByRole('alert')).toHaveTextContent(/network error/i);

    apiClient.get.mockImplementation((url) => {
      if (url.includes('revenue-trend')) return Promise.resolve(trendResponse());
      return Promise.resolve(overviewResponse());
    });

    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('renders the chart empty state when the trend has no buckets, never a fabricated chart', async () => {
    apiClient.get.mockImplementation((url) => {
      if (url.includes('revenue-trend')) return Promise.resolve(trendResponse([]));
      return Promise.resolve(overviewResponse());
    });

    renderComponent();

    expect(await screen.findByText(/no paid orders in this range yet/i)).toBeInTheDocument();
  });
});
