import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Orders from '../Orders';

jest.mock('../../api/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

// eslint-disable-next-line import/first
import apiClient from '../../api/apiClient';

const buildOrder = (overrides = {}) => ({
  id: '507f1f77bcf86cd799439099',
  user: { id: 'user_1', name: 'Jane Doe', email: 'jane@example.com' },
  createdAt: '2026-01-15T10:00:00.000Z',
  total: 1500,
  status: 'confirmed',
  paymentStatus: 'paid',
  shipmentStatus: null,
  trackingId: null,
  ...overrides,
});

const mockListResponse = (data, meta = {}) => ({
  data: {
    data,
    meta: { page: 1, totalPages: 1, total: data.length, limit: 20, ...meta },
  },
});

const renderOrders = () =>
  render(
    <MemoryRouter>
      <Orders />
    </MemoryRouter>
  );

describe('Orders page', () => {
  beforeEach(() => {
    apiClient.get.mockReset();
  });

  it('uses the real plural /api/orders/all endpoint', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([buildOrder()]));

    renderOrders();

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/orders/all',
        expect.objectContaining({ params: expect.objectContaining({ page: 1, limit: 20 }) })
      )
    );
  });

  it('shows a loading state, then the order list', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([buildOrder()]));

    renderOrders();

    expect(screen.getByText(/loading orders/i)).toBeInTheDocument();
    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
  });

  it('renders order status, payment status, and shipment status as independent fields', async () => {
    apiClient.get.mockResolvedValue(
      mockListResponse([
        buildOrder({ status: 'shipped', paymentStatus: 'paid', shipmentStatus: 'IN_TRANSIT' }),
      ])
    );

    renderOrders();

    await screen.findByText('Jane Doe');
    // Scoped to <span> (the Badge component) so this doesn't also match
    // the identically-labelled <option> in the status filter dropdown.
    expect(screen.getByText('Shipped', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('Paid', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('In Transit', { selector: 'span' })).toBeInTheDocument();
  });

  it('shows a dash for shipment status when no shipment exists yet, never inferring one', async () => {
    apiClient.get.mockResolvedValue(
      mockListResponse([buildOrder({ status: 'pending', paymentStatus: 'cod_pending', shipmentStatus: null })])
    );

    renderOrders();

    await screen.findByText('Jane Doe');
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows an empty state when there are no orders', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([]));

    renderOrders();

    expect(await screen.findByText(/no orders found/i)).toBeInTheDocument();
  });

  it('shows an error state with a working retry', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('network down'));
    renderOrders();

    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load orders/i);

    apiClient.get.mockResolvedValueOnce(mockListResponse([buildOrder()]));
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
  });

  it('sends the debounced search term to the backend', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([buildOrder()]));
    renderOrders();
    await screen.findByText('Jane Doe');
    apiClient.get.mockClear();
    apiClient.get.mockResolvedValue(mockListResponse([buildOrder()]));

    await userEvent.type(screen.getByPlaceholderText(/search customer name, email, or order id/i), 'jane');

    await waitFor(
      () =>
        expect(apiClient.get).toHaveBeenCalledWith(
          '/api/orders/all',
          expect.objectContaining({ params: expect.objectContaining({ search: 'jane' }) })
        ),
      { timeout: 3000 }
    );
  });

  it('sends the selected order-status and payment-status filters to the backend, and resets to page 1', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([buildOrder()]));
    renderOrders();
    await screen.findByText('Jane Doe');
    apiClient.get.mockClear();
    apiClient.get.mockResolvedValue(mockListResponse([]));

    await userEvent.selectOptions(screen.getByLabelText(/filter by order status/i), 'shipped');

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/orders/all',
        expect.objectContaining({ params: expect.objectContaining({ status: 'shipped', page: 1 }) })
      )
    );

    await userEvent.selectOptions(screen.getByLabelText(/filter by payment status/i), 'paid');
    await waitFor(() =>
      expect(apiClient.get).toHaveBeenLastCalledWith(
        '/api/orders/all',
        expect.objectContaining({ params: expect.objectContaining({ paymentStatus: 'paid' }) })
      )
    );
  });

  it('sends dateFrom/dateTo when a date range is selected', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([buildOrder()]));
    renderOrders();
    await screen.findByText('Jane Doe');
    apiClient.get.mockClear();
    apiClient.get.mockResolvedValue(mockListResponse([]));

    await userEvent.type(screen.getByLabelText(/placed on or after/i), '2026-01-01');

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/orders/all',
        expect.objectContaining({ params: expect.objectContaining({ dateFrom: '2026-01-01' }) })
      )
    );
  });

  it('paginates using the backend meta, not a client-side guess', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([buildOrder()], { page: 1, totalPages: 3, total: 45 }));
    renderOrders();
    await screen.findByText('Jane Doe');

    expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();

    apiClient.get.mockResolvedValue(
      mockListResponse([buildOrder({ id: '507f1f77bcf86cd799439100', user: { id: 'user_2', name: 'Second Page Customer' } })], {
        page: 2,
        totalPages: 3,
        total: 45,
      })
    );
    await userEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenLastCalledWith(
        '/api/orders/all',
        expect.objectContaining({ params: expect.objectContaining({ page: 2 }) })
      )
    );
    expect(await screen.findByText('Second Page Customer')).toBeInTheDocument();
  });

  it('clears all filters and search when "Clear filters" is clicked', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([buildOrder()]));
    renderOrders();
    await screen.findByText('Jane Doe');

    await userEvent.selectOptions(screen.getByLabelText(/filter by order status/i), 'shipped');
    expect(await screen.findByRole('button', { name: /clear filters/i })).toBeInTheDocument();

    apiClient.get.mockClear();
    apiClient.get.mockResolvedValue(mockListResponse([buildOrder()]));
    await userEvent.click(screen.getByRole('button', { name: /clear filters/i }));

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/orders/all',
        expect.objectContaining({
          params: expect.not.objectContaining({ status: expect.anything() }),
        })
      )
    );
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
  });

  it('links each row to its order detail page', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([buildOrder({ id: '507f1f77bcf86cd799439099' })]));
    renderOrders();
    await screen.findByText('Jane Doe');

    expect(screen.getByRole('link', { name: /view/i })).toHaveAttribute(
      'href',
      '/orders/507f1f77bcf86cd799439099'
    );
  });
});
