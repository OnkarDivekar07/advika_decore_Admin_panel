import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Products from '../Products';

jest.mock('../../api/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), delete: jest.fn() },
}));

// Products renders ProductForm inline for both add and edit. Its own
// validation/upload/job-polling behavior has a full test suite
// (component/Adminlogin/__tests__/ProductForm.test.jsx) — here it's
// stubbed to a couple of buttons so these tests can focus on what
// Products itself owns: fetching, filters, pagination, and delete.
jest.mock('../../component/Adminlogin/ProductForm', () => ({ onClose, onSuccess, initialData }) => (
  <div data-testid="product-form">
    <span>{initialData ? `Editing ${initialData.name}` : 'Adding product'}</span>
    <button type="button" onClick={() => onSuccess({ id: 'new_1' })}>
      Simulate save success
    </button>
    <button type="button" onClick={onClose}>
      Simulate cancel
    </button>
  </div>
));

// eslint-disable-next-line import/first
import apiClient from '../../api/apiClient';

const buildProduct = (overrides = {}) => ({
  id: 'prod_1',
  name: 'Heavy Duty Mud Flap',
  brand: 'Advika',
  category: ['Truck'],
  price: 299.99,
  stock: 15,
  images: [],
  isNewArrival: false,
  ...overrides,
});

const mockListResponse = (data, meta = {}) => ({
  data: {
    data,
    meta: { page: 1, totalPages: 1, total: data.length, ...meta },
  },
});

const renderProducts = () => render(<Products />, { wrapper: MemoryRouter });

describe('Products page', () => {
  beforeEach(() => {
    apiClient.get.mockReset();
    apiClient.delete.mockReset();
  });

  it('shows a loading state, then the product list', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([buildProduct()]));

    renderProducts();

    expect(screen.getByText(/loading products/i)).toBeInTheDocument();
    expect(await screen.findByText('Heavy Duty Mud Flap')).toBeInTheDocument();
  });

  it('shows real backend fields: id, brand, category, price, stock, new-arrival state', async () => {
    apiClient.get.mockResolvedValue(
      mockListResponse([
        buildProduct({ id: 'prod_abc123', stock: 3, isNewArrival: true }),
      ])
    );

    renderProducts();

    await screen.findByText('Heavy Duty Mud Flap');
    expect(screen.getByText('Advika')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Truck' })).toBeInTheDocument();
    expect(screen.getByText('₹299.99')).toBeInTheDocument();
    expect(screen.getByText(/3 · Low Stock/)).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'New Arrival' })).toBeInTheDocument();
  });

  it('shows an empty state when there are no products', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([]));

    renderProducts();

    expect(await screen.findByText(/no products found/i)).toBeInTheDocument();
  });

  it('shows an error state with a working retry', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('network down'));
    renderProducts();

    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load products/i);

    apiClient.get.mockResolvedValueOnce(mockListResponse([buildProduct()]));
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText('Heavy Duty Mud Flap')).toBeInTheDocument();
  });

  it('sends the debounced search term to the backend', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([buildProduct()]));
    renderProducts();
    await screen.findByText('Heavy Duty Mud Flap');
    apiClient.get.mockClear();

    await userEvent.type(screen.getByPlaceholderText(/search by name or brand/i), 'flap');

    await waitFor(
      () =>
        expect(apiClient.get).toHaveBeenCalledWith(
          '/api/products',
          expect.objectContaining({ params: expect.objectContaining({ search: 'flap' }) })
        ),
      { timeout: 3000 }
    );
  });

  it('sends the selected category/stock/new-arrival filters to the backend', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([buildProduct()]));
    renderProducts();
    await screen.findByText('Heavy Duty Mud Flap');
    apiClient.get.mockClear();
    apiClient.get.mockResolvedValue(mockListResponse([]));

    await userEvent.selectOptions(screen.getByLabelText(/filter by category/i), 'Truck');

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/products',
        expect.objectContaining({ params: expect.objectContaining({ category: 'Truck', page: 1 }) })
      )
    );

    await userEvent.selectOptions(screen.getByLabelText(/filter by stock status/i), 'true');
    await waitFor(() =>
      expect(apiClient.get).toHaveBeenLastCalledWith(
        '/api/products',
        expect.objectContaining({ params: expect.objectContaining({ inStock: 'true' }) })
      )
    );
  });

  it('paginates using the backend meta, not a client-side guess', async () => {
    apiClient.get.mockResolvedValue(
      mockListResponse([buildProduct()], { page: 1, totalPages: 3, total: 25 })
    );
    renderProducts();
    await screen.findByText('Heavy Duty Mud Flap');

    expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();

    apiClient.get.mockResolvedValue(
      mockListResponse([buildProduct({ id: 'prod_2', name: 'Second Page Item' })], {
        page: 2,
        totalPages: 3,
        total: 25,
      })
    );
    await userEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenLastCalledWith(
        '/api/products',
        expect.objectContaining({ params: expect.objectContaining({ page: 2 }) })
      )
    );
    expect(await screen.findByText('Second Page Item')).toBeInTheDocument();
  });

  it('requires confirmation before deleting, and removes the row after a successful delete', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([buildProduct()]));
    apiClient.delete.mockResolvedValue({});
    renderProducts();
    await screen.findByText('Heavy Duty Mud Flap');

    await userEvent.click(screen.getByRole('button', { name: /^delete heavy duty mud flap$/i }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/delete this product/i)).toBeInTheDocument();
    expect(apiClient.delete).not.toHaveBeenCalled();

    apiClient.get.mockResolvedValue(mockListResponse([]));
    await userEvent.click(within(dialog).getByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith('/api/products/prod_1'));
    expect(await screen.findByText(/was deleted/i)).toBeInTheDocument();
  });

  it('keeps the confirmation dialog open and shows the error when delete fails', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([buildProduct()]));
    apiClient.delete.mockRejectedValue({ response: { data: { message: 'Cannot delete: referenced by an order' } } });
    renderProducts();
    await screen.findByText('Heavy Duty Mud Flap');

    await userEvent.click(screen.getByRole('button', { name: /^delete heavy duty mud flap$/i }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /^delete$/i }));

    expect(await screen.findByText('Cannot delete: referenced by an order')).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('cancelling the confirmation dialog does not call delete', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([buildProduct()]));
    renderProducts();
    await screen.findByText('Heavy Duty Mud Flap');

    await userEvent.click(screen.getByRole('button', { name: /^delete heavy duty mud flap$/i }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  it('opens the form for adding a new product and refetches after a successful save', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([buildProduct()]));
    renderProducts();
    await screen.findByText('Heavy Duty Mud Flap');

    await userEvent.click(screen.getByRole('button', { name: /add new product/i }));
    expect(screen.getByText('Adding product')).toBeInTheDocument();

    apiClient.get.mockClear();
    apiClient.get.mockResolvedValue(
      mockListResponse([buildProduct(), buildProduct({ id: 'prod_2', name: 'Second Item' })])
    );
    await userEvent.click(screen.getByRole('button', { name: /simulate save success/i }));

    expect(await screen.findByText(/product created/i)).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalled();
    expect(screen.queryByTestId('product-form')).not.toBeInTheDocument();
  });

  it('opens the form pre-filled for editing an existing product', async () => {
    apiClient.get.mockResolvedValue(mockListResponse([buildProduct()]));
    renderProducts();
    await screen.findByText('Heavy Duty Mud Flap');

    await userEvent.click(screen.getByRole('button', { name: /^edit heavy duty mud flap$/i }));

    expect(screen.getByText('Editing Heavy Duty Mud Flap')).toBeInTheDocument();
  });
});
