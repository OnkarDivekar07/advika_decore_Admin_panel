// src/pages/Inventory.jsx
//
// Turns inventory into an operational control panel, backed entirely by
// the admin inventory module — no static/sample rows anywhere on this
// page:
//   - GET /api/inventory/low-stock drives the actionable "needs
//     attention" list (admin-adjustable threshold, sent straight to the
//     backend rather than filtered client-side).
//   - GET /api/products (same endpoint the Products screen already uses —
//     there's no separate "inventory item" entity, stock lives directly
//     on Product) drives the full, searchable, paginated stock browser.
//   - Every stock change goes through StockAdjustModal, which reads
//     GET /api/inventory/:productId for the authoritative current value
//     and PATCHes /api/inventory/:productId for the mutation — this page
//     never computes or displays a stock number it didn't get from the
//     backend.
import React, { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import PageHeader from '../layout/PageHeader';
import Panel from '../layout/Panel';
import Button from '../layout/Button';
import LoadingState from '../layout/LoadingState';
import ErrorState from '../layout/ErrorState';
import EmptyState from '../layout/EmptyState';
import Pagination from '../layout/Pagination';
import Badge, { statusTone } from '../layout/Badge';
import useDebouncedValue from '../hooks/useDebouncedValue';
import StockAdjustModal from '../component/Adminlogin/StockAdjustModal';

const DEFAULT_THRESHOLD = 10;
const PAGE_SIZE = 20;

const stockLabel = (stock, threshold) => {
  if (stock <= 0) return 'Out of Stock';
  if (stock <= threshold) return 'Low Stock';
  return 'In Stock';
};

const Inventory = () => {
  // --- Low-stock monitoring (GET /api/inventory/low-stock) ---------------
  const [thresholdText, setThresholdText] = useState(String(DEFAULT_THRESHOLD));
  const debouncedThresholdText = useDebouncedValue(thresholdText, 400);
  const threshold =
    Number.isInteger(Number(debouncedThresholdText)) && Number(debouncedThresholdText) >= 0
      ? Number(debouncedThresholdText)
      : DEFAULT_THRESHOLD;

  const [lowStock, setLowStock] = useState([]);
  const [lowStockLoading, setLowStockLoading] = useState(true);
  const [lowStockError, setLowStockError] = useState('');

  const fetchLowStock = useCallback(async () => {
    try {
      setLowStockError('');
      setLowStockLoading(true);
      const response = await apiClient.get('/api/inventory/low-stock', {
        params: { threshold },
      });
      setLowStock(response.data.data || []);
    } catch (err) {
      console.error('Error fetching low-stock products:', err);
      setLowStockError('Failed to load low-stock products.');
    } finally {
      setLowStockLoading(false);
    }
  }, [threshold]);

  useEffect(() => {
    fetchLowStock();
  }, [fetchLowStock]);

  // --- Full catalog stock browser (GET /api/products) ---------------------
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProducts = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const params = { page, limit: PAGE_SIZE, sort: 'stock', order: 'asc' };
      if (debouncedSearch) params.search = debouncedSearch;

      const response = await apiClient.get('/api/products', { params });
      setProducts(response.data.data || []);
      setMeta({
        page: response.data.meta?.page ?? 1,
        totalPages: response.data.meta?.totalPages ?? 1,
        total: response.data.meta?.total ?? 0,
      });
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError('Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Jump back to page 1 whenever the search term actually changes (after
  // debounce settles), so a new search never lands on a now out-of-range page.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // --- Stock adjustment modal + result banner -----------------------------
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [banner, setBanner] = useState(null); // { tone: 'success' | 'error', message }

  useEffect(() => {
    if (!banner) return undefined;
    const timer = setTimeout(() => setBanner(null), 6000);
    return () => clearTimeout(timer);
  }, [banner]);

  // `updated` is the backend's authoritative response from the PATCH —
  // every list on this page is reconciled against it, never against a
  // locally-guessed value.
  const handleAdjustSuccess = (updated) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
    setLowStock((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
    setBanner({
      tone: 'success',
      message: `Stock for "${adjustTarget?.name}" is now ${updated.stock}.`,
    });
    setAdjustTarget(null);
    // The low-stock list's membership depends on where the new stock
    // level falls relative to the threshold — only the backend knows
    // whether this product should still be on it.
    fetchLowStock();
  };

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Live stock levels and corrections across the product catalog."
      />

      {banner && (
        <div
          role="status"
          className={`mb-4 rounded-md border p-3 text-sm ${
            banner.tone === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {banner.message}
        </div>
      )}

      <Panel className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Low stock alerts</h2>
            <p className="text-sm text-gray-500">
              {lowStockLoading
                ? 'Checking stock levels…'
                : `${lowStock.length} product${lowStock.length === 1 ? '' : 's'} at or below the threshold.`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="low-stock-threshold" className="text-sm text-gray-600">
              Threshold
            </label>
            <input
              id="low-stock-threshold"
              type="number"
              min="0"
              step="1"
              value={thresholdText}
              onChange={(e) => setThresholdText(e.target.value)}
              className="w-20 rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4">
          {lowStockError && (
            <ErrorState message={lowStockError} onRetry={fetchLowStock} className="mb-4" />
          )}

          {lowStockLoading ? (
            <LoadingState label="Loading low-stock products…" />
          ) : lowStock.length === 0 ? (
            <EmptyState
              icon="check-circle"
              title="Nothing is low on stock"
              description="Every product is above the current threshold."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Product
                    </th>
                    <th className="hidden px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase sm:table-cell">
                      Brand
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Stock
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lowStock.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                      <td className="hidden px-4 py-3 text-sm text-gray-500 sm:table-cell">
                        {item.brand}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge tone={item.stock <= 0 ? 'red' : 'yellow'}>{item.stock} left</Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <Button variant="primary" onClick={() => setAdjustTarget(item)}>
                          Restock
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>

      <Panel>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-gray-900">All inventory</h2>
          <div className="w-full max-w-xs">
            <label htmlFor="inventory-search" className="sr-only">
              Search inventory
            </label>
            <input
              id="inventory-search"
              type="search"
              placeholder="Search by name or brand…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>
        </div>

        {error && <ErrorState message={error} onRetry={fetchProducts} className="mb-4" />}

        {loading ? (
          <LoadingState label="Loading inventory…" />
        ) : products.length === 0 ? (
          <EmptyState
            icon="warehouse"
            title="No products found"
            description={
              search ? 'No products match that search.' : 'Products will appear here once added.'
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product Name
                    </th>
                    <th className="hidden px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:table-cell">
                      Brand
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => {
                    const label = stockLabel(product.stock ?? 0, threshold);
                    return (
                      <tr key={product.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {product.name}
                        </td>
                        <td className="hidden px-6 py-4 whitespace-nowrap text-sm text-gray-500 sm:table-cell">
                          {product.brand}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.stock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Badge tone={statusTone(label)}>{label}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <Button variant="secondary" onClick={() => setAdjustTarget(product)}>
                            Adjust Stock
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPageChange={setPage} />
          </>
        )}
      </Panel>

      {adjustTarget && (
        <StockAdjustModal
          product={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onSuccess={handleAdjustSuccess}
        />
      )}
    </>
  );
};

export default Inventory;
