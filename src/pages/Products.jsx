// src/pages/Products.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient";
import ProductForm from "../component/Adminlogin/ProductForm";
import PageHeader from "../layout/PageHeader";
import Panel from "../layout/Panel";
import Button from "../layout/Button";
import LoadingState from "../layout/LoadingState";
import ErrorState from "../layout/ErrorState";
import EmptyState from "../layout/EmptyState";
import ConfirmDialog from "../layout/ConfirmDialog";
import Pagination from "../layout/Pagination";
import Badge, { statusTone } from "../layout/Badge";
import useDebouncedValue from "../hooks/useDebouncedValue";

const categoryOptions = ["Truck", "Tempo", "Pickup", "Car", "Two Wheeler", "Tractor"];

// Mirrors Inventory.jsx's own LOW_STOCK_THRESHOLD, which itself mirrors
// the backend's GET /api/inventory/low-stock default (see
// inventory.controller.js's `req.query.threshold ?? 10`) — kept as a
// display-only convention here (badge coloring), never sent to the
// backend or used to gate any action.
const LOW_STOCK_THRESHOLD = 10;

const stockLabel = (stock) => {
  if (stock <= 0) return "Out of Stock";
  if (stock <= LOW_STOCK_THRESHOLD) return "Low Stock";
  return "In Stock";
};

const DEFAULT_FILTERS = {
  search: "",
  category: "",
  brand: "",
  inStock: "",
  isNewArrival: "",
  sort: "createdAt",
  order: "desc",
};

const PAGE_SIZE = 10;

