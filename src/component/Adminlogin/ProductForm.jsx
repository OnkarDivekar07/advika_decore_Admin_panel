import React, { useEffect, useRef, useState } from "react";
import apiClient from "../../api/apiClient";
import { waitForProductJob } from "../../api/productJobs";
import ErrorState from "../../layout/ErrorState";
import Button from "../../layout/Button";

const categoryOptions = ["Truck", "Tempo", "Pickup", "Car", "Two Wheeler", "Tractor"];

// Mirrors backend/src/modules/product/product.validation.js so obviously
// invalid input is caught before a round trip — but this is a UX
// convenience only. The backend re-validates everything server-side and
// is the actual source of truth; see the field-level error handling below
// for how a 422 from the backend is still surfaced even if this
// client-side pass missed something (or the rules drift out of sync).
const validateClientSide = (formData, images, isEditing) => {
  const errors = {};

  if (!formData.name.trim()) {
    errors.name = "Product name is required";
  } else if (formData.name.trim().length < 2 || formData.name.trim().length > 100) {
    errors.name = "Product name must be 2 to 100 characters";
  }

  if (!formData.brand.trim()) {
    errors.brand = "Brand is required";
  } else if (formData.brand.trim().length < 2 || formData.brand.trim().length > 50) {
    errors.brand = "Brand must be between 2 and 50 characters";
  }

  const price = Number(formData.price);
  if (formData.price === "" || Number.isNaN(price) || price <= 0) {
    errors.price = "Price must be a number greater than 0";
  }

  const stock = Number(formData.stock);
  if (formData.stock === "" || Number.isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
    errors.stock = "Stock must be a non-negative integer";
  }

  if (!formData.description.trim()) {
    errors.description = "Description is required";
  }

  if (!formData.category || formData.category.length === 0) {
    errors.category = "At least one category is required";
  }

  // The backend hard-requires at least one image on create (see
  // product.service's validateMultipleImages, which the create route
  // calls unconditionally) — an update is allowed to keep existing
  // images, so this only applies when adding a new product.
  if (!isEditing && images.length === 0) {
    errors.images = "At least one product image is required";
  }

  return errors;
};

