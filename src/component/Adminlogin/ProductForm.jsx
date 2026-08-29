import React, { useEffect, useRef, useState } from "react";
import apiClient from "../../api/apiClient";
import { waitForProductJob } from "../../api/productJobs";
import ErrorState from "../../layout/ErrorState";
import Button from "../../layout/Button";
import {
  PRODUCT_CATEGORIES,
  VOLTAGE_REQUIRED_CATEGORIES,
  VALID_VOLTAGES,
  VALID_UNITS,
} from "../../utils/productCategories";

const categoryOptions = PRODUCT_CATEGORIES;

// Advisory only — mirrors bannerManagemen.jsx's own validateSelectedFile
// (same 5MB ceiling, same image-type check, matching the backend's actual
// multer config: src/config/multer.js's ALLOWED_MIME_TYPES/MAX_UPLOAD_SIZE_MB).
// This form previously had zero client-side image validation at all —
// `accept="image/*"` on the file input isn't enforced by browsers once an
// admin picks "All Files," so a huge or non-image file would run a full
// upload attempt before the backend's own limits finally rejected it.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

const validateSelectedFile = (file) => {
  if (!file.type || !file.type.startsWith("image/")) {
    return `"${file.name}" isn't an image file (JPG, PNG, or WEBP).`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `"${file.name}" is too large — please use files under 5MB.`;
  }
  return "";
};

// Optional numeric fields the backend validates with a plain `.optional()`
// (see backend/src/modules/product/product.validation.js) — express-
// validator's default `.optional()` only skips a field when the key is
// entirely absent from req.body, NOT when it's an empty string. Since
// every value in this form's FormData submission is a string, leaving one
// of these blank and sending `""` would fail `isFloat({ gt: 0 })`/
// `isInt({ min: 0 })` server-side instead of being treated as "not
// provided" — so handleSubmit below omits the key entirely when blank
// rather than sending an empty string.
const OPTIONAL_NUMERIC_FIELDS = new Set(["mrp", "rating", "reviewCount"]);

// "Key: Value" per line -> { Key: "Value", ... }. Kept as a single
// textarea (matching the compact style of the rest of this form) rather
// than a full repeatable key/value row UI — specs are typically a handful
// of short pairs (Wattage, Lumens, IP Rating) an admin types quickly, not
// a large structured dataset.
const parseSpecsText = (text) => {
  const entries = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(":");
      if (idx === -1) return null;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      return key && value ? [key, value] : null;
    })
    .filter(Boolean);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const specsToText = (specs) => {
  if (!specs || typeof specs !== "object") return "";
  return Object.entries(specs)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
};

// Vehicle-compatibility lists, comma- or newline-separated, one textarea
// per voltage — matches the backend's `compatibility` shape:
// { "12V": ["Tata Ace", ...], "24V": ["Tata Signa 4825", ...] }.
const parseVehicleList = (text) =>
  text
    .split(/[,\n]/)
    .map((v) => v.trim())
    .filter(Boolean);

const buildCompatibility = (text12v, text24v) => {
  const compat = {};
  const v12 = parseVehicleList(text12v);
  const v24 = parseVehicleList(text24v);
  if (v12.length > 0) compat["12V"] = v12;
  if (v24.length > 0) compat["24V"] = v24;
  return Object.keys(compat).length > 0 ? compat : undefined;
};

const compatibilityToText = (compat, key) => {
  if (!compat || !Array.isArray(compat[key])) return "";
  return compat[key].join(", ");
};

// Variants are repeatable groups (e.g. "Wattage") each with its own
// options (e.g. "72W" at one price, "100W" at another). Local editing
// state keeps a synthetic `id` per group/option purely for stable React
// keys — it's never sent to the backend, which only wants
// { label, defaultIndex, options: [{ label, price, mrp? }] } per group
// (see product schema's `variants` Json? field). `defaultIndex` is
// always 0 here (first option defaults selected) — the backend doesn't
// require otherwise, and picking a different default is a rare enough
// case to leave for direct API use rather than complicating this UI.
const emptyVariantOption = (id) => ({ id, label: "", price: "", mrp: "" });
const emptyVariantGroup = (id, optionId) => ({
  id,
  label: "",
  options: [emptyVariantOption(optionId)],
});

