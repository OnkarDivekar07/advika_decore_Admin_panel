// src/utils/productCategories.js
//
// The real Advika Auto storefront category taxonomy — mirrors
// frontend-improved/src/config/advikaAuto.js's CATEGORIES export (plain
// labels only, since Product.category is a free-text String[] on the
// backend schema and this admin panel only ever needs the label strings,
// not the storefront's icon/chip/voltageRelevant metadata).
//
// ProductForm.jsx and Products.jsx both used to hardcode their own
// `categoryOptions = ["Truck", "Tempo", "Pickup", "Car", "Two Wheeler",
// "Tractor"]` — a leftover from an earlier, pre-redesign schema. Those
// labels match nothing on the live storefront's category browsing (a
// product saved with `category: ["Truck"]` can never surface under
// Lights/Horns/Electrical/etc.), and since the backend's
// VOLTAGE_REQUIRED_CATEGORIES (product.validation.js) is keyed on
// 'Lights'/'Electrical & Wiring', the old list also made it impossible to
// ever select a category that requires a voltage — silently defeating
// that whole validation rule from this UI.
export const PRODUCT_CATEGORIES = [
  'Lights',
  'Horns & Air',
  'Interior & Comfort',
  'Exterior Styling',
  'Electrical & Wiring',
  'Safety & Tools',
  'Spares & Fitting',
];

// Mirrors backend/src/modules/product/product.validation.js's
// VOLTAGE_REQUIRED_CATEGORIES exactly — used to decide when the voltage
// field is required client-side, so the same rule the backend enforces
// server-side is visible to the admin before they submit, not just after
// a 422 comes back.
export const VOLTAGE_REQUIRED_CATEGORIES = ['Lights', 'Electrical & Wiring'];

// Mirrors backend/src/modules/product/product.validation.js's
// VALID_VOLTAGES exactly.
export const VALID_VOLTAGES = ['12V', '24V', '12V/24V'];
