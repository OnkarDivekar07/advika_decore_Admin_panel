// src/pages/Alerts.jsx
//
// PHASE 14 — Operational Alerts & Notifications. Every section on this page
// is a direct, unmodified read of GET /api/admin/alerts (see
// backend/src/modules/admin/admin.service.js's getOperationalAlerts):
//   - Low stock            -> reuses the same query Inventory.jsx's own
//                             low-stock panel uses (GET /api/inventory/low-stock
//                             under the hood), just folded into one feed.
//   - Pending orders       -> real orders sitting at status 'pending'.
//   - Payment exceptions   -> real orders whose paymentStatus needs a human
//                             look (failed / timeout / unknown).
//   - Shipment exceptions  -> real shipments that failed delivery or are
//                             being returned to origin.
//
// There is no read/unread state anywhere on this page and no dismiss/
// acknowledge action — the backend has no storage for either (see
// getOperationalAlerts's own comment), and faking one client-side (e.g. in
// localStorage) would just be a frontend workaround duplicating state the
// backend doesn't actually track. An item disappears from here the same way
// it appeared: because the underlying condition (stock, order, payment,
// shipment) actually changed. This page never invents a row.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import PageHeader from '../layout/PageHeader';
import Panel from '../layout/Panel';
import Button from '../layout/Button';
import LoadingState from '../layout/LoadingState';
import ErrorState from '../layout/ErrorState';
import EmptyState from '../layout/EmptyState';
import Badge, { statusTone } from '../layout/Badge';
import useDebouncedValue from '../hooks/useDebouncedValue';

const DEFAULT_THRESHOLD = 10;

const formatCurrency = (value) =>
  `₹${typeof value === 'number' ? value.toFixed(2) : Number(value || 0).toFixed(2)}`;

const formatDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
};

// Small "N section" panel wrapper shared by all four alert types below —
// same loading/error/empty shape, just a different title/count/body.
function AlertSection({ title, description, icon, count, loading, children, action }) {
  return (
    <Panel className="mb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
            <i className={`fas fa-${icon}`} aria-hidden="true"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900">{title}</h2>
              {!loading && (
                <Badge tone={count > 0 ? 'red' : 'green'}>{count} {count === 1 ? 'item' : 'items'}</Badge>
              )}
            </div>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </Panel>
  );
}

