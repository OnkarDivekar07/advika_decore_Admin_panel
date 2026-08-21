// src/pages/Products.jsx
//
// PHASE 12 — rebuilt on the shared admin data-interaction layer
// (useAdminListQuery + DataTable, see src/hooks/useAdminListQuery.js and
// src/layout/DataTable.jsx). Same backend contract as before
// (GET /api/products, backend-paginated/filtered/sorted/searched via
// utils/paginateWithCache.js) — only how this screen manages and renders
// that query changed:
//   - search now correctly resets to page 1 once it settles (previously
//     it didn't, a real bug: searching while on page 3 could appear to
//     "find nothing" purely because page 3 no longer existed for the new
//     query)
//   - filters/sort/page are persisted in the URL, so reloading or sharing
//     a link reproduces the exact same view
//   - an in-flight request is aborted the moment a newer one starts, and
//     any response that still resolves out of order is ignored — an
//     older, slower response can never overwrite newer results
//   - Name/Price/Stock column headers are directly clickable to sort
//     (deterministic — same sort/order state that drives the request,
//     never a client-side re-ordering of already-fetched rows)
import React, { useCallback, useState } from "react";
import apiClient from "../api/apiClient";
import ProductForm from "../component/Adminlogin/ProductForm";
import PageHeader from "../layout/PageHeader";
import Panel from "../layout/Panel";
import Button from "../layout/Button";
import ConfirmDialog from "../layout/ConfirmDialog";
import DataTable from "../layout/DataTable";
import Badge, { statusTone } from "../layout/Badge";
import useAdminListQuery from "../hooks/useAdminListQuery";

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
};

const PAGE_SIZE = 10;

const Products = () => {
  const fetchProducts = useCallback(
    (params, signal) =>
      apiClient
        .get("/api/products", { params, signal })
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
    clearFilters,
    page,
    setPage,
    sort,
    order,
    setSort,
    hasActiveFilters,
    refetch,
  } = useAdminListQuery({
    fetcher: fetchProducts,
    defaultFilters: DEFAULT_FILTERS,
    defaultSort: { sort: "createdAt", order: "desc" },
    pageSize: PAGE_SIZE,
    errorMessage: "Failed to load products.",
  });

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [banner, setBanner] = useState(null); // { tone: 'success' | 'error', message }

  React.useEffect(() => {
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
        setPage(page - 1);
      } else {
        refetch();
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
    refetch();
  };

  const activeFilterCount = [filters.category, filters.brand, filters.inStock, filters.isNewArrival].filter(
    Boolean
  ).length;

  const columns = [
    {
      key: "image",
      header: "Image",
      mobileHidden: true,
      accessor: (product) => (
        <img
          src={product.images?.[0] || "/placeholder.png"}
          alt={product.name}
          className="h-12 w-12 rounded object-cover"
        />
      ),
    },
    {
      key: "id",
      header: "ID",
      hideBelow: "lg",
      mobileHidden: true,
      accessor: (product) => (
        <span className="font-mono text-xs text-gray-400" title={product.id}>
          {String(product.id).slice(-8)}
        </span>
      ),
    },
    {
      key: "name",
      header: "Name",
      sortKey: "name",
      mobileHidden: true, // already the mobile card title
      cellClassName: "font-medium text-gray-900",
      accessor: (product) => product.name,
    },
    {
      key: "brand",
      header: "Brand",
      accessor: (product) => product.brand,
    },
    {
      key: "category",
      header: "Category",
      hideBelow: "lg",
      accessor: (product) => (Array.isArray(product.category) ? product.category.join(", ") : product.category),
    },
    {
      key: "price",
      header: "Price",
      sortKey: "price",
      accessor: (product) => `₹${Number(product.price).toFixed(2)}`,
    },
    {
      key: "stock",
      header: "Stock",
      sortKey: "stock",
      accessor: (product) => (
        <Badge tone={statusTone(stockLabel(product.stock))}>
          {product.stock} · {stockLabel(product.stock)}
        </Badge>
      ),
    },
    {
      key: "isNewArrival",
      header: "New Arrival",
      hideBelow: "lg",
      accessor: (product) =>
        product.isNewArrival ? <Badge tone="blue">New Arrival</Badge> : <span className="text-gray-400">—</span>,
    },
  ];

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
              onChange={(e) => setFilter("search", e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>

          <select
            aria-label="Filter by category"
            value={filters.category}
            onChange={(e) => setFilter("category", e.target.value)}
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
            onChange={(e) => setFilter("brand", e.target.value)}
            className="rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />

          <select
            aria-label="Filter by stock status"
            value={filters.inStock}
            onChange={(e) => setFilter("inStock", e.target.value)}
            className="rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <option value="">Any stock level</option>
            <option value="true">In stock</option>
            <option value="false">Out of stock</option>
          </select>

          <select
            aria-label="Filter by new arrival"
            value={filters.isNewArrival}
            onChange={(e) => setFilter("isNewArrival", e.target.value)}
            className="rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <option value="">New arrival: any</option>
            <option value="true">New arrivals only</option>
            <option value="false">Not new arrivals</option>
          </select>
        </div>

        {(activeFilterCount > 0 || filters.search) && (
          <div className="mt-3">
            <button
              type="button"
              onClick={clearFilters}
              className="rounded text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Clear filters
            </button>
          </div>
        )}
      </Panel>

      <Panel>
        <DataTable
          columns={columns}
          rows={products}
          getRowKey={(product) => product.id}
          caption="Products"
          loading={loading}
          loadingLabel="Loading products…"
          error={error}
          onRetry={refetch}
          refreshing={refreshing}
          isStale={isStale}
          empty={{
            icon: "box-open",
            title: "No products found",
            description: hasActiveFilters
              ? "No products match the current search/filters."
              : "Add your first product to get started.",
            action: (
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
            ),
          }}
          sort={sort}
          order={order}
          onSortChange={setSort}
          meta={meta}
          onPageChange={setPage}
          mobileCardTitle={(product) => product.name}
          mobileCardSubtitle={(product) => product.brand}
          renderRowActions={(product) => (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingProduct(product);
                  setShowForm(true);
                }}
                aria-label={`Edit ${product.name}`}
              >
                Edit
              </Button>
              <Button
                variant="dangerOutline"
                onClick={() => {
                  setDeleteError("");
                  setDeleteTarget(product);
                }}
                aria-label={`Delete ${product.name}`}
              >
                Delete
              </Button>
            </>
          )}
        />
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
