import React, { useEffect, useState } from "react";
import apiClient from "../../api/apiClient";
import ErrorState from "../../layout/ErrorState";

const categoryOptions = ["Truck", "Tempo", "Pickup", "Car", "Two Wheeler", "Tractor"];

const ProductForm = ({ initialData = null, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    category: [],
    brand: "",
    price: "",
    stock: "",
    description: "",
    isNewArrival: false,
  });

  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        category: initialData.category || [],
        brand: initialData.brand || "",
        price: initialData.price || "",
        stock: initialData.stock || "",
        description: initialData.description || "",
        isNewArrival: initialData.isNewArrival || false,
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = (e) => {
    setImages([...e.target.files]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setError("");

    try {
      const form = new FormData();
      Object.entries(formData).forEach(([key, val]) => {
        if (key === "category") {
          // The backend (product.controller.js's createProduct/updateProduct)
          // only ever reads a single `req.body.category` field. If it isn't
          // already an array (which multipart/form-data never produces —
          // multer/busboy does NOT do bracket-notation array parsing the way
          // urlencoded/qs does), it splits that field on commas. So this
          // MUST be sent as one comma-joined string field, not repeated
          // `category[]` fields (which silently never reach req.body.category
          // at all and previously made every category selection a no-op).
          form.append("category", val.join(","));
        } else {
          form.append(key, val);
        }
      });

      images.forEach((image) => {
        form.append("images", image);
      });

      const endpoint = initialData
        ? `/api/products/${initialData.id}`
        : `/api/products`;

      // Create is POST; update is PATCH (see product.routes.js — there is no
      // PUT route registered, only PATCH, so using PUT here 404'd on every
      // edit).
      const method = initialData ? "patch" : "post";

      const response = await apiClient({
        method,
        url: endpoint,
        data: form,
      });

      // Both create and update are processed asynchronously on the backend
      // (product.service.js queues an image-processing job and returns only
      // { jobId } — there is no job-status endpoint to poll yet). So we
      // can't truthfully claim the product is live immediately; we tell the
      // admin it's queued and refresh the list after a short delay so it
      // has a realistic chance of showing up.
      const jobId = response.data?.data?.jobId;
      alert(
        initialData
          ? `Update queued (job ${jobId || 'pending'}). It may take a few seconds to appear.`
          : `Product queued for creation (job ${jobId || 'pending'}). It may take a few seconds to appear in the list.`
      );

      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (err) {
      console.error("Upload failed:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Error uploading product.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded shadow max-w-xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">
        {initialData ? "Edit Product" : "Add New Product"}
      </h2>

      {error && <ErrorState message={error} />}

      <input
        type="text"
        name="name"
        placeholder="Product Name"
        value={formData.name}
        onChange={handleChange}
        required
        className="w-full p-2 border rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      />

      <label className="block font-medium text-gray-700 mb-2">Select Categories</label>
      <div className="grid grid-cols-2 gap-2">
        {categoryOptions.map((cat) => (
          <label key={cat} className="flex items-center space-x-2">
            <input
              type="checkbox"
              value={cat}
              checked={formData.category.includes(cat)}
              onChange={(e) => {
                const selected = [...formData.category];
                if (e.target.checked) {
                  selected.push(cat);
                } else {
                  const index = selected.indexOf(cat);
                  if (index > -1) selected.splice(index, 1);
                }
                setFormData((prev) => ({ ...prev, category: selected }));
              }}
            />
            <span>{cat}</span>
          </label>
        ))}
      </div>

      <input
        type="text"
        name="brand"
        placeholder="Brand"
        value={formData.brand}
        onChange={handleChange}
        className="w-full p-2 border rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      />

      <input
        type="number"
        name="price"
        placeholder="Price"
        value={formData.price}
        onChange={handleChange}
        required
        className="w-full p-2 border rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      />

      <input
        type="number"
        name="stock"
        placeholder="Stock Quantity"
        value={formData.stock}
        onChange={handleChange}
        className="w-full p-2 border rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      />

      <textarea
        name="description"
        placeholder="Product Description"
        value={formData.description}
        onChange={handleChange}
        className="w-full p-2 border rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      ></textarea>

      <label className="block">
        <input
          type="checkbox"
          name="isNewArrival"
          checked={formData.isNewArrival}
          onChange={handleChange}
          className="mr-2"
        />
        New Arrival?
      </label>

      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageChange}
        className="w-full p-2 border rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      />

      <div className="flex gap-4 mt-4">
        <button
          type="submit"
          disabled={uploading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {uploading ? "Uploading..." : initialData ? "Update Product" : "Add Product"}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
