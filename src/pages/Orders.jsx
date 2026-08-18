// src/pages/Orders.jsx
//
// Admin order workbench — GET /api/orders/all (the real plural endpoint;
// see backend/src/routes/apiRoutes.js, which mounts the same order router
// under both '/order' and '/orders' — customer frontend keeps using the
// singular form, this panel uses the plural one order.doc.js has always
// documented). Backend-paginated/filtered/searched, same conventions as
// Products.jsx: debounced search, filters that reset to page 1, and a
// Pagination component driven directly off the backend's meta shape.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../api/apiClient";
import PageHeader from "../layout/PageHeader";
import Panel from "../layout/Panel";
import LoadingState from "../layout/LoadingState";
import ErrorState from "../layout/ErrorState";
import EmptyState from "../layout/EmptyState";
import Pagination from "../layout/Pagination";
import Badge, { statusTone } from "../layout/Badge";
import useDebouncedValue from "../hooks/useDebouncedValue";

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
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });

  // `loading` only covers the very first fetch (nothing on screen yet);
  // `refreshing` covers every fetch after that, while `orders` still
  // holds the previous page's data. Splitting the two means a filter
  // change or page turn dims/marks the existing table as stale instead
  // of flashing an empty loading screen over data the admin was already
  // looking at.
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [isStale, setIsStale] = useState(false);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(filters.search, 400);

  const resetToFirstPage = (updater) => {
    setPage(1);
    setFilters(updater);
  };

  const fetchOrders = useCallback(async () => {
    try {
      setError("");
      if (orders.length === 0) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const params = { page, limit: PAGE_SIZE };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filters.status) params.status = filters.status;
      if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;

      // GET /api/orders/all responds with { data: [...], meta: {...} }
      // (see backend/src/modules/order/order.controller.js's getOrders) —
      // the orders array lives at response.data.data, the pagination
      // meta at response.data.meta.
      const response = await apiClient.get("/api/orders/all", { params });
      setOrders(Array.isArray(response.data.data) ? response.data.data : []);
      setMeta({
        page: response.data.meta?.page ?? 1,
        totalPages: response.data.meta?.totalPages ?? 1,
        total: response.data.meta?.total ?? 0,
      });
      setIsStale(false);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(err.response?.data?.message || "Failed to load orders.");
      // The table the admin was already looking at is now unconfirmed
      // against the backend — flag it rather than silently leaving it
      // looking current, but don't clear it out either (a transient
      // network blip shouldn't blank a working screen).
      if (orders.length > 0) setIsStale(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters.status, filters.paymentStatus, filters.dateFrom, filters.dateTo, debouncedSearch]);

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters.status, filters.paymentStatus, filters.dateFrom, filters.dateTo, debouncedSearch]);

  const activeFilterCount = useMemo(
    () => [filters.status, filters.paymentStatus, filters.dateFrom, filters.dateTo].filter(Boolean).length,
    [filters.status, filters.paymentStatus, filters.dateFrom, filters.dateTo]
  );

  const hasFilters = activeFilterCount > 0 || Boolean(filters.search);

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
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>

          <select
            aria-label="Filter by order status"
            value={filters.status}
            onChange={(e) => resetToFirstPage((prev) => ({ ...prev, status: e.target.value }))}
            className="rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
            onChange={(e) => resetToFirstPage((prev) => ({ ...prev, paymentStatus: e.target.value }))}
            className="rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
              onChange={(e) => resetToFirstPage((prev) => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
            <span className="text-gray-400">–</span>
            <label htmlFor="order-date-to" className="sr-only">
              Placed on or before
            </label>
            <input
              id="order-date-to"
              type="date"
              aria-label="Placed on or before"
              value={filters.dateTo}
              min={filters.dateFrom || undefined}
              onChange={(e) => resetToFirstPage((prev) => ({ ...prev, dateTo: e.target.value }))}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>
        </div>

        {hasFilters && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => resetToFirstPage(() => DEFAULT_FILTERS)}
              className="rounded text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Clear filters
            </button>
          </div>
        )}
      </Panel>

      <Panel>
        {error && <ErrorState message={error} onRetry={fetchOrders} className="mb-4" />}

        {isStale && !error && (
          <div role="status" className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
            Showing previously loaded results — the latest data couldn't be confirmed. Try refreshing.
          </div>
        )}

        {loading ? (
          <LoadingState label="Loading orders…" />
        ) : orders.length === 0 ? (
          <EmptyState
            icon="shopping-cart"
            title="No orders found"
            description={
              hasFilters
                ? "No orders match the current search/filters."
                : "Orders placed by customers will show up here."
            }
          />
        ) : (
          <>
            <div className={`overflow-x-auto ${refreshing ? "opacity-60 transition-opacity" : ""}`} aria-busy={refreshing}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Customer
                    </th>
                    <th className="hidden px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase sm:table-cell">
                      Placed On
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Order Status
                    </th>
                    <th className="hidden px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase md:table-cell">
                      Payment Status
                    </th>
                    <th className="hidden px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase lg:table-cell">
                      Shipment
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-500" title={order.id}>
                        {String(order.id).slice(-8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div className="font-medium text-gray-900">{order.user?.name || "N/A"}</div>
                        {order.user?.email && (
                          <div className="text-xs text-gray-500">{order.user.email}</div>
                        )}
                      </td>
                      <td className="hidden px-6 py-4 whitespace-nowrap text-sm text-gray-500 sm:table-cell">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{typeof order.total === "number" ? order.total.toFixed(2) : "0.00"}
                      </td>
                      {/*
                        Order status and payment status are always read
                        from their own separate response fields and
                        rendered as separate badges — never derived from
                        one another. An order sitting at status:'pending'
                        says nothing on its own about whether it was ever
                        paid for; paymentStatus is the only source of
                        truth for that (see order.service.js's
                        getAllOrders, which keeps them as two fields for
                        exactly this reason).
                      */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Badge tone={statusTone(order.status)}>{formatEnumLabel(order.status)}</Badge>
                      </td>
                      <td className="hidden px-6 py-4 whitespace-nowrap text-sm md:table-cell">
                        <Badge tone={statusTone(order.paymentStatus)}>{formatEnumLabel(order.paymentStatus)}</Badge>
                      </td>
                      <td className="hidden px-6 py-4 whitespace-nowrap text-sm lg:table-cell">
                        {order.shipmentStatus ? (
                          <Badge tone={statusTone(order.shipmentStatus)}>{formatEnumLabel(order.shipmentStatus)}</Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Link
                          className="rounded font-medium text-blue-600 hover:text-blue-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          to={`/orders/${order.id}`}
                        >
                          View
                        </Link>
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
    </>
  );
};

export default Orders;
