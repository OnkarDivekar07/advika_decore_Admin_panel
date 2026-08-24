// src/pages/Orders.jsx
//
// PHASE 12 — rebuilt on the shared admin data-interaction layer
// (useAdminListQuery + DataTable). Same backend contract as before
// (GET /api/orders/all — the plural endpoint; see
// backend/src/routes/apiRoutes.js, which mounts the same order router
// under both '/order' and '/orders', customer frontend keeps using the
// singular form) — only how this screen manages/renders that query
// changed. See Products.jsx for the fuller rationale; the short version:
// search now correctly resets to page 1, filters/page persist in the URL,
// and requests are race-safe (an older, slower response can never
// overwrite a newer one).
//
// Orders has no user-controllable sort — order.service.js's getAllOrders
// is always createdAt desc server-side (see order.validation.js, which
// doesn't accept a `sort` param at all) — so this table's columns are
// deliberately non-sortable. That's still "deterministic": the ordering
// is fixed and documented, not silently reshuffled client-side.
import React, { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import apiClient from "../api/apiClient";
import PageHeader from "../layout/PageHeader";
import Panel from "../layout/Panel";
import DataTable from "../layout/DataTable";
import Badge, { statusTone } from "../layout/Badge";
import useAdminListQuery from "../hooks/useAdminListQuery";

// Mirrors order.validation.js's ADMIN_ORDER_STATUSES /
// ADMIN_PAYMENT_STATUSES — kept in sync manually (this is a plain
// <select>, not a shared codegen'd contract). 'draft' is deliberately
// absent: it's never a real placed order (see order.service.js's
// getAllOrders), so there's nothing for an admin to filter to.
const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled", "returned"];
const PAYMENT_STATUSES = [
  "pending", "attempted", "processing", "paid", "failed",
  "cancelled", "timeout", "unknown", "refunded", "cod_pending",
];

const PAGE_SIZE = 20;

const DEFAULT_FILTERS = {
  search: "",
  status: "",
  paymentStatus: "",
  dateFrom: "",
  dateTo: "",
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleDateString();
};

const formatEnumLabel = (value) =>
  value
    ? value
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : value;

const Orders = () => {
  const fetchOrders = useCallback(
    (params, signal) =>
      apiClient
        .get("/api/orders/all", { params, signal })
        .then((response) => ({ data: response.data.data, meta: response.data.meta })),
    []
  );

  const {
    data: orders,
    meta,
    loading,
    refreshing,
    error,
    isStale,
    filters,
    setFilter,
    clearFilters,
    setPage,
    hasActiveFilters,
    refetch,
  } = useAdminListQuery({
    fetcher: fetchOrders,
    defaultFilters: DEFAULT_FILTERS,
    pageSize: PAGE_SIZE,
    errorMessage: "Failed to load orders.",
  });

  const activeFilterCount = useMemo(
    () => [filters.status, filters.paymentStatus, filters.dateFrom, filters.dateTo].filter(Boolean).length,
    [filters.status, filters.paymentStatus, filters.dateFrom, filters.dateTo]
  );

  const columns = [
    {
      key: "id",
      header: "Order ID",
      mobileHidden: true,
      accessor: (order) => (
        <span className="font-mono text-xs text-gray-500" title={order.id}>
          {String(order.id).slice(-8)}
        </span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      mobileHidden: true, // already the mobile card title/subtitle
      accessor: (order) => (
        <>
          <div className="font-medium text-gray-900">{order.user?.name || "N/A"}</div>
          {order.user?.email && <div className="text-xs text-gray-500">{order.user.email}</div>}
        </>
      ),
    },
    {
      key: "placedOn",
      header: "Placed On",
      hideBelow: "lg",
      accessor: (order) => formatDate(order.createdAt),
    },
    {
      key: "total",
      header: "Total",
      accessor: (order) => `₹${typeof order.total === "number" ? order.total.toFixed(2) : "0.00"}`,
    },
    // Order status and payment status are always read from their own
    // separate response fields and rendered as separate badges — never
    // derived from one another. An order sitting at status:'pending'
    // says nothing on its own about whether it was ever paid for;
    // paymentStatus is the only source of truth for that (see
    // order.service.js's getAllOrders, which keeps them as two fields
    // for exactly this reason).
    {
      key: "status",
      header: "Order Status",
      accessor: (order) => <Badge tone={statusTone(order.status)}>{formatEnumLabel(order.status)}</Badge>,
    },
    {
      key: "paymentStatus",
      header: "Payment Status",
      hideBelow: "lg",
      accessor: (order) => (
        <Badge tone={statusTone(order.paymentStatus)}>{formatEnumLabel(order.paymentStatus)}</Badge>
      ),
    },
    {
      key: "shipment",
      header: "Shipment",
      hideBelow: "lg",
      accessor: (order) =>
        order.shipmentStatus ? (
          <Badge tone={statusTone(order.shipmentStatus)}>{formatEnumLabel(order.shipmentStatus)}</Badge>
        ) : (
          <span className="text-gray-600">—</span>
        ),
    },
  ];

  return (
    <>
      <PageHeader title="Orders" description="All orders placed by customers." />

      <Panel className="mb-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label htmlFor="order-search" className="sr-only">
              Search by customer name, email, or order ID
            </label>
            <input
              id="order-search"
              type="search"
              placeholder="Search customer name, email, or order ID…"
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              data-testid="orders-search-input"
            />
          </div>

          <select
            aria-label="Filter by order status"
            value={filters.status}
            onChange={(e) => setFilter("status", e.target.value)}
            className="rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            data-testid="orders-status-filter"
          >
            <option value="">All order statuses</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatEnumLabel(status)}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by payment status"
            value={filters.paymentStatus}
            onChange={(e) => setFilter("paymentStatus", e.target.value)}
            className="rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            data-testid="orders-payment-status-filter"
          >
            <option value="">All payment statuses</option>
            {PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatEnumLabel(status)}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <label htmlFor="order-date-from" className="sr-only">
              Placed on or after
            </label>
            <input
              id="order-date-from"
              type="date"
              aria-label="Placed on or after"
              value={filters.dateFrom}
              max={filters.dateTo || undefined}
              onChange={(e) => setFilter("dateFrom", e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              data-testid="orders-date-from-input"
            />
            <span className="text-gray-600">–</span>
            <label htmlFor="order-date-to" className="sr-only">
              Placed on or before
            </label>
            <input
              id="order-date-to"
              type="date"
              aria-label="Placed on or before"
              value={filters.dateTo}
              min={filters.dateFrom || undefined}
              onChange={(e) => setFilter("dateTo", e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              data-testid="orders-date-to-input"
            />
          </div>
        </div>

        {(activeFilterCount > 0 || filters.search) && (
          <div className="mt-3">
            <button
              type="button"
              onClick={clearFilters}
              data-testid="orders-clear-filters-btn"
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
          rows={orders}
          getRowKey={(order) => order.id}
          caption="Orders"
          loading={loading}
          loadingLabel="Loading orders…"
          error={error}
          onRetry={refetch}
          refreshing={refreshing}
          isStale={isStale}
          empty={{
            icon: "shopping-cart",
            title: "No orders found",
            description: hasActiveFilters
              ? "No orders match the current search/filters."
              : "Orders placed by customers will show up here.",
          }}
          meta={meta}
          onPageChange={setPage}
          mobileCardTitle={(order) => order.user?.name || "N/A"}
          mobileCardSubtitle={(order) => order.user?.email}
          renderRowActions={(order) => (
            <Link
              className="rounded font-medium text-blue-600 hover:text-blue-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              to={`/orders/${order.id}`}
              aria-label={`View order ${order.id}`}
            >
              View
            </Link>
          )}
        />
      </Panel>
    </>
  );
};

export default Orders;
