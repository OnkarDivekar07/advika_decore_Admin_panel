import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Users from '../Users';

jest.mock('../../api/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

// eslint-disable-next-line import/first
import apiClient from '../../api/apiClient';

const buildUser = (overrides = {}) => ({
  id: '507f1f77bcf86cd799439011',
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '9876543210',
  role: 'customer',
  joinedOn: '2026-01-01T00:00:00.000Z',
  addressSummary: { city: 'Pune', state: 'Maharashtra' },
  totalOrders: 3,
  totalSpent: 1500,
  lastOrderDate: '2026-02-01T00:00:00.000Z',
  ...overrides,
});

const mockListResponse = (data, meta = {}) => ({
  data: {
    data,
    meta: { page: 1, totalPages: 1, total: data.length, limit: 20, ...meta },
  },
});

const renderUsers = () =>
  render(
    <MemoryRouter>
      <Users />
    </MemoryRouter>
  );

describe('Users page', () => {
  beforeEach(() => {
    apiClient.get.mockReset();
  });

  it('reads the users array from response.data.data, not response.data', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([buildUser()]));

    renderUsers();

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
  });

  it('requests GET /api/admin/users with page/limit/sort/order params', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([buildUser()]));

    renderUsers();

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/admin/users',
        expect.objectContaining({
          params: expect.objectContaining({ page: 1, limit: 20, sort: 'createdAt', order: 'desc' }),
        })
      )
    );
  });

  it('shows a loading state, then the user list', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([buildUser()]));

    renderUsers();

    expect(screen.getByText(/loading users/i)).toBeInTheDocument();
    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
  });

  it('never renders a password, OTP, or token field even if present on the response', async () => {
    apiClient.get.mockResolvedValue(
      mockListResponse([buildUser({ password: 'hunter2-should-not-render', otp: '123456' })])
    );

    renderUsers();

    await screen.findByText('Jane Doe');
    expect(screen.queryByText('hunter2-should-not-render')).not.toBeInTheDocument();
    expect(screen.queryByText('123456')).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no users', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([]));

    renderUsers();

    expect(await screen.findByText(/no users found/i)).toBeInTheDocument();
  });

  it('shows an error state with a working retry', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('network down'));
    renderUsers();

    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load users/i);

    apiClient.get.mockResolvedValueOnce(mockListResponse([buildUser()]));
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
  });

  it('sends the debounced search term to the backend', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([buildUser()]));
    renderUsers();
    await screen.findByText('Jane Doe');
    apiClient.get.mockClear();
    apiClient.get.mockResolvedValue(mockListResponse([buildUser()]));

    await userEvent.type(screen.getByPlaceholderText(/search name, email, or phone/i), 'jane');

    await waitFor(
      () =>
        expect(apiClient.get).toHaveBeenCalledWith(
          '/api/admin/users',
          expect.objectContaining({ params: expect.objectContaining({ search: 'jane' }) })
        ),
      { timeout: 3000 }
    );
  });

  it('sends the selected role filter to the backend, and resets to page 1', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([buildUser()]));
    renderUsers();
    await screen.findByText('Jane Doe');
    apiClient.get.mockClear();
    apiClient.get.mockResolvedValue(mockListResponse([]));

    await userEvent.selectOptions(screen.getByLabelText(/filter by role/i), 'admin');

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/admin/users',
        expect.objectContaining({ params: expect.objectContaining({ role: 'admin', page: 1 }) })
      )
    );
  });

  it('paginates using the backend meta, not a client-side guess', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([buildUser()], { page: 1, totalPages: 3, total: 45 }));
    renderUsers();
    await screen.findByText('Jane Doe');

    expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();

    apiClient.get.mockResolvedValue(
      mockListResponse([buildUser({ id: '507f1f77bcf86cd799439022', name: 'Second Page Customer' })], {
        page: 2,
        totalPages: 3,
        total: 45,
      })
    );
    await userEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenLastCalledWith(
        '/api/admin/users',
        expect.objectContaining({ params: expect.objectContaining({ page: 2 }) })
      )
    );
    expect(await screen.findByText('Second Page Customer')).toBeInTheDocument();
  });

  it('clears search and role filter when "Clear filters" is clicked', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([buildUser()]));
    renderUsers();
    await screen.findByText('Jane Doe');

    await userEvent.selectOptions(screen.getByLabelText(/filter by role/i), 'admin');
    expect(await screen.findByRole('button', { name: /clear filters/i })).toBeInTheDocument();

    apiClient.get.mockClear();
    apiClient.get.mockResolvedValue(mockListResponse([buildUser()]));
    await userEvent.click(screen.getByRole('button', { name: /clear filters/i }));

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/admin/users',
        expect.objectContaining({
          params: expect.not.objectContaining({ role: expect.anything() }),
        })
      )
    );
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
  });

  it('links each row to its customer detail page', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([buildUser({ id: '507f1f77bcf86cd799439011' })]));
    renderUsers();
    await screen.findByText('Jane Doe');

    expect(screen.getByRole('link', { name: /view/i })).toHaveAttribute(
      'href',
      '/users/507f1f77bcf86cd799439011'
    );
  });
});
