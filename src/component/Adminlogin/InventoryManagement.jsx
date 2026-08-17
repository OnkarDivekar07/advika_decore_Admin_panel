import React from 'react';

const InventoryManagement = () => {
  const inventoryItems = [
    { product: "Red Sneaker Shoe", sku: "RS-001", stock: 120, reorderLevel: 30 },
    { product: "Black Leather Handbag", sku: "BLH-002", stock: 45, reorderLevel: 10 },
    { product: "Blue Cotton T-Shirt", sku: "BCT-003", stock: 300, reorderLevel: 50 },
    { product: "Silver Wristwatch", sku: "SW-004", stock: 75, reorderLevel: 20 },
    { product: "Green Backpack", sku: "GB-005", stock: 150, reorderLevel: 40 },
  ];

  return (
    <section aria-label="Inventory management" className="bg-white rounded-lg shadow p-6 overflow-x-auto" id="inventory">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Inventory</h2>
      <table className="min-w-full divide-y divide-gray-200" role="table">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Quantity</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder Level</th>
            <th className="relative px-6 py-3"><span className="sr-only">Update</span></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {inventoryItems.map((item, index) => (
            <tr key={index}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.product}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.sku}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.stock}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.reorderLevel}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <a className="text-blue-600 hover:text-blue-900" href="#">
                  Update
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

export default InventoryManagement;