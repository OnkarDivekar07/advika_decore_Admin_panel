// src/pages/Inventory.jsx
//
// Turns inventory into an operational control panel, backed entirely by
// the admin inventory module — no static/sample rows anywhere on this
// page:
//   - GET /api/inventory/low-stock drives the actionable "needs
//     attention" list (admin-adjustable threshold, sent straight to the
//     backend rather than filtered client-side). This list is
//     deliberately NOT run through the shared DataTable/useAdminListQuery
//     machinery below — it isn't paginated or user-sortable, it's a
//     small "needs attention right now" panel, and the backend already
//     caps how many rows it can return (see inventory.service.js's
//     listLowStockProducts, PHASE 12).
//   - GET /api/products (same endpoint the Products screen already uses —
//     there's no separate "inventory item" entity, stock lives directly
//     on Product) drives the full, searchable, paginated stock browser,
//     and — PHASE 12 — now runs on the same shared data-interaction layer
//     as Products/Orders/Users: debounced search that correctly resets to
//     page 1, filters/page persisted in the URL, and race-safe requests
//     (an older, slower response can never overwrite a newer one).
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
import Badge, { statusTone } from '../layout/Badge';
import DataTable from '../layout/DataTable';
import useDebouncedValue from '../hooks/useDebouncedValue';
import useAdminListQuery from '../hooks/useAdminListQuery';
import StockAdjustModal from '../component/Adminlogin/StockAdjustModal';

const DEFAULT_THRESHOLD = 10;
const PAGE_SIZE = 20;

const stockLabel = (stock, threshold) => {
  if (stock <= 0) return 'Out of Stock';
  if (stock <= threshold) return 'Low Stock';
  return 'In Stock';
};

const DEFAULT_FILTERS = { search: '' };

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
  // Sort is deliberately fixed (stock ascending — lowest stock first,
  // the most operationally relevant order for this screen) rather than
  // user-controllable, so there's no separate sort UI here.
  const fetchInventoryProducts = useCallback(
    (params, signal) =>
      apiClient
        .get('/api/products', { params, signal })
        .then((response) => ({ data: response.data.data, meta: response.data.meta })),
    []
  );

  const {
    data: products,
    meta,
    loading,
    refreshing,
    error,
    isStale,
    filters,
    setFilter,
    setPage,
    hasActiveFilters,
    refetch: refetchProducts,
    mutateData: setProducts,
  } = useAdminListQuery({
    fetcher: fetchInventoryProducts,
    defaultFilters: DEFAULT_FILTERS,
    defaultSort: { sort: 'stock', order: 'asc' },
    pageSize: PAGE_SIZE,
    errorMessage: 'Failed to load inventory.',
  });

  // --- Stock adjustment modal + result banner -----------------------------
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [banner, setBanner] = useState(null); // { tone: 'success' | 'error', message }

  useEffect(() => {
    if (!banner) return undefined;
    const timer = setTimeout(() => setBanner(null), 6000);
    return () => clearTimeout(timer);
  }, [banner]);

  // `updated` is the backend's authoritative response from the PATCH —
  // both lists on this page are reconciled against it, never against a
  // locally-guessed value. The catalog browser's row is patched in place
  // via mutateData (its position on the current page doesn't change, and
  // the value being written in is exactly what the backend just
  // returned); the low-stock panel is re-fetched outright since whether
  // this product still belongs on it depends on the threshold, which
  // only the backend can evaluate correctly.
  const handleAdjustSuccess = (updated) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
    setLowStock((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
    setBanner({
      tone: "success",
      message: `Stock for "${adjustTarget?.name}" is now ${updated.stock}.`,
    });
    setAdjustTarget(null);
    fetchLowStock();
  };

  const inventoryColumns = [
    {
      key: 'name',
      header: 'Product Name',
      mobileHidden: true, // already the mobile card title
      cellClassName: 'font-medium text-gray-900',
      accessor: (product) => product.name,
    },
    {
      key: 'brand',
      header: 'Brand',
      accessor: (product) => product.brand,
    },
    {
      key: 'stock',
      header: 'Stock',
      accessor: (product) => product.stock,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (product) => {
        const label = stockLabel(product.stock ?? 0, threshold);
        return <Badge tone={statusTone(label)}>{label}</Badge>;
      },
    },
  ];

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
              data-testid="inventory-threshold-input"
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
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Product
                    </th>
                    <th scope="col" className="hidden px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase sm:table-cell">
                      Brand
                    </th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Stock
                    </th>
                    <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
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
                        <Button
                          variant="primary"
                          onClick={() => setAdjustTarget(item)}
                          aria-label={`Restock ${item.name}`}
                          data-testid={`inventory-restock-btn-${item.id}`}
                        >
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
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              data-testid="inventory-search-input"
            />
          </div>
        </div>

        <DataTable
          columns={inventoryColumns}
          rows={products}
          getRowKey={(product) => product.id}
          caption="Inventory"
          loading={loading}
          loadingLabel="Loading inventory…"
          error={error}
          onRetry={refetchProducts}
          refreshing={refreshing}
          isStale={isStale}
          empty={{
            icon: 'warehouse',
            title: 'No products found',
            description: hasActiveFilters
              ? 'No products match that search.'
              : 'Products will appear here once added.',
          }}
          meta={meta}
          onPageChange={setPage}
          mobileCardTitle={(product) => product.name}
          mobileCardSubtitle={(product) => product.brand}
          renderRowActions={(product) => (
            <Button
              variant="secondary"
              onClick={() => setAdjustTarget(product)}
              aria-label={`Adjust stock for ${product.name}`}
              data-testid={`inventory-adjust-btn-${product.id}`}
            >
              Adjust Stock
            </Button>
          )}
        />
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
