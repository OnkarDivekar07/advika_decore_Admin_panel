import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewArrivalsManagement from '../NewArrivalsManagement';

jest.mock('../../../api/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), patch: jest.fn() },
}));

// eslint-disable-next-line import/first
import apiClient from '../../../api/apiClient';

const buildProduct = (overrides = {}) => ({
  id: 'p1',
  name: 'Heavy Duty Mud Flap',
  images: ['https://cdn.example.com/mudflap.jpg'],
  ...overrides,
});

const listResponse = (data) => ({ data: { data, meta: { total: data.length } } });

describe('NewArrivalsManagement', () => {
  beforeEach(() => {
    apiClient.get.mockReset();
    apiClient.patch.mockReset();
  });

  it('uses the real GET /api/homepage/new-arrivals endpoint and shows the live list', async () => {
    apiClient.get.mockResolvedValue(listResponse([buildProduct()]));

    render(<NewArrivalsManagement />);

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/api/homepage/new-arrivals'));
    expect(await screen.findByText('Heavy Duty Mud Flap')).toBeInTheDocument();
  });

  it('shows a loading state, then an empty state with no new arrivals', async () => {
    apiClient.get.mockResolvedValue(listResponse([]));

    render(<NewArrivalsManagement />);

    expect(screen.getByText(/loading new arrivals/i)).toBeInTheDocument();
    expect(await screen.findByText(/no new arrivals marked/i)).toBeInTheDocument();
  });

  it('shows an error state with a working retry', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('network down'));
    render(<NewArrivalsManagement />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load new arrivals/i);

    apiClient.get.mockResolvedValueOnce(listResponse([buildProduct()]));
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText('Heavy Duty Mud Flap')).toBeInTheDocument();
  });

  it('shows a fallback instead of a dead <img> for a product with no image', async () => {
    apiClient.get.mockResolvedValue(listResponse([buildProduct({ images: [] })]));

    render(<NewArrivalsManagement />);

    expect(await screen.findByLabelText(/image unavailable/i)).toBeInTheDocument();
  });

  it('shows a fallback when the product image fails to load', async () => {
    apiClient.get.mockResolvedValue(listResponse([buildProduct()]));
    render(<NewArrivalsManagement />);

    const img = await screen.findByAltText('Heavy Duty Mud Flap');
    img.dispatchEvent(new Event('error'));

    expect(await screen.findByLabelText(/image unavailable/i)).toBeInTheDocument();
  });

  it('asks for confirmation before removing, and calls PATCH only after confirming', async () => {
    apiClient.get.mockResolvedValue(listResponse([buildProduct()]));
    render(<NewArrivalsManagement />);
    await screen.findByText('Heavy Duty Mud Flap');

    await userEvent.click(screen.getByRole('button', { name: /remove/i }));
    const dialog = await screen.findByRole('alertdialog');
    expect(apiClient.patch).not.toHaveBeenCalled();

    apiClient.patch.mockResolvedValue({ data: { data: { id: 'p1', isNewArrival: false } } });
    await userEvent.click(within(dialog).getByRole('button', { name: /^remove$/i }));

    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/api/homepage/new-arrivals/p1'));
    await waitFor(() => expect(screen.queryByText('Heavy Duty Mud Flap')).not.toBeInTheDocument());
  });

  it('shows a recoverable error in the dialog on a failed removal, without removing the item', async () => {
    apiClient.get.mockResolvedValue(listResponse([buildProduct()]));
    render(<NewArrivalsManagement />);
    await screen.findByText('Heavy Duty Mud Flap');

    await userEvent.click(screen.getByRole('button', { name: /remove/i }));
    const dialog = await screen.findByRole('alertdialog');

    apiClient.patch.mockRejectedValue({ response: { data: { message: 'Could not remove item' } } });
    await userEvent.click(within(dialog).getByRole('button', { name: /^remove$/i }));

    expect(await screen.findByText('Could not remove item')).toBeInTheDocument();
    expect(screen.getByText('Heavy Duty Mud Flap')).toBeInTheDocument();
  });
});
