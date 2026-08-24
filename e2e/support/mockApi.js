// e2e/support/mockApi.js — Playwright route interception standing in for
// the real backend (see frontend/e2e/support/mockApi.js for the identical
// rationale: no reachable MongoDB in this sandbox; fixtures mirror the
// real backend contracts documented in the E2E test report).
const {
  ADMIN_USER,
  PRODUCTS,
  PRODUCT_1,
  ORDER_1,
  CUSTOMER_1,
  envelope,
  errorEnvelope,
} = require('../fixtures/data');

const API_BASE = process.env.E2E_API_URL || 'http://localhost:5000';

async function json(route, status, body) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function installDefaultMocks(page) {
  // Safety net: abort any request to a real external host instead of
  // letting it go out — this sandbox's network egress is a strict
  // allowlist, and an unlisted host hangs (rather than fails fast) long
  // enough to stall page.goto()/reload() waiting for the 'load' event.
  await page.route(
    (url) => !['localhost', '127.0.0.1'].includes(url.hostname),
    (route) => route.abort()
  );

  // ---- Auth --------------------------------------------------------------
  await page.route(`${API_BASE}/api/admin/login`, async (route) => {
    const body = route.request().postDataJSON();
    if (body?.email !== 'admin@advika.test' || body?.password !== 'correct-password') {
      return json(route, 401, errorEnvelope('Incorrect password'));
    }
    await json(route, 200, envelope({ token: 'fake-admin-jwt-for-e2e', user: ADMIN_USER }));
  });
  await page.route(`${API_BASE}/api/admin/me`, async (route) => {
    await json(route, 200, envelope(ADMIN_USER));
  });

  // ---- Dashboard -----------------------------------------------------------
  await page.route(`${API_BASE}/api/admin/stats`, async (route) => {
    await json(route, 200, envelope({
      totalUsers: 42,
      totalOrders: 128,
      totalProducts: PRODUCTS.length,
      deliveredOrders: 90,
      pendingOrders: 12,
      totalRevenue: 384210,
    }));
  });

  // ---- Products --------------------------------------------------------
  await page.route(`${API_BASE}/api/products?**`, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await json(route, 200, envelope(PRODUCTS, { total: PRODUCTS.length, page: 1, limit: 10, totalPages: 1 }));
  });
  await page.route(`${API_BASE}/api/products`, async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      return json(route, 200, envelope(PRODUCTS, { total: PRODUCTS.length, page: 1, limit: 10, totalPages: 1 }));
    }
    if (method === 'POST') {
      return json(route, 200, envelope({ jobId: 'job_create_1' }));
    }
    return route.fallback();
  });
  await page.route(`${API_BASE}/api/products/jobs/*`, async (route) => {
    await json(route, 200, envelope({ status: 'done', productId: PRODUCT_1.id }));
  });
  await page.route(`${API_BASE}/api/products/*`, async (route) => {
    const method = route.request().method();
    if (method === 'PATCH') return json(route, 200, envelope({ jobId: 'job_update_1' }));
    if (method === 'DELETE') return json(route, 200, envelope(null));
    if (method === 'GET') return json(route, 200, envelope(PRODUCT_1));
    return route.fallback();
  });

  // ---- Orders ------------------------------------------------------------
  await page.route(`${API_BASE}/api/orders/all?**`, async (route) => {
    await json(route, 200, envelope([ORDER_1], { total: 1, page: 1, limit: 20, totalPages: 1 }));
  });
  await page.route(`${API_BASE}/api/orders/${ORDER_1.id}`, async (route) => {
    await json(route, 200, envelope(ORDER_1));
  });

  // ---- Users / customers ---------------------------------------------------
  await page.route(`${API_BASE}/api/admin/users?**`, async (route) => {
    await json(route, 200, envelope([CUSTOMER_1], { total: 1, page: 1, limit: 20, totalPages: 1 }));
  });
  await page.route(`${API_BASE}/api/admin/users/${CUSTOMER_1.id}`, async (route) => {
    await json(route, 200, envelope({
      ...CUSTOMER_1,
      orderSummary: { totalOrders: 1, totalSpent: 2499 },
      recentOrders: [ORDER_1],
      addresses: [],
    }));
  });

  // ---- Inventory -----------------------------------------------------------
  await page.route(`${API_BASE}/api/inventory/low-stock?**`, async (route) => {
    await json(route, 200, envelope([{ ...ORDER_1.orderItems[0].product, ...{} }, { id: 'x', name: 'Low item', stock: 2 }]));
  });
  await page.route(`${API_BASE}/api/inventory/${PRODUCT_1.id}`, async (route) => {
    if (route.request().method() === 'GET') return json(route, 200, envelope({ productId: PRODUCT_1.id, stock: PRODUCT_1.stock }));
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      return json(route, 200, envelope({ productId: PRODUCT_1.id, stock: (PRODUCT_1.stock || 0) + (body.quantity || 0) }));
    }
    return route.fallback();
  });

  // ---- Analytics -----------------------------------------------------------
  await page.route(`${API_BASE}/api/admin/analytics/overview?**`, async (route) => {
    await json(route, 200, envelope({
      grossRevenue: 384210,
      orderCount: 128,
      customerCount: 42,
      productCount: PRODUCTS.length,
      deliveredOrders: 90,
      pendingOrders: 12,
      averageOrderValue: 3001.6,
    }));
  });
  await page.route(`${API_BASE}/api/admin/analytics/revenue-trend?**`, async (route) => {
    await json(route, 200, envelope({
      buckets: [
        { date: '2026-08-01', revenue: 12000 },
        { date: '2026-08-02', revenue: 15400 },
      ],
      range: { granularity: 'day' },
    }));
  });

  // ---- Alerts --------------------------------------------------------------
  await page.route(`${API_BASE}/api/admin/alerts?**`, async (route) => {
    await json(route, 200, envelope({
      lowStock: [PRODUCTS[1]],
      pendingOrders: [],
      paymentExceptions: [],
      shipmentExceptions: [],
    }));
  });

  // ---- Content (banners / new arrivals) -------------------------------------
  await page.route(`${API_BASE}/api/homepage/banners`, async (route) => {
    const method = route.request().method();
    if (method === 'GET') return json(route, 200, envelope([], { total: 0, page: 1, limit: 10, totalPages: 0 }));
    if (method === 'POST') return json(route, 201, envelope({ id: 'banner_1', imageUrl: '/admin-logo.png' }));
    return route.fallback();
  });
  await page.route(`${API_BASE}/api/homepage/banners/*`, async (route) => {
    if (route.request().method() !== 'DELETE') return route.fallback();
    await json(route, 200, envelope(null));
  });
  await page.route(`${API_BASE}/api/homepage/new-arrivals?**`, async (route) => {
    await json(route, 200, envelope([PRODUCT_1], { total: 1, page: 1, limit: 10, totalPages: 1 }));
  });
  await page.route(`${API_BASE}/api/homepage/new-arrivals/*`, async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    await json(route, 200, envelope(null));
  });

  // ---- Shipping (order detail view) -----------------------------------------
  await page.route(`${API_BASE}/api/shipping/*/create`, async (route) => {
    await json(route, 200, envelope({ id: 'ship_1', status: 'created', alreadyProcessed: false }));
  });
  await page.route(`${API_BASE}/api/shipping/*/track`, async (route) => {
    await json(route, 200, envelope({ status: 'in_transit', history: [] }));
  });
  await page.route(`${API_BASE}/api/shipping/*/cancel`, async (route) => {
    await json(route, 200, envelope({ status: 'cancelled' }));
  });

  // ---- Health (Settings page) ------------------------------------------------
  await page.route('**/health', async (route) => {
    await json(route, 200, { status: 'ok', checks: { database: 'ok', redis: 'ok' }, timestamp: new Date().toISOString() });
  });
}

/** Seed a logged-in admin session directly into localStorage, matching
 * src/api/session.js's exact key names ('token' / 'user'). */
async function loginAsAdmin(page, { token = 'fake-admin-jwt-for-e2e', user = ADMIN_USER } = {}) {
  await page.addInitScript(
    ([t, u]) => {
      window.localStorage.setItem('token', t);
      window.localStorage.setItem('user', JSON.stringify(u));
    },
    [token, user]
  );
}

module.exports = { installDefaultMocks, loginAsAdmin, json, API_BASE };
