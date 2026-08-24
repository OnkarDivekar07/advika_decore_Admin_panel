// src/pages/orderviewpage.jsx
//
// Admin order detail — PHASE 7. GET /api/orders/:id (order.service.js's
// fetchOrderById) is the single source of truth for everything on this
// page: customer identity, delivery address snapshot, order items,
// totals, order status, payment status, payment references, and the
// last-known shipment state. Nothing here is computed or inferred on the
// frontend — every status shown is whatever the backend's own enum value
// says, rendered as-is (see Badge's statusTone, which colors a status
// string without ever guessing at one).
//
// The only admin actions on this page are the three that have a real
// backend operation behind them (backend/src/modules/shipping):
//   - POST /api/shipping/:orderId/create  (only offered when the order is
//     actually eligible — status 'confirmed' and no shipment yet; the
//     backend enforces this too, this just avoids offering a button that
//     would 400)
//   - GET  /api/shipping/:orderId/track   ("Refresh Tracking" — polls the
//     carrier and persists the result; this page never polls automatically
//     on load, only on explicit request, to keep a routine page view cheap
//     and side-effect-free)
//   - POST /api/shipping/:orderId/cancel
// There is currently no backend endpoint to directly change an order's
// status, so no such button exists here — see order.routes.js /
// shipping.routes.js. Every action below re-fetches the full order from
// the backend afterward rather than guessing at the new state locally.
import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "../api/apiClient";
import PageHeader from "../layout/PageHeader";
import Panel from "../layout/Panel";
import Button from "../layout/Button";
import LoadingState from "../layout/LoadingState";
import ErrorState from "../layout/ErrorState";
import EmptyState from "../layout/EmptyState";
import ConfirmDialog from "../layout/ConfirmDialog";
import Badge, { statusTone } from "../layout/Badge";

const formatDateTime = (date) => {
  if (!date) return "—";
  const d = new Date(date);
  return isNaN(d) ? "—" : d.toLocaleString();
};

const formatEnumLabel = (value) =>
  value
    ? String(value)
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : value;

const formatCurrency = (value) =>
  `₹${typeof value === "number" ? value.toFixed(2) : Number(value || 0).toFixed(2)}`;

// Shipment.status values that mean "nothing left to do" — a cancel action
// no longer makes sense once a shipment has reached one of these (the
// backend itself rejects a cancel in this state — see
// shipping.service.js's cancelOrderShipment — this just avoids offering a
// button that would 400).
const TERMINAL_SHIPMENT_STATUSES = new Set(["DELIVERED", "RTO_DELIVERED", "CANCELLED"]);

const OrderViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  // 'notFound' | 'forbidden' | 'error' | ''
  const [errorKind, setErrorKind] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Shipment actions (create / refresh) — a single in-flight flag is
  // enough since only one of these can ever be triggered at a time from
  // this page.
  const [shipmentActionLoading, setShipmentActionLoading] = useState(""); // 'create' | 'refresh' | ''
  const [shipmentActionError, setShipmentActionError] = useState("");

  // Cancel shipment goes through a confirmation dialog with an optional
  // reason, same pattern as Products.jsx's delete confirmation.
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const fetchOrder = useCallback(
    async ({ silent } = {}) => {
      if (!silent) {
        setLoading(true);
        setErrorKind("");
        setErrorMessage("");
      }
      try {
        // GET /api/orders/:id responds with { data: {...} } (see
        // backend/src/modules/order/order.controller.js's getOrderById) —
        // the order object lives at response.data.data, not response.data.
        const { data } = await apiClient.get(`/api/orders/${id}`);
        setOrder(data.data);
        setErrorKind("");
      } catch (err) {
        console.error("Error fetching order:", err);
        const status = err.response?.status;
        if (status === 404 || status === 422) {
          // A malformed id (422 — see order.validation.js's
          // validateOrderIdParam) and a well-formed but nonexistent id
          // (404) both mean the same thing to an admin looking this order
          // up: there's nothing here. Treated identically so an admin
          // never sees a raw validation error for what is, from where
          // they're standing, just an order that doesn't exist.
          setErrorKind("notFound");
        } else if (status === 403) {
          setErrorKind("forbidden");
        } else {
          setErrorKind("error");
          setErrorMessage(err.response?.data?.message || "Failed to load order.");
        }
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const shipment = order?.shipment || null;
  const canCreateShipment = order?.status === "confirmed" && !shipment;
  const canCancelShipment = Boolean(shipment) && !TERMINAL_SHIPMENT_STATUSES.has(shipment?.status);

  const handleCreateShipment = async () => {
    setShipmentActionLoading("create");
    setShipmentActionError("");
    try {
      await apiClient.post(`/api/shipping/${id}/create`);
      await fetchOrder({ silent: true });
    } catch (err) {
      console.error("Error creating shipment:", err);
      setShipmentActionError(err.response?.data?.message || "Could not create shipment.");
    } finally {
      setShipmentActionLoading("");
    }
  };

  const handleRefreshTracking = async () => {
    setShipmentActionLoading("refresh");
    setShipmentActionError("");
    try {
      await apiClient.get(`/api/shipping/${id}/track`);
      await fetchOrder({ silent: true });
    } catch (err) {
      console.error("Error refreshing tracking:", err);
      setShipmentActionError(err.response?.data?.message || "Could not refresh tracking status.");
    } finally {
      setShipmentActionLoading("");
    }
  };

  const openCancelDialog = () => {
    setCancelReason("");
    setCancelError("");
    setCancelling(true);
  };

  const handleCancelShipment = async () => {
    setCancelSubmitting(true);
    setCancelError("");
    try {
      await apiClient.post(`/api/shipping/${id}/cancel`, {
        reason: cancelReason.trim() || undefined,
      });
      await fetchOrder({ silent: true });
      setCancelling(false);
    } catch (err) {
      console.error("Error cancelling shipment:", err);
      setCancelError(err.response?.data?.message || "Could not cancel shipment.");
    } finally {
      setCancelSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title={`Order #${id.slice(-8)}`}
        actions={
          <>
            {order && !loading && (
              <Button variant="ghost" onClick={() => fetchOrder()}>
                <i className="fas fa-rotate" aria-hidden="true"></i>
                Refresh
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate("/orders")}>
              <i className="fas fa-arrow-left" aria-hidden="true"></i>
              Back to Orders
            </Button>
          </>
        }
      />

      {loading && <LoadingState label="Loading order…" />}

      {!loading && errorKind === "notFound" && (
        <Panel>
          <EmptyState
            icon="circle-exclamation"
            title="Order not found"
            description="This order doesn't exist, or the ID in the URL isn't valid."
            action={
              <Button variant="secondary" onClick={() => navigate("/orders")}>
                Back to Orders
              </Button>
            }
          />
        </Panel>
      )}

      {!loading && errorKind === "forbidden" && (
        <Panel>
          <EmptyState
            icon="lock"
            title="Access denied"
            description="You don't have access to this order."
            action={
              <Button variant="secondary" onClick={() => navigate("/orders")}>
                Back to Orders
              </Button>
            }
          />
        </Panel>
      )}

      {!loading && errorKind === "error" && (
        <ErrorState message={errorMessage} onRetry={() => fetchOrder()} />
      )}

      {!loading && !errorKind && order && (
        <div className="space-y-6">
          <Panel>
            <h2 className="mb-3 text-lg font-semibold text-gray-800">Order Summary</h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">Order ID</dt>
                <dd className="font-mono text-xs font-medium text-gray-900" title={order.id}>
                  {order.id}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Total</dt>
                <dd className="font-medium text-gray-900">{formatCurrency(order.total)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Order Status</dt>
                <dd className="mt-1">
                  <Badge tone={statusTone(order.status)}>{formatEnumLabel(order.status)}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Payment Status</dt>
                <dd className="mt-1">
                  <Badge tone={statusTone(order.paymentStatus)}>
                    {formatEnumLabel(order.paymentStatus)}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Placed On</dt>
                <dd className="font-medium text-gray-900">{formatDateTime(order.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Last Updated</dt>
                <dd className="font-medium text-gray-900">{formatDateTime(order.updatedAt)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel>
            <h2 className="mb-3 text-lg font-semibold text-gray-800">Customer</h2>
            {order.user ? (
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-gray-500">Name</dt>
                  <dd className="font-medium text-gray-900">{order.user.name || "N/A"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Email</dt>
                  <dd className="font-medium text-gray-900">
                    {order.user.email ? (
                      <a
                        href={`mailto:${order.user.email}`}
                        className="rounded text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        {order.user.email}
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Phone</dt>
                  <dd className="font-medium text-gray-900">{order.user.phone || "N/A"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Customer ID</dt>
                  <dd className="font-mono text-xs font-medium text-gray-900" title={order.user.id}>
                    {order.user.id || "N/A"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-gray-500">No customer information available.</p>
            )}
          </Panel>

          <Panel>
            <h2 className="mb-3 text-lg font-semibold text-gray-800">Delivery Address</h2>
            {order.address ? (
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-gray-500">Name</dt>
                  <dd className="font-medium text-gray-900">{order.address.name}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Phone</dt>
                  <dd className="font-medium text-gray-900">{order.address.phone}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-gray-500">Street</dt>
                  <dd className="font-medium text-gray-900">
                    {order.address.houseArea}
                    {order.address.area ? `, ${order.address.area}` : ""}
                  </dd>
                </div>
                {order.address.landmark && (
                  <div className="sm:col-span-2">
                    <dt className="text-gray-500">Landmark</dt>
                    <dd className="font-medium text-gray-900">{order.address.landmark}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-gray-500">City / State</dt>
                  <dd className="font-medium text-gray-900">
                    {order.address.city}, {order.address.state}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Pincode</dt>
                  <dd className="font-medium text-gray-900">{order.address.pincode}</dd>
                </div>
                {order.address.deliveryInstructions && (
                  <div className="sm:col-span-2">
                    <dt className="text-gray-500">Delivery Instructions</dt>
                    <dd className="font-medium text-gray-900">
                      {order.address.deliveryInstructions}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-gray-500">No address found for this order.</p>
            )}
          </Panel>

          {order.orderItems?.length > 0 && (
            <Panel>
              <h2 className="mb-3 text-lg font-semibold text-gray-800">Order Items</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500 uppercase text-xs">
                        Product
                      </th>
                      <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500 uppercase text-xs">
                        Quantity
                      </th>
                      <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500 uppercase text-xs">
                        Unit Price
                      </th>
                      <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500 uppercase text-xs">
                        Line Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {order.orderItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2">{item.product?.name || "N/A"}</td>
                        <td className="px-4 py-2">{item.quantity}</td>
                        <td className="px-4 py-2">{formatCurrency(item.price)}</td>
                        <td className="px-4 py-2">{formatCurrency(item.price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <dl className="mt-4 ml-auto w-full max-w-xs space-y-1.5 text-sm">
                {typeof order.subtotal === "number" && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Subtotal</dt>
                    <dd className="text-gray-900">{formatCurrency(order.subtotal)}</dd>
                  </div>
                )}
                {typeof order.deliveryCharge === "number" && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Delivery Charge</dt>
                    <dd className="text-gray-900">{formatCurrency(order.deliveryCharge)}</dd>
                  </div>
                )}
                {Boolean(order.discount) && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">
                      Discount{order.couponCode ? ` (${order.couponCode})` : ""}
                    </dt>
                    <dd className="text-gray-900">-{formatCurrency(order.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-1.5 font-semibold">
                  <dt className="text-gray-700">Total</dt>
                  <dd className="text-gray-900">{formatCurrency(order.total)}</dd>
                </div>
              </dl>
            </Panel>
          )}

          <Panel>
            <h2 className="mb-3 text-lg font-semibold text-gray-800">Payment</h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">Payment Status</dt>
                <dd className="mt-1">
                  <Badge tone={statusTone(order.paymentStatus)}>
                    {formatEnumLabel(order.paymentStatus)}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Amount</dt>
                <dd className="font-medium text-gray-900">{formatCurrency(order.total)}</dd>
              </div>
              {order.payment_order_id && (
                <div>
                  <dt className="text-gray-500">Razorpay Order Reference</dt>
                  <dd
                    className="font-mono text-xs font-medium text-gray-900"
                    title={order.payment_order_id}
                  >
                    {order.payment_order_id}
                  </dd>
                </div>
              )}
              {order.payment_id && (
                <div>
                  <dt className="text-gray-500">Razorpay Payment Reference</dt>
                  <dd className="font-mono text-xs font-medium text-gray-900" title={order.payment_id}>
                    {order.payment_id}
                  </dd>
                </div>
              )}
            </dl>
            <p className="mt-3 text-xs text-gray-600">
              Only payment identifiers returned by the backend are shown here — no card, bank, or
              gateway-secret details are ever stored or displayed.
            </p>
          </Panel>

          <Panel>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-800">Shipment</h2>
              <div className="flex flex-wrap gap-2">
                {shipment && (
                  <Button
                    variant="secondary"
                    onClick={handleRefreshTracking}
                    disabled={shipmentActionLoading !== ""}
                    aria-busy={shipmentActionLoading === "refresh" || undefined}
                  >
                    {shipmentActionLoading === "refresh" ? "Refreshing…" : "Refresh Tracking"}
                  </Button>
                )}
                {canCreateShipment && (
                  <Button
                    variant="primary"
                    onClick={handleCreateShipment}
                    disabled={shipmentActionLoading !== ""}
                    aria-busy={shipmentActionLoading === "create" || undefined}
                  >
                    {shipmentActionLoading === "create" ? "Creating…" : "Create Shipment"}
                  </Button>
                )}
                {canCancelShipment && (
                  <Button
                    variant="dangerOutline"
                    onClick={openCancelDialog}
                    disabled={shipmentActionLoading !== ""}
                  >
                    Cancel Shipment
                  </Button>
                )}
              </div>
            </div>

            {shipmentActionError && <ErrorState message={shipmentActionError} className="mb-4" />}

            {shipment ? (
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-gray-500">Shipment Status</dt>
                  <dd className="mt-1">
                    <Badge tone={statusTone(shipment.status)}>{formatEnumLabel(shipment.status)}</Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Courier</dt>
                  <dd className="font-medium text-gray-900">{shipment.courierPartner || "N/A"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Tracking ID</dt>
                  <dd className="font-mono text-xs font-medium text-gray-900">
                    {shipment.trackingId || "Not yet assigned"}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Payment Mode</dt>
                  <dd className="font-medium text-gray-900">{shipment.paymentMode || "N/A"}</dd>
                </div>
                {shipment.paymentMode === "COD" && (
                  <div>
                    <dt className="text-gray-500">COD Amount</dt>
                    <dd className="font-medium text-gray-900">{formatCurrency(shipment.codAmount)}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-gray-500">Last Known Location</dt>
                  <dd className="font-medium text-gray-900">{shipment.lastLocation || "—"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Estimated Delivery</dt>
                  <dd className="font-medium text-gray-900">
                    {formatDateTime(shipment.estimatedDeliveryDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Last Synced</dt>
                  <dd className="font-medium text-gray-900">{formatDateTime(shipment.lastSyncedAt)}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-gray-500">
                {order.status === "confirmed"
                  ? "No shipment has been created for this order yet."
                  : "No shipment exists for this order."}
              </p>
            )}
          </Panel>
        </div>
      )}

      <ConfirmDialog
        open={cancelling}
        title="Cancel this shipment?"
        message="This will cancel the shipment with the courier and mark the order as cancelled. This can't be undone from here."
        error={cancelError}
        confirmLabel="Cancel Shipment"
        confirmVariant="danger"
        isConfirming={cancelSubmitting}
        onConfirm={handleCancelShipment}
        onCancel={() => {
          if (!cancelSubmitting) {
            setCancelling(false);
            setCancelError("");
          }
        }}
      >
        <label htmlFor="cancel-shipment-reason" className="block text-sm font-medium text-gray-700">
          Reason (optional)
        </label>
        <textarea
          id="cancel-shipment-reason"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          disabled={cancelSubmitting}
          rows={2}
          className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
      </ConfirmDialog>
    </>
  );
};

export default OrderViewPage;
