import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "../api/apiClient";
import PageHeader from "../layout/PageHeader";
import Panel from "../layout/Panel";
import Button from "../layout/Button";
import LoadingState from "../layout/LoadingState";
import ErrorState from "../layout/ErrorState";
import Badge, { statusTone } from "../layout/Badge";

const OrderViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        // GET /api/order/:id responds with { data: {...} } (see
        // backend/src/modules/order/order.controller.js's getOrderById) —
        // the order object lives at response.data.data, not response.data.
        const { data } = await apiClient.get(`/api/order/${id}`);
        setOrder(data.data);
      } catch (err) {
        console.error("Error fetching order:", err);
        if (err.response?.status === 404) {
          setError("Order not found.");
          setTimeout(() => navigate("/orders"), 2000);
        } else {
          setError("Failed to fetch order.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id, navigate]);

  const formatDate = (date) => {
    const d = new Date(date);
    return isNaN(d) ? "Invalid Date" : d.toLocaleString();
  };

  return (
    <>
      <PageHeader
        title={`Order #${id}`}
        actions={
          <Button variant="secondary" onClick={() => navigate("/orders")}>
            <i className="fas fa-arrow-left" aria-hidden="true"></i>
            Back to Orders
          </Button>
        }
      />

      {loading && <LoadingState label="Loading order…" />}
      {error && <ErrorState message={error} />}

      {!loading && !error && order && (
        <div className="space-y-6">
          <Panel>
            <h2 className="mb-3 text-lg font-semibold text-gray-800">Order Summary</h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">Order ID</dt>
                <dd className="font-medium text-gray-900">{order.id}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Customer</dt>
                <dd className="font-medium text-gray-900">{order.user?.name || "N/A"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Date</dt>
                <dd className="font-medium text-gray-900">{formatDate(order.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Total</dt>
                <dd className="font-medium text-gray-900">₹{order.total?.toFixed(2) || "0.00"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Status</dt>
                <dd className="mt-1"><Badge tone={statusTone(order.status)}>{order.status}</Badge></dd>
              </div>
              <div>
                <dt className="text-gray-500">Payment Status</dt>
                <dd className="mt-1"><Badge tone={statusTone(order.paymentStatus)}>{order.paymentStatus}</Badge></dd>
              </div>
            </dl>
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
                  <dd className="font-medium text-gray-900">{order.address.houseArea}</dd>
                </div>
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
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase text-xs">Product</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase text-xs">Quantity</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase text-xs">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {order.orderItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2">{item.product?.name || "N/A"}</td>
                        <td className="px-4 py-2">{item.quantity}</td>
                        <td className="px-4 py-2">₹{item.price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

        </div>
      )}
    </>
  );
};

export default OrderViewPage;