const ProductForm = ({ initialData = null, onClose, onSuccess }) => {
  const isEditing = Boolean(initialData);

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
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  // Three distinct phases so the button/label always reflects what's
  // actually happening: the multipart upload itself, then (once the
  // backend has queued the job) waiting for imageWorker to finish writing
  // the product — see api/productJobs.js.
  const [phase, setPhase] = useState("idle"); // 'idle' | 'uploading' | 'processing' | 'done'

  // Guards against a double form submission (double-click, or Enter fired
  // twice) beyond what disabling the button already does — the disabled
  // state only takes effect after a render, so a synchronous second
  // invocation between click and re-render could still slip through
  // without this.
  const submittingRef = useRef(false);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);
  const headingRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  // This form appears/disappears inline on the Products page rather than
  // in a dialog (see Products.jsx), so nothing else moves focus into it —
  // without this, a keyboard/screen-reader admin who just activated "Add
  // Product"/"Edit" has no indication the form appeared at all.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        category: initialData.category || [],
        brand: initialData.brand || "",
        price: initialData.price ?? "",
        stock: initialData.stock ?? "",
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
    // Clear that field's error the moment the admin edits it, rather than
    // leaving a stale error visible after they've already fixed it.
    setFieldErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  };

  const handleImageChange = (e) => {
    setImages([...e.target.files]);
    setFieldErrors((prev) => (prev.images ? { ...prev, images: undefined } : prev));
  };

  const isBusy = phase === "uploading" || phase === "processing";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;

    const clientErrors = validateClientSide(formData, images, isEditing);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setError("Please fix the highlighted fields.");
      return;
    }

    submittingRef.current = true;
    setError("");
    setFieldErrors({});
    setUploadProgress(0);
    setPhase("uploading");

    const controller = new AbortController();
    abortControllerRef.current = controller;

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
        signal: controller.signal,
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          if (isMountedRef.current) setUploadProgress(pct);
        },
      });

      const jobId = response.data?.data?.jobId;

      if (!jobId) {
        // Defensive: the backend contract always returns a jobId for
        // create/update, but never silently claim success if it didn't.
        throw new Error("The server did not return a job id to track.");
      }

      if (isMountedRef.current) setPhase("processing");

      const jobStatus = await waitForProductJob(jobId, { signal: controller.signal });

      if (!isMountedRef.current) return;

      if (jobStatus.state === "failed") {
        setError(
          jobStatus.failedReason ||
            "Product processing failed. Please check the images and try again."
        );
        setPhase("idle");
        return;
      }

      if (jobStatus.state !== "completed") {
        // Still queued/active after ~25s of polling — most likely means
        // the queue is backed up, not that anything failed. Tell the
        // admin the truth instead of pretending it's done.
        setError(
          "Still processing — this is taking longer than expected. The product list will update once it finishes; you can safely close this form."
        );
        setPhase("idle");
        return;
      }

      setPhase("done");
      onSuccess?.(jobStatus.result);
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return;

      console.error("Product save failed:", err.response?.data || err.message);

      const backendErrors = err.response?.data?.errors;
      if (Array.isArray(backendErrors) && backendErrors.length > 0) {
        const mapped = {};
        backendErrors.forEach(({ field, message }) => {
          if (field) mapped[field] = message;
        });
        setFieldErrors(mapped);
        setError(err.response?.data?.message || "Please fix the highlighted fields.");
      } else {
        setError(
          err.response?.data?.message || err.message || "Error saving product. Please try again."
        );
      }
      setPhase("idle");
    } finally {
      submittingRef.current = false;
    }
  };

  const fieldClass = (field) =>
    `w-full p-2 border rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
      fieldErrors[field] ? "border-red-400" : "border-gray-300"
    }`;

  const FieldError = ({ field }) =>
    fieldErrors[field] ? (
      <p id={`product-${field}-error`} className="mt-1 text-sm text-red-600" role="alert">
        {fieldErrors[field]}
      </p>
    ) : null;

  // aria-describedby should only point at an error message that actually
  // exists in the DOM — pointing at an id that isn't there is worse than
  // omitting the attribute, so this returns undefined (not a dangling id)
  // when the field has no current error.
  const describedBy = (field) => (fieldErrors[field] ? `product-${field}-error` : undefined);

  const submitLabel = () => {
    if (phase === "uploading") return `Uploading… ${uploadProgress}%`;
    if (phase === "processing") return "Processing…";
    return isEditing ? "Update Product" : "Add Product";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded shadow max-w-xl mx-auto">
      <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold mb-4 focus:outline-none">
        {isEditing ? "Edit Product" : "Add New Product"}
      </h2>

      {error && <ErrorState message={error} />}

      <div>
        <label htmlFor="product-name" className="mb-1 block text-sm font-medium text-gray-700">
          Product name
        </label>
        <input
          id="product-name"
          type="text"
          name="name"
          placeholder="e.g. Heavy Duty Tarpaulin"
          value={formData.name}
          onChange={handleChange}
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={describedBy("name")}
          className={fieldClass("name")}
        />
        <FieldError field="name" />
      </div>

      <fieldset>
        <legend className="mb-2 block font-medium text-gray-700">Select categories</legend>
        <div className="grid grid-cols-2 gap-2" aria-describedby={describedBy("category")}>
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
                  setFieldErrors((prev) => (prev.category ? { ...prev, category: undefined } : prev));
                }}
              />
              <span>{cat}</span>
            </label>
          ))}
        </div>
        <FieldError field="category" />
      </fieldset>

      <div>
        <label htmlFor="product-brand" className="mb-1 block text-sm font-medium text-gray-700">
          Brand
        </label>
        <input
          id="product-brand"
          type="text"
          name="brand"
          placeholder="e.g. Advika"
          value={formData.brand}
          onChange={handleChange}
          aria-invalid={Boolean(fieldErrors.brand)}
          aria-describedby={describedBy("brand")}
          className={fieldClass("brand")}
        />
        <FieldError field="brand" />
      </div>

      <div>
        <label htmlFor="product-price" className="mb-1 block text-sm font-medium text-gray-700">
          Price (₹)
        </label>
        <input
          id="product-price"
          type="number"
          name="price"
          placeholder="0.00"
          value={formData.price}
          onChange={handleChange}
          step="0.01"
          min="0.01"
          aria-invalid={Boolean(fieldErrors.price)}
          aria-describedby={describedBy("price")}
          className={fieldClass("price")}
        />
        <FieldError field="price" />
      </div>

      <div>
        <label htmlFor="product-stock" className="mb-1 block text-sm font-medium text-gray-700">
          Stock quantity
        </label>
        <input
          id="product-stock"
          type="number"
          name="stock"
          placeholder="0"
          value={formData.stock}
          onChange={handleChange}
          step="1"
          min="0"
          aria-invalid={Boolean(fieldErrors.stock)}
          aria-describedby={describedBy("stock")}
          className={fieldClass("stock")}
        />
        <FieldError field="stock" />
      </div>

      <div>
        <label htmlFor="product-description" className="mb-1 block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="product-description"
          name="description"
          placeholder="Describe the product…"
          value={formData.description}
          onChange={handleChange}
          aria-invalid={Boolean(fieldErrors.description)}
          aria-describedby={describedBy("description")}
          className={fieldClass("description")}
        ></textarea>
        <FieldError field="description" />
      </div>

      <label className="block">
        <input
          type="checkbox"
          name="isNewArrival"
          checked={formData.isNewArrival}
          onChange={handleChange}
          className="mr-2"
        />
        New arrival?
      </label>

      <div>
        <label htmlFor="product-images" className="mb-1 block text-sm font-medium text-gray-700">
          Product images
        </label>
        <input
          id="product-images"
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
          aria-invalid={Boolean(fieldErrors.images)}
          aria-describedby={describedBy("images")}
          className={fieldClass("images")}
        />
        {isEditing && (
          <p className="mt-1 text-xs text-gray-500">
            Leave empty to keep the existing images.
          </p>
        )}
        <FieldError field="images" />
      </div>

      {phase === "uploading" && (
        <div
          className="w-full bg-gray-200 rounded h-2"
          role="progressbar"
          aria-label="Upload progress"
          aria-valuenow={uploadProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="bg-blue-600 h-2 rounded transition-all"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      <div className="flex gap-4 mt-4">
        <Button type="submit" variant="primary" disabled={isBusy} aria-busy={isBusy || undefined}>
          {submitLabel()}
        </Button>

        <Button type="button" variant="secondary" onClick={onClose} disabled={isBusy}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default ProductForm;