const Products = () => {
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(filters.search, 400);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [banner, setBanner] = useState(null); // { tone: 'success' | 'error', message }

  // Whenever a filter (other than the raw search text, which is
  // debounced separately) changes, jump back to page 1 — otherwise the
  // admin can land on a now out-of-range page for the new filter set.
  const resetToFirstPage = (updater) => {
    setPage(1);
    setFilters(updater);
  };

  const fetchProducts = useCallback(async () => {
    try {
      setError("");
      setLoading(true);

      const params = { page, limit: PAGE_SIZE, sort: filters.sort, order: filters.order };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filters.category) params.category = filters.category;
      if (filters.brand) params.brand = filters.brand;
      if (filters.inStock) params.inStock = filters.inStock;
      if (filters.isNewArrival) params.isNewArrival = filters.isNewArrival;

      const response = await apiClient.get(`/api/products`, { params });
      setProducts(response.data.data || []);
      setMeta({
        page: response.data.meta?.page ?? 1,
        totalPages: response.data.meta?.totalPages ?? 1,
        total: response.data.meta?.total ?? 0,
      });
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, [page, filters.sort, filters.order, filters.category, filters.brand, filters.inStock, filters.isNewArrival, debouncedSearch]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Auto-dismiss the success/error banner after mutations so it doesn't
  // linger indefinitely.
  useEffect(() => {
    if (!banner) return undefined;
    const timer = setTimeout(() => setBanner(null), 6000);
    return () => clearTimeout(timer);
  }, [banner]);

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await apiClient.delete(`/api/products/${deleteTarget.id}`);
      setDeleteTarget(null);
      setBanner({ tone: "success", message: `"${deleteTarget.name}" was deleted.` });
      // Re-fetch from the backend (source of truth) rather than just
      // splicing the local array — the current page may now be short a
      // row (or, on the last page, empty entirely), and only the backend
      // knows the correct replacement/next page of data.
      if (products.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchProducts();
      }
    } catch (err) {
      console.error("Error deleting product:", err);
      setDeleteError(err.response?.data?.message || "Failed to delete product.");
    } finally {
      setDeleting(false);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    const wasEditing = Boolean(editingProduct);
    setEditingProduct(null);
    setBanner({
      tone: "success",
      message: wasEditing ? "Product updated." : "Product created.",
    });
    fetchProducts();
  };

  const activeFilterCount = useMemo(
    () => [filters.category, filters.brand, filters.inStock, filters.isNewArrival].filter(Boolean).length,
    [filters.category, filters.brand, filters.inStock, filters.isNewArrival]
  );

  return (
    <>
      <PageHeader
        title="Products"
        description="Manage the product catalog — pricing, stock, and images."
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setEditingProduct(null);
              setShowForm(true);
            }}
          >
            <i className="fas fa-plus" aria-hidden="true"></i>
            Add New Product
          </Button>
        }
      />

      {banner && (
        <div
          role="status"
          className={`mb-4 rounded-md border p-3 text-sm ${
            banner.tone === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {banner.message}
        </div>
      )}

      {showForm && (
        <div className="mb-6">
          <ProductForm
            initialData={editingProduct}
            onClose={() => {
              setShowForm(false);
              setEditingProduct(null);
            }}
            onSuccess={handleFormSuccess}
          />
        </div>
      )}

      <Panel className="mb-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <label htmlFor="product-search" className="sr-only">
              Search products
            </label>
            <input
              id="product-search"
              type="search"
              placeholder="Search by name or brand…"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>

          <select
            aria-label="Filter by category"
            value={filters.category}
            onChange={(e) => resetToFirstPage((prev) => ({ ...prev, category: e.target.value }))}
            className="rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <option value="">All categories</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <input
            aria-label="Filter by brand"
            type="text"
            placeholder="Brand"
            value={filters.brand}
            onChange={(e) => resetToFirstPage((prev) => ({ ...prev, brand: e.target.value }))}
            className="rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />

          <select
            aria-label="Filter by stock status"
            value={filters.inStock}
            onChange={(e) => resetToFirstPage((prev) => ({ ...prev, inStock: e.target.value }))}
            className="rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <option value="">Any stock level</option>
            <option value="true">In stock</option>
            <option value="false">Out of stock</option>
          </select>

          <select
            aria-label="Filter by new arrival"
            value={filters.isNewArrival}
            onChange={(e) => resetToFirstPage((prev) => ({ ...prev, isNewArrival: e.target.value }))}
            className="rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <option value="">New arrival: any</option>
            <option value="true">New arrivals only</option>
            <option value="false">Not new arrivals</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="text-sm text-gray-600" htmlFor="product-sort">
            Sort by
          </label>
          <select
            id="product-sort"
            value={filters.sort}
            onChange={(e) => resetToFirstPage((prev) => ({ ...prev, sort: e.target.value }))}
            className="rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <option value="createdAt">Date added</option>
            <option value="name">Name</option>
            <option value="price">Price</option>
            <option value="stock">Stock</option>
          </select>
          <select
            aria-label="Sort order"
            value={filters.order}
            onChange={(e) => resetToFirstPage((prev) => ({ ...prev, order: e.target.value }))}
            className="rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>

          {(activeFilterCount > 0 || filters.search) && (
            <button
              type="button"
              onClick={() => resetToFirstPage(() => DEFAULT_FILTERS)}
              className="rounded text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Clear filters
            </button>
          )}
        </div>
      </Panel>

      <Panel>
        {error && <ErrorState message={error} onRetry={fetchProducts} className="mb-4" />}

        {loading ? (
          <LoadingState label="Loading products…" />
        ) : products.length === 0 ? (
          <EmptyState
            icon="box-open"
            title="No products found"
            description={
              filters.search || activeFilterCount > 0
                ? "No products match the current search/filters."
                : "Add your first product to get started."
            }
            action={
              <Button
                variant="primary"
                onClick={() => {
                  setEditingProduct(null);
                  setShowForm(true);
                }}
              >
                <i className="fas fa-plus" aria-hidden="true"></i>
                Add New Product
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="hidden px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase sm:table-cell">Brand</th>
                    <th className="hidden px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase md:table-cell">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                    <th className="hidden px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase lg:table-cell">New Arrival</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-6 py-4">
                        <img
                          src={product.images?.[0] || "/placeholder.png"}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-gray-400" title={product.id}>
                        {String(product.id).slice(-8)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">{product.name}</td>
                      <td className="hidden px-6 py-4 text-sm text-gray-500 sm:table-cell">{product.brand}</td>
                      <td className="hidden px-6 py-4 text-sm text-gray-500 md:table-cell">
                        {Array.isArray(product.category) ? product.category.join(", ") : product.category}
                      </td>
                      <td className="px-6 py-4 text-sm">₹{Number(product.price).toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm">
                        <Badge tone={statusTone(stockLabel(product.stock))}>
                          {product.stock} · {stockLabel(product.stock)}
                        </Badge>
                      </td>
                      <td className="hidden px-6 py-4 text-sm lg:table-cell">
                        {product.isNewArrival ? (
                          <Badge tone="blue">New Arrival</Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setEditingProduct(product);
                              setShowForm(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="dangerOutline"
                            onClick={() => {
                              setDeleteError("");
                              setDeleteTarget(product);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPageChange={setPage} />
          </>
        )}
      </Panel>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this product?"
        message={
          deleteTarget
            ? `"${deleteTarget.name}" will be removed from the catalog and the storefront. This can't be undone from here.`
            : ""
        }
        error={deleteError}
        confirmLabel="Delete"
        confirmVariant="danger"
        isConfirming={deleting}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
            setDeleteError("");
          }
        }}
      />
    </>
  );
};

export default Products;
