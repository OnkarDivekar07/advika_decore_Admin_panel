import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Inventory from '../Inventory';

jest.mock('../../api/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), patch: jest.fn() },
}));

// StockAdjustModal has its own full test suite
// (component/Adminlogin/__tests__/StockAdjustModal.test.jsx). Here it's
// stubbed so these tests can focus on what Inventory itself owns:
// fetching the low-stock list and the catalog browser, and reconciling
// both against whatever the modal reports back.
jest.mock('../../component/Adminlogin/StockAdjustModal', () => ({ product, onClose, onSuccess }) => (
  <div data-testid="stock-adjust-modal">
    <span>Adjusting {product.name}</span>
    <button type="button" onClick={() => onSuccess({ id: product.id, stock: 99 })}>
      Simulate adjust success
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
  stock: 15,
  ...overrides,
});

const productsResponse = (data, meta = {}) => ({
  data: { data, meta: { page: 1, totalPages: 1, total: data.length, ...meta } },
});

const lowStockResponse = (data, threshold = 10) => ({
  data: { data, meta: { threshold } },
});

// apiClient.get is shared between the two panels — route by URL.
const mockGetByUrl = (handlers) => {
  apiClient.get.mockImplementation((url) => {
    if (url === '/api/inventory/low-stock') return Promise.resolve(handlers.lowStock);
    if (url === '/api/products') return Promise.resolve(handlers.products);
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
};

const renderInventory = () => render(<Inventory />, { wrapper: MemoryRouter });

describe('Inventory page', () => {
  beforeEach(() => {
    apiClient.get.mockReset();
    apiClient.patch.mockReset();
  });

  it('loads and shows real low-stock products from the backend', async () => {
    mockGetByUrl({
      lowStock: lowStockResponse([{ id: 'prod_2', name: 'Brake Pad Set', brand: 'Zeno', stock: 2 }]),
      products: productsResponse([buildProduct()]),
    });

    renderInventory();

    expect(await screen.findByText('Brake Pad Set')).toBeInTheDocument();
    expect(screen.getByText('2 left')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/inventory/low-stock',
      expect.objectContaining({ params: { threshold: 10 } })
    );
  });

  it('shows an empty state when nothing is low on stock', async () => {
    mockGetByUrl({
      lowStock: lowStockResponse([]),
      products: productsResponse([buildProduct()]),
    });

    renderInventory();

    expect(await screen.findByText(/nothing is low on stock/i)).toBeInTheDocument();
  });

  it('re-queries the backend with a new threshold instead of filtering client-side', async () => {
    mockGetByUrl({
      lowStock: lowStockResponse([]),
      products: productsResponse([buildProduct()]),
    });

    renderInventory();
    await screen.findByText(/nothing is low on stock/i);
    apiClient.get.mockClear();
    mockGetByUrl({
      lowStock: lowStockResponse([{ id: 'prod_3', name: 'Fuel Filter', brand: 'Zeno', stock: 4 }], 5),
      products: productsResponse([buildProduct()]),
    });

    const thresholdInput = screen.getByLabelText(/threshold/i);
    await userEvent.clear(thresholdInput);
    await userEvent.type(thresholdInput, '5');

    await waitFor(
      () =>
        expect(apiClient.get).toHaveBeenCalledWith(
          '/api/inventory/low-stock',
          expect.objectContaining({ params: { threshold: 5 } })
        ),
      { timeout: 3000 }
    );
    expect(await screen.findByText('Fuel Filter')).toBeInTheDocument();
  });

  it('shows the full catalog with real stock — no static SKU/reorder rows', async () => {
    mockGetByUrl({
      lowStock: lowStockResponse([]),
      products: productsResponse([buildProduct({ stock: 42 })]),
    });

    renderInventory();

    expect(await screen.findByText('Heavy Duty Mud Flap')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.queryByText(/sku/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/reorder level/i)).not.toBeInTheDocument();
  });

  it('shows an error state with retry for the catalog browser', async () => {
    apiClient.get.mockImplementation((url) => {
      if (url === '/api/inventory/low-stock') return Promise.resolve(lowStockResponse([]));
      if (url === '/api/products') return Promise.reject(new Error('network down'));
      return Promise.reject(new Error('unexpected'));
    });

    renderInventory();

    expect(await screen.findByText(/failed to load inventory/i)).toBeInTheDocument();

    apiClient.get.mockImplementation((url) => {
      if (url === '/api/inventory/low-stock') return Promise.resolve(lowStockResponse([]));
      if (url === '/api/products') return Promise.resolve(productsResponse([buildProduct()]));
      return Promise.reject(new Error('unexpected'));
    });
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText('Heavy Duty Mud Flap')).toBeInTheDocument();
  });

  it('opens the adjust-stock modal from the catalog table and reconciles the row with the authoritative result', async () => {
    mockGetByUrl({
      lowStock: lowStockResponse([]),
      products: productsResponse([buildProduct({ stock: 15 })]),
    });

    renderInventory();
    await screen.findByText('Heavy Duty Mud Flap');

    await userEvent.click(screen.getByRole('button', { name: /adjust stock/i }));
    expect(screen.getByText('Adjusting Heavy Duty Mud Flap')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /simulate adjust success/i }));

    expect(await screen.findByText(/is now 99/i)).toBeInTheDocument();
    expect(screen.getByText('99')).toBeInTheDocument();
    expect(screen.queryByTestId('stock-adjust-modal')).not.toBeInTheDocument();
  });

  it('opens the adjust-stock modal from the low-stock list', async () => {
    mockGetByUrl({
      lowStock: lowStockResponse([{ id: 'prod_2', name: 'Brake Pad Set', brand: 'Zeno', stock: 2 }]),
      products: productsResponse([buildProduct()]),
    });

    renderInventory();
    await screen.findByText('Brake Pad Set');

    await userEvent.click(screen.getByRole('button', { name: /restock/i }));

    expect(screen.getByText('Adjusting Brake Pad Set')).toBeInTheDocument();
  });

  it('closing the modal without a mutation does not show a success banner', async () => {
    mockGetByUrl({
      lowStock: lowStockResponse([]),
      products: productsResponse([buildProduct()]),
    });

    renderInventory();
    await screen.findByText('Heavy Duty Mud Flap');

    await userEvent.click(screen.getByRole('button', { name: /adjust stock/i }));
    await userEvent.click(screen.getByRole('button', { name: /simulate cancel/i }));

    expect(screen.queryByTestId('stock-adjust-modal')).not.toBeInTheDocument();
    expect(screen.queryByText(/is now/i)).not.toBeInTheDocument();
  });
});
