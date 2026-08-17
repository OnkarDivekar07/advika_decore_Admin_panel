import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../api/apiClient";
import PageHeader from "../layout/PageHeader";
import Panel from "../layout/Panel";
import LoadingState from "../layout/LoadingState";
import ErrorState from "../layout/ErrorState";
import EmptyState from "../layout/EmptyState";
import Badge, { statusTone } from "../layout/Badge";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrders = async () => {
    try {
      setError("");
      setLoading(true);
      // GET /api/order/all responds with { data: [...] } (see
      // backend/src/modules/order/order.controller.js's getOrders) — the
      // orders array lives at response.data.data, not response.data.
      const response = await apiClient.get("/api/order/all");
      setOrders(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleDateString();
  };

  return (
    <>
      <PageHeader title="Orders" description="All orders placed by customers." />

      <Panel>
        {error && <ErrorState message={error} onRetry={fetchOrders} className="mb-4" />}

        {loading ? (
          <LoadingState label="Loading orders…" />
        ) : orders.length === 0 ? (
          <EmptyState icon="shopping-cart" title="No orders yet" description="Orders placed by customers will show up here." />
        ) : (
          <div className="overflow-x-auto">
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
                    Status
                  </th>
                  <th className="hidden px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase md:table-cell">
                    Payment
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">View</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {order.user?.name || "N/A"}
                    </td>
                    <td className="hidden px-6 py-4 whitespace-nowrap text-sm text-gray-500 sm:table-cell">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{typeof order.total === "number" ? order.total.toFixed(2) : "0.00"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Badge tone={statusTone(order.status)}>{order.status}</Badge>
                    </td>
                    <td className="hidden px-6 py-4 whitespace-nowrap text-sm md:table-cell">
                      <Badge tone={statusTone(order.paymentStatus)}>{order.paymentStatus}</Badge>
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
        )}
      </Panel>
    </>
  );
};

export default Orders;