const Alerts = () => {
  const [thresholdText, setThresholdText] = useState(String(DEFAULT_THRESHOLD));
  const debouncedThresholdText = useDebouncedValue(thresholdText, 400);
  const lowStockThreshold =
    Number.isInteger(Number(debouncedThresholdText)) && Number(debouncedThresholdText) >= 0
      ? Number(debouncedThresholdText)
      : DEFAULT_THRESHOLD;

  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Unlike every list page's useAdminListQuery (which keeps stale-but-valid
  // data on screen after a failed refresh, see its own `isStale` handling),
  // this page used to call setAlerts(null) unconditionally on any fetch
  // failure — so an admin with Alerts open, hitting a transient network
  // blip on a threshold change or manual refresh, would see all four
  // sections (low stock, pending orders, payment/shipment exceptions)
  // blank out even though the previously-loaded data was still perfectly
  // valid. Only clear `alerts` if we've never successfully loaded it.
  const hasLoadedRef = useRef(false);

  const fetchAlerts = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const res = await apiClient.get('/api/admin/alerts', {
        params: { lowStockThreshold },
      });
      setAlerts(res.data.data);
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('Failed to fetch operational alerts', err);
      setError('Failed to load operational alerts.');
      if (!hasLoadedRef.current) setAlerts(null);
    } finally {
      setLoading(false);
    }
  }, [lowStockThreshold]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const lowStock = alerts?.lowStock;
  const pendingOrders = alerts?.pendingOrders;
  const paymentExceptions = alerts?.paymentExceptions;
  const shipmentExceptions = alerts?.shipmentExceptions;
  const fulfillmentExceptions = alerts?.fulfillmentExceptions;

  return (
    <>
      <PageHeader
        title="Alerts"
        description="Real-time operational conditions that need attention — nothing here is simulated."
        actions={
          <Button variant="secondary" onClick={fetchAlerts} disabled={loading} data-testid="alerts-refresh-btn">
            <i className="fas fa-rotate mr-2" aria-hidden="true"></i>
            Refresh
          </Button>
        }
      />

      {error && <ErrorState message={error} onRetry={fetchAlerts} className="mb-6" />}

      {loading && !alerts ? (
        <Panel>
          <LoadingState label="Loading operational alerts…" />
        </Panel>
      ) : (
        alerts && (
          <>
            {/* --- Low stock --------------------------------------------- */}
            <AlertSection
              title="Low stock"
              description="Products at or below the stock threshold."
              icon="warehouse"
              count={lowStock.count}
              loading={loading}
              action={
                <div className="flex items-center gap-2">
                  <label htmlFor="alerts-low-stock-threshold" className="text-sm text-gray-600">
                    Threshold
                  </label>
                  <input
                    id="alerts-low-stock-threshold"
                    type="number"
                    min="0"
                    step="1"
                    value={thresholdText}
                    onChange={(e) => setThresholdText(e.target.value)}
                    className="w-20 rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    data-testid="alerts-threshold-input"
                  />
                </div>
              }
            >
              {lowStock.items.length === 0 ? (
                <EmptyState icon="check-circle" title="Nothing is low on stock" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th scope="col" className="hidden px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase sm:table-cell">Brand</th>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                        <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {lowStock.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                          <td className="hidden px-4 py-3 text-sm text-gray-500 sm:table-cell">{item.brand}</td>
                          <td className="px-4 py-3 text-sm">
                            <Badge tone={item.stock <= 0 ? 'red' : 'yellow'}>{item.stock} left</Badge>
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            <Link to="/inventory" className="font-medium text-blue-600 hover:underline" aria-label={`Restock ${item.name}`}>
                              Restock
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AlertSection>

            {/* --- Pending orders ----------------------------------------- */}
            <AlertSection
              title="Pending orders"
              description="Orders still awaiting confirmation, oldest first."
              icon="hourglass-half"
              count={pendingOrders.count}
              loading={loading}
            >
              {pendingOrders.items.length === 0 ? (
                <EmptyState icon="check-circle" title="No orders awaiting confirmation" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                        <th scope="col" className="hidden px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase sm:table-cell">Customer</th>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th scope="col" className="hidden px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase sm:table-cell">Placed</th>
                        <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {pendingOrders.items.map((order) => (
                        <tr key={order.id}>
                          <td className="px-4 py-3 text-sm font-mono text-gray-700">#{order.id.slice(-8)}</td>
                          <td className="hidden px-4 py-3 text-sm text-gray-500 sm:table-cell">
                            {order.user?.name || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(order.total)}</td>
                          <td className="hidden px-4 py-3 text-sm text-gray-500 sm:table-cell">{formatDate(order.createdAt)}</td>
                          <td className="px-4 py-3 text-right text-sm">
                            <Link to={`/orders/${order.id}`} className="font-medium text-blue-600 hover:underline" aria-label={`View order #${order.id.slice(-8)}`}>
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AlertSection>

            {/* --- Payment exceptions --------------------------------------- */}
            <AlertSection
              title="Payment exceptions"
              description="Orders whose payment attempt failed, timed out, or couldn't be confirmed."
              icon="triangle-exclamation"
              count={paymentExceptions.count}
              loading={loading}
            >
              {paymentExceptions.items.length === 0 ? (
                <EmptyState icon="check-circle" title="No payment exceptions" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                        <th scope="col" className="hidden px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase sm:table-cell">Customer</th>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                        <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {paymentExceptions.items.map((order) => (
                        <tr key={order.id}>
                          <td className="px-4 py-3 text-sm font-mono text-gray-700">#{order.id.slice(-8)}</td>
                          <td className="hidden px-4 py-3 text-sm text-gray-500 sm:table-cell">
                            {order.user?.name || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(order.total)}</td>
                          <td className="px-4 py-3 text-sm">
                            <Badge tone={statusTone(order.paymentStatus)}>{order.paymentStatus}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            <Link to={`/orders/${order.id}`} className="font-medium text-blue-600 hover:underline" aria-label={`View order #${order.id.slice(-8)}`}>
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AlertSection>

            {/* --- Shipment exceptions --------------------------------------- */}
            <AlertSection
              title="Shipment exceptions"
              description="Shipments that failed delivery or are being returned to origin."
              icon="truck-ramp-box"
              count={shipmentExceptions.count}
              loading={loading}
            >
              {shipmentExceptions.items.length === 0 ? (
                <EmptyState icon="check-circle" title="No shipment exceptions" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                        <th scope="col" className="hidden px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase sm:table-cell">Customer</th>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th scope="col" className="hidden px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase sm:table-cell">Courier</th>
                        <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {shipmentExceptions.items.map((shipment) => (
                        <tr key={shipment.orderId}>
                          <td className="px-4 py-3 text-sm font-mono text-gray-700">
                            #{shipment.orderId.slice(-8)}
                          </td>
                          <td className="hidden px-4 py-3 text-sm text-gray-500 sm:table-cell">
                            {shipment.user?.name || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Badge tone={statusTone(shipment.status)}>{shipment.status}</Badge>
                          </td>
                          <td className="hidden px-4 py-3 text-sm text-gray-500 sm:table-cell">
                            {shipment.courierPartner}
                            {shipment.trackingId ? ` · ${shipment.trackingId}` : ''}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            <Link to={`/orders/${shipment.orderId}`} className="font-medium text-blue-600 hover:underline" aria-label={`View order #${shipment.orderId.slice(-8)}`}>
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AlertSection>

            {/* --- Fulfillment exceptions ------------------------------------ */}
            {/* Pattern 16 (Redis/BullMQ/background-job resilience audit): a
                paid order whose post-confirmation fulfillment (stock decrement,
                cart clear, confirmation notification) failed — most often
                "paid but oversold" — and either is still within
                reconcileFailedFulfillments' automatic retry sweep or has
                exhausted it. Previously invisible anywhere in this admin
                panel; see backend/src/modules/admin/admin.service.js's
                getOperationalAlerts. */}
            <AlertSection
              title="Fulfillment exceptions"
              description="Paid orders where stock sync, cart clearing, or the confirmation SMS failed after payment."
              icon="triangle-exclamation"
              count={fulfillmentExceptions.count}
              loading={loading}
            >
              {fulfillmentExceptions.items.length === 0 ? (
                <EmptyState icon="check-circle" title="No fulfillment exceptions" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                        <th scope="col" className="hidden px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase sm:table-cell">Customer</th>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                        <th scope="col" className="hidden px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase sm:table-cell">Attempts</th>
                        <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {fulfillmentExceptions.items.map((order) => (
                        <tr key={order.id}>
                          <td className="px-4 py-3 text-sm font-mono text-gray-700">#{order.id.slice(-8)}</td>
                          <td className="hidden px-4 py-3 text-sm text-gray-500 sm:table-cell">
                            {order.user?.name || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(order.total)}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {order.oversold ? (
                              <Badge tone="red">Oversold</Badge>
                            ) : (
                              <span className="text-gray-500">{order.fulfillmentError || '—'}</span>
                            )}
                          </td>
                          <td className="hidden px-4 py-3 text-sm text-gray-500 sm:table-cell">{order.fulfillmentAttempts}</td>
                          <td className="px-4 py-3 text-right text-sm">
                            <Link to={`/orders/${order.id}`} className="font-medium text-blue-600 hover:underline" aria-label={`View order #${order.id.slice(-8)}`}>
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AlertSection>

            <p className="text-xs text-gray-600">
              Live figures from <code>GET /api/admin/alerts</code>, generated {formatDate(alerts.generatedAt)}.
            </p>
          </>
        )
      )}
    </>
  );
};

export default Alerts;
