// e2e-real/support/realApi.js
//
// Same real-HTTP-only contract as frontend-improved/e2e-real/support/realApi.js
// (see that file's header comment for the full rationale) — duplicated
// rather than shared across packages because admin_panel_fixed is a
// CommonJS project (package.json has no "type": "module", unlike
// frontend-improved) and this needs to be `require()`-able the same way
// the existing e2e/support/mockApi.js already is. Nothing here uses
// page.route()/route.fulfill() — every call is a genuine HTTP request to
// the real backend (backend 2.0, `npm run e2e:server`, port 5001).
const API_BASE = process.env.E2E_REAL_API_URL || 'http://localhost:5001';

async function request(method, path, { token, body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, body: json };
}

const realApi = {
  API_BASE,
  get: (path, token) => request('GET', path, { token }),
  post: (path, body, token) => request('POST', path, { token, body }),
  patch: (path, body, token) => request('PATCH', path, { token, body }),
  del: (path, token) => request('DELETE', path, { token }),

  adminLogin: (email, password) =>
    request('POST', '/api/admin/login', { body: { email, password } }),
  getOrders: (query, token) =>
    request('GET', `/api/orders/all${query ? `?${query}` : ''}`, { token }),
  getOrder: (id, token) => request('GET', `/api/orders/${id}`, { token }),
  getInventory: (productId, token) =>
    request('GET', `/api/inventory/${productId}`, { token }),
  patchInventory: (productId, body, token) =>
    request('PATCH', `/api/inventory/${productId}`, { token, body }),
  getProduct: (id) => request('GET', `/api/products/${id}`),
  // Real multipart POST /api/products with ZERO image files. NOTE: unlike
  // what product.validation.js's express-validator rules alone suggest,
  // the real backend genuinely rejects this with 400 "No images uploaded"
  // (confirmed against the real server — the check lives in
  // product.service.js's queueProductCreation, not the validator chain) —
  // so this helper is NOT usable to work around the broken AWS
  // credentials in this environment (see the final report's "AWS
  // credentials" note); tests needing a real product without going
  // through the S3 pipeline use one of the real seeded catalog products
  // instead. Left in place since it's still useful for asserting the
  // real "no images" rejection itself.
  async createProductNoImage(fields, token) {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      form.append(key, String(value));
    }
    const res = await fetch(`${API_BASE}/api/products`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, body };
  },
  // See frontend-improved/e2e-real/support/realApi.js's identical helper —
  // the real address validator requires E.164 phone format
  // (+91[6-9]\d{9}); the real UI formats this itself, this direct-API
  // helper does the same so callers can pass plain 10-digit numbers.
  createAddress: (address, token) =>
    request('POST', '/api/user/address', {
      token,
      body: {
        ...address,
        phone: address.phone.startsWith('+91') ? address.phone : `+91${address.phone}`,
      },
    }),
  getProductJobStatus: (jobId, token) =>
    request('GET', `/api/products/jobs/${jobId}`, { token }),
  createShipment: (orderId, token) =>
    request('POST', `/api/shipping/${orderId}/create`, { token }),
  // PUT /api/cart SETS the line's quantity (upsert), confirmed against the
  // real backend — see frontend-improved/e2e-real/support/realApi.js's
  // identical helper for the full explanation.
  addToCart: (productId, quantity, token) =>
    request('PUT', '/api/cart', { token, body: { productId, quantity } }),
  createDraftOrder: (selectedAddressId, token) =>
    request('POST', '/api/order', { token, body: { selectedAddressId } }),
  placeCodOrder: (orderId, token) =>
    request('POST', '/api/payment/cod', { token, body: { orderId, method: 'cod' } }),

  // See frontend-improved/e2e-real/support/realApi.js's identical helper
  // for why the +91 prefix is added here — the real /api/otp/* validators
  // require E.164 format; only the real LoginPage UI formats it for you.
  async loginCustomer(phone, otp) {
    const e164 = phone.startsWith('+91') ? phone : `+91${phone}`;
    await request('POST', '/api/otp/send-otp', { body: { phone: e164 } });
    const verify = await request('POST', '/api/otp/verify-otp', {
      body: { phone: e164, otp },
    });
    return verify.body?.data?.token;
  },
};

module.exports = realApi;
