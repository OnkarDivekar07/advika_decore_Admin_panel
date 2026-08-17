import React, { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import PageHeader from '../layout/PageHeader';
import Panel from '../layout/Panel';
import LoadingState from '../layout/LoadingState';
import ErrorState from '../layout/ErrorState';
import EmptyState from '../layout/EmptyState';
import Badge from '../layout/Badge';

// Low-stock threshold mirrors the backend's own default for
// GET /api/inventory/low-stock (see inventory.controller.js's
// `req.query.threshold ?? 10`), purely so the "low stock" badge in this
// table reflects the same rule the backend already applies — it does not
// call that endpoint directly here to keep this a single list request.
const LOW_STOCK_THRESHOLD = 10;

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchInventory = async () => {
    try {
      setError('');
      setLoading(true);
      // There is no separate "inventory item" — stock lives directly on
      // Product (see prisma schema: Product.stock). The Product model has
      // no SKU or reorder-level field at all, so the previous hardcoded
      // table's "SKU" / "Reorder Level" columns didn't correspond to any
      // real backend data. This uses the same GET /api/products endpoint
      // the Products screen uses, requesting a higher page size so the
      // inventory view isn't silently truncated to the default 10.
      const response = await apiClient.get('/api/products', {
        params: { limit: 100 },
      });
      setProducts(response.data.data || []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError('Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  return (
    <>
      <PageHeader title="Inventory" description="Stock levels across the product catalog." />

      <Panel>
        {error && <ErrorState message={error} onRetry={fetchInventory} className="mb-4" />}

        {loading ? (
          <LoadingState label="Loading inventory…" />
        ) : products.length === 0 ? (
          <EmptyState icon="warehouse" title="No products found" description="Products will appear here once added." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                  <th className="hidden px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:table-cell">Brand</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => {
                  const isLow = (product.stock ?? 0) <= LOW_STOCK_THRESHOLD;
                  return (
                    <tr key={product.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                      <td className="hidden px-6 py-4 whitespace-nowrap text-sm text-gray-500 sm:table-cell">{product.brand}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.stock}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Badge tone={isLow ? 'red' : 'green'}>{isLow ? 'Low Stock' : 'In Stock'}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
};

export default Inventory;
