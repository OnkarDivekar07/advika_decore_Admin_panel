import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Alerts from '../Alerts';

jest.mock('../../api/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

// eslint-disable-next-line import/first
import apiClient from '../../api/apiClient';

const buildAlerts = (overrides = {}) => ({
  lowStock: { threshold: 10, count: 0, items: [] },
  pendingOrders: { count: 0, items: [] },
  paymentExceptions: { count: 0, items: [] },
  shipmentExceptions: { count: 0, items: [] },
  fulfillmentExceptions: { count: 0, items: [] },
  generatedAt: '2026-08-19T00:00:00.000Z',
  ...overrides,
});

const mockResponse = (data) => ({ data: { data } });

const renderAlerts = () =>
  render(
    <MemoryRouter>
      <Alerts />
    </MemoryRouter>
  );

describe('Alerts page', () => {
  beforeEach(() => {
    apiClient.get.mockReset();
  });

  it('fetches from the real backend endpoint, not a hardcoded feed', async () => {
    apiClient.get.mockResolvedValue(mockResponse(buildAlerts()));

    renderAlerts();

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/admin/alerts',
        expect.objectContaining({ params: { lowStockThreshold: 10 } })
      )
    );
  });

  it('shows a loading state, then the fetched alerts', async () => {
    apiClient.get.mockResolvedValue(mockResponse(buildAlerts()));

    renderAlerts();

    expect(screen.getByText(/loading operational alerts/i)).toBeInTheDocument();
    expect(await screen.findByText('Low stock')).toBeInTheDocument();
  });

  it('renders real low-stock items from the backend, with a link to Inventory', async () => {
    apiClient.get.mockResolvedValue(
      mockResponse(
        buildAlerts({
          lowStock: {
            threshold: 10,
            count: 1,
            items: [{ id: 'p1', name: 'Wall Clock', brand: 'Advika', stock: 2 }],
          },
        })
      )
    );

    renderAlerts();

    expect(await screen.findByText('Wall Clock')).toBeInTheDocument();
    expect(screen.getByText('2 left')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /restock/i })).toHaveAttribute('href', '/inventory');
  });

  it('renders real pending orders with a link to that order', async () => {
    apiClient.get.mockResolvedValue(
      mockResponse(
        buildAlerts({
          pendingOrders: {
            count: 1,
            items: [
              {
                id: '507f1f77bcf86cd799439099',
                total: 1200,
                createdAt: '2026-08-01T00:00:00.000Z',
                user: { name: 'Jane Doe', email: 'jane@x.com' },
              },
            ],
          },
        })
      )
    );

    renderAlerts();

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('₹1200.00')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view/i })).toHaveAttribute(
      'href',
      '/orders/507f1f77bcf86cd799439099'
    );
  });

  it('renders real payment exceptions with the backend-reported paymentStatus', async () => {
    apiClient.get.mockResolvedValue(
      mockResponse(
        buildAlerts({
          paymentExceptions: {
            count: 1,
            items: [
              {
                id: '507f1f77bcf86cd799439100',
                total: 500,
                paymentStatus: 'failed',
                createdAt: '2026-08-01T00:00:00.000Z',
                user: { name: 'Sam Ray', email: 'sam@x.com' },
              },
            ],
          },
        })
      )
    );

    renderAlerts();

    expect(await screen.findByText('Sam Ray')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
  });

  it('renders real shipment exceptions with the backend-reported status', async () => {
    apiClient.get.mockResolvedValue(
      mockResponse(
        buildAlerts({
          shipmentExceptions: {
            count: 1,
            items: [
              {
                orderId: '507f1f77bcf86cd799439101',
                trackingId: 'TRK123',
                status: 'DELIVERY_FAILED',
                courierPartner: 'Delhivery',
                lastLocation: 'Pune Hub',
                updatedAt: '2026-08-01T00:00:00.000Z',
                total: 800,
                user: { name: 'Priya S', email: 'priya@x.com' },
              },
            ],
          },
        })
      )
    );

    renderAlerts();

    expect(await screen.findByText('Priya S')).toBeInTheDocument();
    expect(screen.getByText('DELIVERY_FAILED')).toBeInTheDocument();
    expect(screen.getByText(/Delhivery · TRK123/)).toBeInTheDocument();
  });

  it('renders real fulfillment exceptions, badging an oversold order and showing the raw reason otherwise', async () => {
    apiClient.get.mockResolvedValue(
      mockResponse(
        buildAlerts({
          fulfillmentExceptions: {
            count: 2,
            items: [
              {
                id: '507f1f77bcf86cd799439102',
                total: 650,
                fulfillmentError: 'Paid but oversold — insufficient stock for one or more items in this order.',
                fulfillmentAttempts: 5,
                oversold: true,
                updatedAt: '2026-08-01T00:00:00.000Z',
                user: { name: 'Ravi Kumar', email: 'ravi@x.com' },
              },
              {
                id: '507f1f77bcf86cd799439103',
                total: 300,
                fulfillmentError: 'Redis unavailable',
                fulfillmentAttempts: 1,
                oversold: false,
                updatedAt: '2026-08-01T00:00:00.000Z',
                user: { name: 'Neha Patil', email: 'neha@x.com' },
              },
            ],
          },
        })
      )
    );

    renderAlerts();

    expect(await screen.findByText('Ravi Kumar')).toBeInTheDocument();
    expect(screen.getByText('Oversold')).toBeInTheDocument();
    expect(screen.getByText('Neha Patil')).toBeInTheDocument();
    expect(screen.getByText('Redis unavailable')).toBeInTheDocument();
  });

  it('shows an empty state for a section with no items, instead of fake rows', async () => {
    apiClient.get.mockResolvedValue(mockResponse(buildAlerts()));

    renderAlerts();

    expect(await screen.findByText('Nothing is low on stock')).toBeInTheDocument();
    expect(screen.getByText('No orders awaiting confirmation')).toBeInTheDocument();
    expect(screen.getByText('No payment exceptions')).toBeInTheDocument();
    expect(screen.getByText('No shipment exceptions')).toBeInTheDocument();
    expect(screen.getByText('No fulfillment exceptions')).toBeInTheDocument();
  });

  it('shows an error state with a working retry', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('network down'));
    renderAlerts();

    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load operational alerts/i);

    apiClient.get.mockResolvedValueOnce(mockResponse(buildAlerts()));
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText('Nothing is low on stock')).toBeInTheDocument();
  });

  it('re-fetches with the debounced threshold when it changes', async () => {
    apiClient.get.mockResolvedValue(mockResponse(buildAlerts()));
    renderAlerts();
    await screen.findByText('Low stock');
    apiClient.get.mockClear();
    apiClient.get.mockResolvedValue(mockResponse(buildAlerts({ lowStock: { threshold: 5, count: 0, items: [] } })));

    const input = screen.getByLabelText(/threshold/i);
    await userEvent.clear(input);
    await userEvent.type(input, '5');

    await waitFor(
      () =>
        expect(apiClient.get).toHaveBeenCalledWith(
          '/api/admin/alerts',
          expect.objectContaining({ params: { lowStockThreshold: 5 } })
        ),
      { timeout: 3000 }
    );
  });

  it('manually refetches when Refresh is clicked', async () => {
    apiClient.get.mockResolvedValue(mockResponse(buildAlerts()));
    renderAlerts();
    await screen.findByText('Low stock');
    apiClient.get.mockClear();
    apiClient.get.mockResolvedValue(mockResponse(buildAlerts()));

    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/api/admin/alerts', expect.anything()));
  });
});
