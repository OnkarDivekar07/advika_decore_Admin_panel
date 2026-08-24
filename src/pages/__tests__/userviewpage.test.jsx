import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import UserViewPage from '../userviewpage';

jest.mock('../../api/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

// eslint-disable-next-line import/first
import apiClient from '../../api/apiClient';

const USER_ID = '507f1f77bcf86cd799439011';

const buildUserDetail = (overrides = {}) => ({
  id: USER_ID,
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '9876543210',
  role: 'customer',
  joinedOn: '2026-01-01T00:00:00.000Z',
  addresses: [
    {
      id: 'addr_1',
      name: 'Jane Doe',
      phone: '9876543210',
      houseArea: '221B Baker Street',
      area: 'Sector 5',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      isDefault: true,
    },
  ],
  recentOrders: [
    {
      id: 'order_1',
      status: 'delivered',
      paymentStatus: 'paid',
      total: 999.5,
      createdAt: '2026-02-01T10:00:00.000Z',
    },
  ],
  orderSummary: { totalOrders: 1, totalSpent: 999.5 },
  ...overrides,
});

const okResponse = (data) => ({ data: { data } });

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={[`/users/${USER_ID}`]}>
      <Routes>
        <Route path="/users/:id" element={<UserViewPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('UserViewPage', () => {
  beforeEach(() => {
    apiClient.get.mockReset();
  });

  it('fetches GET /api/admin/users/:id', async () => {
    apiClient.get.mockResolvedValue(okResponse(buildUserDetail()));

    renderPage();

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(`/api/admin/users/${USER_ID}`, {
        __skipAuthHandling: true,
      })
    );
  });

  it('shows a loading state, then the customer profile', async () => {
    apiClient.get.mockResolvedValue(okResponse(buildUserDetail()));

    renderPage();

    expect(screen.getAllByText(/loading customer/i).length).toBeGreaterThan(0);
    await screen.findAllByText('jane@example.com');
  });

  it('never renders a password, OTP, or token field even if present on the response', async () => {
    apiClient.get.mockResolvedValue(
      okResponse(buildUserDetail({ password: 'hunter2-should-not-render' }))
    );

    renderPage();

    await screen.findAllByText('jane@example.com');
    expect(screen.queryByText('hunter2-should-not-render')).not.toBeInTheDocument();
  });

  it('shows the order summary from the full-history aggregate, not just recentOrders.length', async () => {
    apiClient.get.mockResolvedValue(
      okResponse(
        buildUserDetail({
          recentOrders: [{ id: 'o1', status: 'delivered', paymentStatus: 'paid', total: 10, createdAt: '2026-01-01' }],
          orderSummary: { totalOrders: 42, totalSpent: 99999 },
        })
      )
    );

    renderPage();

    await screen.findAllByText('jane@example.com');
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText(/showing 1 most recent of 42/i)).toBeInTheDocument();
  });

  it('shows all saved addresses with the default one flagged', async () => {
    apiClient.get.mockResolvedValue(okResponse(buildUserDetail()));

    renderPage();

    await screen.findAllByText('jane@example.com');
    expect(screen.getByText(/221B Baker Street/)).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('shows a not-found state for a 404', async () => {
    apiClient.get.mockRejectedValue({ response: { status: 404 } });

    renderPage();

    expect(await screen.findByText(/customer not found/i)).toBeInTheDocument();
  });

  it('shows a not-found state for a 422 malformed id, same as a 404', async () => {
    apiClient.get.mockRejectedValue({ response: { status: 422 } });

    renderPage();

    expect(await screen.findByText(/customer not found/i)).toBeInTheDocument();
  });

  it('shows a generic error state with retry for other failures', async () => {
    apiClient.get.mockRejectedValue({ response: { status: 500, data: { message: 'boom' } } });

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('boom');
  });
});