const buildVariants = (groups) => {
  const result = groups
    .map((g) => ({
      label: g.label.trim(),
      defaultIndex: 0,
      options: g.options
        .filter((o) => o.label.trim() && o.price !== "")
        .map((o) => {
          const opt = { label: o.label.trim(), price: Number(o.price) };
          if (o.mrp !== "") opt.mrp = Number(o.mrp);
          return opt;
        }),
    }))
    .filter((g) => g.label && g.options.length > 0);
  return result.length > 0 ? result : undefined;
};

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

  // --- Advika Auto storefront fields ---------------------------------
  const needsVoltage = formData.category.some((c) =>
    VOLTAGE_REQUIRED_CATEGORIES.includes(c)
  );
  if (needsVoltage && !formData.voltage) {
    errors.voltage = `Voltage is required for ${VOLTAGE_REQUIRED_CATEGORIES.join("/")} products`;
  } else if (formData.voltage && !VALID_VOLTAGES.includes(formData.voltage)) {
    errors.voltage = `Voltage must be one of ${VALID_VOLTAGES.join(", ")}`;
  }

  if (formData.unit && !VALID_UNITS.includes(formData.unit)) {
    errors.unit = `Unit must be one of ${VALID_UNITS.join(", ")}`;
  }

  if (formData.mrp !== "") {
    const mrp = Number(formData.mrp);
    if (Number.isNaN(mrp) || mrp <= 0) {
      errors.mrp = "MRP must be a number greater than 0";
    }
  }

  if (formData.rating !== "") {
    const rating = Number(formData.rating);
    if (Number.isNaN(rating) || rating < 0 || rating > 5) {
      errors.rating = "Rating must be a number between 0 and 5";
    }
  }

  if (formData.reviewCount !== "") {
    const reviewCount = Number(formData.reviewCount);
    if (Number.isNaN(reviewCount) || reviewCount < 0 || !Number.isInteger(reviewCount)) {
      errors.reviewCount = "Review count must be a non-negative integer";
    }
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
    mrp: "",
    voltage: "",
    unit: "",
    isBestSeller: false,
    rating: "",
    reviewCount: "",
  });

  const [specsText, setSpecsText] = useState("");
  const [compat12vText, setCompat12vText] = useState("");
  const [compat24vText, setCompat24vText] = useState("");

  const nextRowIdRef = useRef(0);
  const newRowId = () => `row-${nextRowIdRef.current++}`;
  const [variantGroups, setVariantGroups] = useState([]);

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
        mrp: initialData.mrp ?? "",
        voltage: initialData.voltage || "",
        unit: initialData.unit || "",
        isBestSeller: initialData.isBestSeller || false,
        rating: initialData.rating ?? "",
        reviewCount: initialData.reviewCount ?? "",
      });
      setSpecsText(specsToText(initialData.specs));
      setCompat12vText(compatibilityToText(initialData.compatibility, "12V"));
      setCompat24vText(compatibilityToText(initialData.compatibility, "24V"));
      if (Array.isArray(initialData.variants) && initialData.variants.length > 0) {
        setVariantGroups(
          initialData.variants.map((group) => ({
            id: newRowId(),
            label: group.label || "",
            options: (group.options || []).map((option) => ({
              id: newRowId(),
              label: option.label || "",
              price: option.price ?? "",
              mrp: option.mrp ?? "",
            })),
          }))
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const selected = [...e.target.files];
    for (const file of selected) {
      const message = validateSelectedFile(file);
      if (message) {
        setImages([]);
        setFieldErrors((prev) => ({ ...prev, images: message }));
        e.target.value = ""; // allow re-selecting the same (now-corrected) filename
        return;
      }
    }
    setImages(selected);
    setFieldErrors((prev) => (prev.images ? { ...prev, images: undefined } : prev));
  };

  const addVariantGroup = () => {
    setVariantGroups((prev) => [
      ...prev,
      emptyVariantGroup(newRowId(), newRowId()),
    ]);
  };
  const removeVariantGroup = (groupId) => {
    setVariantGroups((prev) => prev.filter((g) => g.id !== groupId));
  };
  const updateVariantGroupLabel = (groupId, label) => {
    setVariantGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, label } : g))
    );
  };
  const addVariantOption = (groupId) => {
    setVariantGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, options: [...g.options, emptyVariantOption(newRowId())] }
          : g
      )
    );
  };
  const removeVariantOption = (groupId, optionId) => {
    setVariantGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, options: g.options.filter((o) => o.id !== optionId) }
          : g
      )
    );
  };
  const updateVariantOption = (groupId, optionId, field, value) => {
    setVariantGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              options: g.options.map((o) =>
                o.id === optionId ? { ...o, [field]: value } : o
              ),
            }
          : g
      )
    );
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
          return;
        }
        if ((OPTIONAL_NUMERIC_FIELDS.has(key) || key === "voltage" || key === "unit") && val === "") {
          // Omit entirely — see OPTIONAL_NUMERIC_FIELDS' comment above.
          return;
        }
        form.append(key, val);
      });

      const specs = parseSpecsText(specsText);
      if (specs) form.append("specs", JSON.stringify(specs));

      const compatibility = buildCompatibility(compat12vText, compat24vText);
      if (compatibility) form.append("compatibility", JSON.stringify(compatibility));

      const variants = buildVariants(variantGroups);
      if (variants) form.append("variants", JSON.stringify(variants));

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
      <p
        id={`product-${field}-error`}
        className="mt-1 text-sm text-red-600"
        role="alert"
        data-testid={`product-${field}-error`}
      >
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

  const needsVoltage = formData.category.some((c) =>
    VOLTAGE_REQUIRED_CATEGORIES.includes(c)
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-white p-6 rounded shadow max-w-xl mx-auto"
      data-testid="product-form"
    >
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
          data-testid="product-name-input"
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
                data-testid={`product-category-checkbox-${cat}`}
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
          data-testid="product-brand-input"
        />
        <FieldError field="brand" />
      </div>

      <div className="grid grid-cols-2 gap-4">
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
            data-testid="product-price-input"
          />
          <FieldError field="price" />
        </div>

        <div>
          <label htmlFor="product-mrp" className="mb-1 block text-sm font-medium text-gray-700">
            MRP (₹, optional)
          </label>
          <input
            id="product-mrp"
            type="number"
            name="mrp"
            placeholder="Struck-through 'was' price"
            value={formData.mrp}
            onChange={handleChange}
            step="0.01"
            min="0.01"
            aria-invalid={Boolean(fieldErrors.mrp)}
            aria-describedby={describedBy("mrp")}
            className={fieldClass("mrp")}
            data-testid="product-mrp-input"
          />
          <FieldError field="mrp" />
        </div>
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
          data-testid="product-stock-input"
        />
        <FieldError field="stock" />
      </div>

      <div>
        <label htmlFor="product-voltage" className="mb-1 block text-sm font-medium text-gray-700">
          Voltage{needsVoltage ? " (required for this category)" : " (optional)"}
        </label>
        <select
          id="product-voltage"
          name="voltage"
          value={formData.voltage}
          onChange={handleChange}
          aria-invalid={Boolean(fieldErrors.voltage)}
          aria-describedby={describedBy("voltage")}
          className={fieldClass("voltage")}
          data-testid="product-voltage-select"
        >
          <option value="">No voltage (non-electrical part)</option>
          {VALID_VOLTAGES.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <FieldError field="voltage" />
      </div>

      <div>
        <label htmlFor="product-unit" className="mb-1 block text-sm font-medium text-gray-700">
          Selling unit (optional)
        </label>
        <select
          id="product-unit"
          name="unit"
          value={formData.unit}
          onChange={handleChange}
          aria-invalid={Boolean(fieldErrors.unit)}
          aria-describedby={describedBy("unit")}
          className={fieldClass("unit")}
          data-testid="product-unit-select"
        >
          <option value="">No unit (no "/unit" suffix shown)</option>
          <option value="pc">Piece (pc)</option>
          <option value="dozen">Dozen (12 pc)</option>
          <option value="jodi">Jodi / pair (2 pc)</option>
        </select>
        <FieldError field="unit" />
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
          data-testid="product-description-input"
        ></textarea>
        <FieldError field="description" />
      </div>

      <div>
        <label htmlFor="product-specs" className="mb-1 block text-sm font-medium text-gray-700">
          Specifications (optional, one per line as "Key: Value")
        </label>
        <textarea
          id="product-specs"
          name="specs"
          placeholder={"Wattage: 100W\nLumens: 9,000 lm\nIP Rating: IP68"}
          value={specsText}
          onChange={(e) => {
            setSpecsText(e.target.value);
            setFieldErrors((prev) => (prev.specs ? { ...prev, specs: undefined } : prev));
          }}
          rows={4}
          aria-invalid={Boolean(fieldErrors.specs)}
          aria-describedby={describedBy("specs")}
          className={fieldClass("specs")}
          data-testid="product-specs-input"
        ></textarea>
        <FieldError field="specs" />
      </div>

      <fieldset>
        <legend className="mb-1 block text-sm font-medium text-gray-700">
          Vehicle compatibility (optional)
        </legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="product-compat-12v" className="mb-1 block text-xs text-gray-600">
              12V vehicles (comma-separated)
            </label>
            <textarea
              id="product-compat-12v"
              placeholder="Tata Ace, Mahindra Bolero Pickup"
              value={compat12vText}
              onChange={(e) => {
                setCompat12vText(e.target.value);
                setFieldErrors((prev) =>
                  prev.compatibility ? { ...prev, compatibility: undefined } : prev
                );
              }}
              rows={2}
              className={fieldClass("compatibility")}
              data-testid="product-compat-12v-input"
            ></textarea>
          </div>
          <div>
            <label htmlFor="product-compat-24v" className="mb-1 block text-xs text-gray-600">
              24V vehicles (comma-separated)
            </label>
            <textarea
              id="product-compat-24v"
              placeholder="Tata Signa 4825, Ashok Leyland 3718"
              value={compat24vText}
              onChange={(e) => {
                setCompat24vText(e.target.value);
                setFieldErrors((prev) =>
                  prev.compatibility ? { ...prev, compatibility: undefined } : prev
                );
              }}
              rows={2}
              className={fieldClass("compatibility")}
              data-testid="product-compat-24v-input"
            ></textarea>
          </div>
        </div>
        <FieldError field="compatibility" />
      </fieldset>

      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-gray-700">
          Variants (optional — e.g. different wattages at different prices)
        </legend>
        <div className="space-y-3">
          {variantGroups.map((group) => (
            <div key={group.id} className="rounded border border-gray-200 p-3">
              <div className="mb-2 flex items-center gap-2">
                <label htmlFor={`variant-label-${group.id}`} className="sr-only">
                  Variant group name
                </label>
                <input
                  id={`variant-label-${group.id}`}
                  type="text"
                  placeholder="e.g. Wattage"
                  value={group.label}
                  onChange={(e) => updateVariantGroupLabel(group.id, e.target.value)}
                  className="w-full p-2 border rounded border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  data-testid={`variant-group-label-input-${group.id}`}
                />
                <Button
                  type="button"
                  variant="dangerOutline"
                  onClick={() => removeVariantGroup(group.id)}
                  aria-label={`Remove variant group${group.label ? ` ${group.label}` : ""}`}
                  data-testid={`variant-group-remove-btn-${group.id}`}
                >
                  Remove
                </Button>
              </div>
              <div className="space-y-2">
                {group.options.map((option) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Option label (e.g. 72W)"
                      value={option.label}
                      onChange={(e) =>
                        updateVariantOption(group.id, option.id, "label", e.target.value)
                      }
                      aria-label="Variant option label"
                      className="flex-1 p-2 border rounded border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      data-testid={`variant-option-label-input-${option.id}`}
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={option.price}
                      onChange={(e) =>
                        updateVariantOption(group.id, option.id, "price", e.target.value)
                      }
                      step="0.01"
                      min="0.01"
                      aria-label="Variant option price"
                      className="w-28 p-2 border rounded border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      data-testid={`variant-option-price-input-${option.id}`}
                    />
                    <input
                      type="number"
                      placeholder="MRP"
                      value={option.mrp}
                      onChange={(e) =>
                        updateVariantOption(group.id, option.id, "mrp", e.target.value)
                      }
                      step="0.01"
                      min="0.01"
                      aria-label="Variant option MRP"
                      className="w-28 p-2 border rounded border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      data-testid={`variant-option-mrp-input-${option.id}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeVariantOption(group.id, option.id)}
                      aria-label="Remove this option"
                      disabled={group.options.length === 1}
                      data-testid={`variant-option-remove-btn-${option.id}`}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => addVariantOption(group.id)}
                  data-testid={`variant-add-option-btn-${group.id}`}
                >
                  + Add option
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={addVariantGroup}
            data-testid="variant-add-group-btn"
          >
            + Add variant group
          </Button>
        </div>
        <FieldError field="variants" />
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="product-rating" className="mb-1 block text-sm font-medium text-gray-700">
            Rating (0–5, optional)
          </label>
          <input
            id="product-rating"
            type="number"
            name="rating"
            value={formData.rating}
            onChange={handleChange}
            step="0.1"
            min="0"
            max="5"
            aria-invalid={Boolean(fieldErrors.rating)}
            aria-describedby={describedBy("rating")}
            className={fieldClass("rating")}
            data-testid="product-rating-input"
          />
          <FieldError field="rating" />
        </div>
        <div>
          <label htmlFor="product-reviewCount" className="mb-1 block text-sm font-medium text-gray-700">
            Review count (optional)
          </label>
          <input
            id="product-reviewCount"
            type="number"
            name="reviewCount"
            value={formData.reviewCount}
            onChange={handleChange}
            step="1"
            min="0"
            aria-invalid={Boolean(fieldErrors.reviewCount)}
            aria-describedby={describedBy("reviewCount")}
            className={fieldClass("reviewCount")}
            data-testid="product-reviewCount-input"
          />
          <FieldError field="reviewCount" />
        </div>
      </div>

      <label className="block">
        <input
          type="checkbox"
          name="isNewArrival"
          checked={formData.isNewArrival}
          onChange={handleChange}
          className="mr-2"
          data-testid="product-isNewArrival-checkbox"
        />
        New arrival?
      </label>

      <label className="block">
        <input
          type="checkbox"
          name="isBestSeller"
          checked={formData.isBestSeller}
          onChange={handleChange}
          className="mr-2"
          data-testid="product-isBestSeller-checkbox"
        />
        Best seller?
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
          data-testid="product-images-input"
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
          data-testid="product-upload-progress"
        >
          <div
            className="bg-blue-600 h-2 rounded transition-all"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      <div className="flex gap-4 mt-4">
        <Button
          type="submit"
          variant="primary"
          disabled={isBusy}
          aria-busy={isBusy || undefined}
          data-testid="product-form-submit-btn"
        >
          {submitLabel()}
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={isBusy}
          data-testid="product-form-cancel-btn"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default ProductForm;
