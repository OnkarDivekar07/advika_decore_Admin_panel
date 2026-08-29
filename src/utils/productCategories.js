// src/utils/productCategories.js
//
// The real Advika Auto storefront category taxonomy — mirrors
// frontend-improved/src/config/advikaAuto.js's CATEGORIES export (plain
// labels only, since Product.category is a free-text String[] on the
// backend schema and this admin panel only ever needs the label strings,
// not the storefront's icon/chip/voltageRelevant metadata).
//
// Replaced with the real decoration-accessory taxonomy (from the
// reference screenshots) that HomePage/ProductListingPage/VehiclePage
// already browse by — the previous 7-item functional-parts list
// ('Horns & Air', 'Electrical & Wiring', ...) matched nothing a customer
// can actually click through to on the live storefront.
export const PRODUCT_CATEGORIES = [
  'Lights',
  'Steering Cover',
  'Tassels & Hangings',
  'Rubber & Matting',
  'Garland, Vine & Flag',
  'Cloth Decoration',
  'Fan, Charger & Horn',
  'Useful Items',
  'Mirror & Wheel Cap',
];

// Mirrors backend/src/modules/product/product.validation.js's
// VOLTAGE_REQUIRED_CATEGORIES exactly, which itself mirrors
// frontend-improved/src/config/advikaAuto.js's per-category
// `voltageRelevant` flag — used to decide when the voltage field is
// required client-side, so the same rule the backend enforces
// server-side is visible to the admin before they submit, not just after
// a 422 comes back.
export const VOLTAGE_REQUIRED_CATEGORIES = ['Lights'];

// Mirrors backend/src/modules/product/product.validation.js's
// VALID_VOLTAGES exactly.
export const VALID_VOLTAGES = ['12V', '24V', '12V/24V'];

// Mirrors backend/src/modules/product/product.validation.js's
// VALID_UNITS exactly — the selling unit shown as a "/unit" suffix next
// to the price on the product detail page (e.g. "₹10/pc").
export const VALID_UNITS = ['pc', 'dozen', 'jodi'];
