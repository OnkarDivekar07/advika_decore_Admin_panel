// src/component/Adminlogin/Products.jsx
import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";
import ProductForm from "../component/Adminlogin/ProductForm";
import PageHeader from "../layout/PageHeader";
import Panel from "../layout/Panel";
import Button from "../layout/Button";
import LoadingState from "../layout/LoadingState";
import ErrorState from "../layout/ErrorState";
import EmptyState from "../layout/EmptyState";

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [error, setError] = useState("");

  const fetchProducts = async () => {
    try {
      setError("");
      setLoading(true);
      const response = await apiClient.get(`/api/products`);
      setProducts(response.data.data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await apiClient.delete(`/api/products/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Error deleting product:", err);
      alert("Failed to delete product.");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

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

      {showForm && (
        <div className="mb-6">
          <ProductForm
            initialData={editingProduct}
            onClose={() => {
              setShowForm(false);
              setEditingProduct(null);
            }}
            onSuccess={() => {
              setShowForm(false);
              setEditingProduct(null);
              fetchProducts();
            }}
          />
        </div>
      )}

      <Panel>
        {error && <ErrorState message={error} onRetry={fetchProducts} className="mb-4" />}

        {loading ? (
          <LoadingState label="Loading products…" />
        ) : products.length === 0 ? (
          <EmptyState
            icon="box-open"
            title="No products yet"
            description="Add your first product to get started."
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
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
                    <td className="px-6 py-4 text-sm font-medium">{product.name}</td>
                    <td className="hidden px-6 py-4 text-sm text-gray-500 sm:table-cell">{product.brand}</td>
                    <td className="hidden px-6 py-4 text-sm text-gray-500 md:table-cell">{product.category?.join(", ")}</td>
                    <td className="px-6 py-4 text-sm">₹{Number(product.price).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm">{product.stock}</td>
                    <td className="hidden px-6 py-4 text-sm lg:table-cell">
                      {product.isNewArrival ? (
                        <span className="text-green-600 font-semibold">Yes</span>
                      ) : (
                        <span className="text-gray-400">No</span>
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
                          onClick={() => handleDelete(product.id)}
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
        )}
      </Panel>
    </>
  );
};

export default Products;
