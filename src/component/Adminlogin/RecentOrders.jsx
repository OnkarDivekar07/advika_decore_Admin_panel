import React from 'react';

const RecentOrders = () => {
  const orders = [
    { id: "#1001", customer: "Alice Johnson", date: "2024-06-10", status: "Completed", total: "$250.00" },
    { id: "#1002", customer: "Bob Martin", date: "2024-06-09", status: "Processing", total: "$120.00" },
    { id: "#1003", customer: "Clara Smith", date: "2024-06-08", status: "Cancelled", total: "$0.00" },
    { id: "#1004", customer: "David Johnson", date: "2024-06-07", status: "Completed", total: "$75.00" },
    { id: "#1005", customer: "Emma Stone", date: "2024-06-06", status: "Processing", total: "$180.00" },
  ];

  return (
    <section aria-label="Recent orders" className="bg-white rounded-lg shadow p-6 overflow-x-auto" id="orders">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Orders</h2>
      <table className="min-w-full divide-y divide-gray-200" role="table">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
            <th className="relative px-6 py-3"><span className="sr-only">View</span></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {orders.map((order, index) => (
            <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.date}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === "Completed" ? "bg-green-100 text-green-800" : order.status === "Processing" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
                  {order.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.total}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <a className="text-blue-600 hover:text-blue-900" href="#">View</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

export default RecentOrders;