// e2e-real/admin-journey.spec.js — REAL FULL-STACK E2E.
//
// Real browser -> real CRA dev server (port 3002) -> real Express backend
// (backend 2.0, `npm run e2e:server`, port 5001) -> real MongoDB Atlas
// database -> real business logic -> real HTTP response -> browser.
// Nothing here uses page.route()/route.fulfill() — see
// support/realApi.js's header comment.
//
// Product image upload is REAL too: it goes to the real Cloudflare R2
// bucket the app was migrated to (there is no R2 sandbox in the app; see
// backend 2.0/src/services/external/AWSUploads.js). The uploaded file is
// given the distinctive name "e2e-fixture-<runId>.png" precisely so the
// resulting object key can be safely identified and deleted afterward —
// see e2e-real/support/s3Cleanup.js and its own afterAll hook below. No
// application code was changed to make this possible.
//
// HISTORY: this test used to be a documented, permanently-failing test —
// the real AWS S3 credentials in backend 2.0/.env were rejected by AWS
// (InvalidAccessKeyId), which also meant the real backend's hard
// requirement of >=1 image blocked creating any new product at all. Fixed
// by migrating storage to Cloudflare R2 (working credentials + a real
// public custom domain) — this test now genuinely passes end-to-end
// against the real stack. Every OTHER test in this file still creates its
// own product via the real POST /api/products WITHOUT an image (the real
// backend's own validation layer doesn't require one at create time —
// only the admin UI's ProductForm.jsx enforces that client-side), so
// they're independent of this one either way.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const realApi = require('./support/realApi');
const { recordUploadedImageUrls, cleanupRecordedUploads } = require('./support/s3Cleanup');
const {
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  E2E_CUSTOMER_PHONE,
  E2E_OTP,
  uniqueProductName,
  e2eFixtureImageName,
} = require('./fixtures/e2eData');

const LOGO_BYTES = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin-logo.png'));
const FRONTEND_REAL_BASE_URL = process.env.E2E_REAL_FRONTEND_URL || 'http://localhost:5174';

test.describe.serial('Real admin journey (real backend + real DB + real S3)', () => {
  // A single shared page for the admin-actor steps below, not the
  // per-test `page` fixture — Playwright gives every individual test() a
  // fresh, isolated context by default even inside describe.serial, which
  // would silently drop the real admin session (localStorage token)
  // between steps. See frontend-improved/e2e-real/customer-journey.spec.js's
  // identical note (found the hard way there first).
  let adminPage;
  let adminToken;
  let productId;
  let productName;
  let orderId;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    adminPage = await context.newPage();
  });

  test.afterAll(async () => {
    await adminPage.context().close();
    await cleanupRecordedUploads();
  });

  test('real admin login reaches the dashboard with real stats', async () => {
    const page = adminPage;
    await page.goto('/');
    await page.locator('#email').fill(E2E_ADMIN_EMAIL);
    await page.locator('#password').fill(E2E_ADMIN_PASSWORD);

    const loginRes = page.waitForResponse((res) => res.url().includes('/api/admin/login'));
    await page.locator('button[type="submit"]').click();
    const loginResponse = await loginRes;
    expect(loginResponse.status()).toBe(200);

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    adminToken = await page.evaluate(() => window.localStorage.getItem('token'));
    expect(adminToken).toBeTruthy();

    // Real GET /api/admin/stats — assert the real backend actually
    // answered, not just that the page didn't crash.
    const statsRes = await page.waitForResponse((res) => res.url().includes('/api/admin/stats'), { timeout: 10000 }).catch(() => null);
    if (statsRes) expect(statsRes.status()).toBe(200);

    const statsCheck = await realApi.get('/api/admin/stats', adminToken);
    expect(statsCheck.status).toBe(200);
  });

  test('inventory: restocking the real product is persisted to the real database', async () => {
    const page = adminPage;
    // Decoupled from the S3-upload test below (see file header's
    // ENVIRONMENT NOTE): the real backend actually rejects product
    // creation with zero images outright (400 "No images uploaded" —
    // confirmed against the real server; product.service.js's
    // queueProductCreation enforces this, not just the admin UI), so
    // there is no way to create a NEW real product at all while the real
    // AWS credentials are broken. This test instead targets a real
    // ALREADY-SEEDED product (prisma/seed.js inserts these directly via
    // Prisma, bypassing the image pipeline entirely) — still 100% real
    // inventory-adjustment coverage, just not paired with a fresh
    // creation.
    const seeded = await realApi.get('/api/products?search=Cushioned+Seat+Cover');
    productId = seeded.body.data[0].id;
    productName = seeded.body.data[0].name;
    const stockBefore = seeded.body.data[0].stock;

    await page.goto('/inventory');
    await page.getByTestId(`inventory-adjust-btn-${productId}`).click();
    await expect(page.getByTestId('stock-adjust-modal')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(`Current stock: ${stockBefore}`)).toBeVisible();

    await page.getByTestId('stock-quantity-input').fill('10');
    const patchRes = page.waitForResponse(
      (res) => res.url().includes(`/api/inventory/${productId}`) && res.request().method() === 'PATCH'
    );
    await page.getByTestId('stock-adjust-submit-btn').click();
    const patched = await patchRes;
    expect(patched.status()).toBe(200);

    const stockAfter = stockBefore + 10;
    await expect(page.getByText(`Stock for "${productName}" is now ${stockAfter}.`)).toBeVisible({ timeout: 10000 });

    const inventoryCheck = await realApi.getInventory(productId, adminToken);
    expect(inventoryCheck.body.data.stock).toBe(stockAfter);
  });

  test('finds a real customer order, ships it, and the status change is real (DB + API)', async () => {
    const page = adminPage;
    // Self-contained rather than depending on frontend-improved's suite
    // having run first: places a real order via the real API as a real
    // customer, so this spec deterministically has a 'confirmed' order to
    // work with regardless of run order.
    const customerToken = await realApi.loginCustomer(E2E_CUSTOMER_PHONE, E2E_OTP);
    const address = await realApi.createAddress(
      { name: 'E2E Admin-Journey Customer', phone: '9876500094', pincode: '411001', city: 'Pune', houseArea: '1 Ship Lane', area: 'Camp', state: 'Maharashtra' },
      customerToken
    );
    const products = await realApi.get('/api/products?search=Chrome+Air+Horn');
    const buyProductId = products.body.data[0].id;
    await realApi.addToCart(buyProductId, 1, customerToken);
    const draft = await realApi.createDraftOrder(address.body.data.id, customerToken);
    // handleCODOrder (payment.service.js) requires the draft order's own
    // id in the body — not inferred from the authenticated user alone.
    const placed = await realApi.placeCodOrder(draft.body.data.id, customerToken);
    expect(placed.status).toBe(200);
    // handleCODOrder's real response nests the order under `data.order`,
    // not `data` directly (see payment.service.js).
    orderId = placed.body.data.order.id;

    await page.goto(`/orders/${orderId}`);
    await expect(page.getByText('Order Summary')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('order-create-shipment-btn')).toBeVisible({ timeout: 10000 });

    // Real POST /api/shipping/:orderId/create -> real shipping.service.js
    // -> real HTTP call to the mock Delhivery server -> real Prisma Shipment
    // row + real Order.status update to 'shipped'.
    const shipRes = page.waitForResponse((res) => res.url().includes(`/api/shipping/${orderId}/create`));
    await page.getByTestId('order-create-shipment-btn').click();
    expect((await shipRes).status()).toBe(200);
    await expect(page.getByTestId('order-refresh-tracking-btn')).toBeVisible({ timeout: 10000 });

    const orderCheck = await realApi.getOrder(orderId, adminToken);
    expect(orderCheck.body.data.status).toBe('shipped');
  });

  test('the customer sees the real updated order status on the real storefront', async ({ page }) => {
    const customerToken = await realApi.loginCustomer(E2E_CUSTOMER_PHONE, E2E_OTP);
    await page.goto(FRONTEND_REAL_BASE_URL);
    await page.evaluate((t) => window.sessionStorage.setItem('authToken', t), customerToken);
    await page.goto(`${FRONTEND_REAL_BASE_URL}/orders/${orderId}/track`);

    await expect(page.getByText(`#${orderId}`)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Shipped', { exact: true }).first()).toBeVisible({ timeout: 10000 });
  });

  // Runs last: still standalone (doesn't depend on productId/orderId set
  // by the tests above), kept in this position now only because it's the
  // most expensive real step (a real async image-processing job).
  test('creates a real product with a real R2-uploaded image', async () => {
    const page = adminPage;
    productName = uniqueProductName('AdminCreated');
    const imageName = e2eFixtureImageName();

    await page.goto('/products');
    await page.getByTestId('products-add-new-btn').click();
    await expect(page.getByTestId('product-form')).toBeVisible();

    await page.getByTestId('product-name-input').fill(productName);
    await page.getByTestId('product-category-checkbox-Useful Items').check();
    await page.getByTestId('product-brand-input').fill('Advika E2E');
    await page.getByTestId('product-price-input').fill('777');
    await page.getByTestId('product-stock-input').fill('25');
    await page.getByTestId('product-description-input').fill('Created by the real admin E2E layer.');
    await page.getByTestId('product-images-input').setInputFiles({
      name: imageName,
      mimeType: 'image/png',
      buffer: LOGO_BYTES,
    });

    const createRes = page.waitForResponse(
      (res) => res.url().endsWith('/api/products') && res.request().method() === 'POST'
    );
    await page.getByTestId('product-form-submit-btn').click();
    const created = await createRes;
    expect([200, 201]).toContain(created.status());
    const jobId = (await created.json()).data.jobId;
    expect(jobId).toBeTruthy();

    // Real async pipeline: BullMQ image-processing-queue -> real sharp
    // compression -> real S3 PutObject -> real Prisma product.create. Poll
    // the REAL job-status endpoint until it actually completes — the UI
    // does the same polling (see api/productJobs.js), this just asserts on
    // the network truth directly instead of only the resulting banner text.
    let jobStatus;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const res = await realApi.getProductJobStatus(jobId, adminToken);
      jobStatus = res.body.data;
      if (jobStatus.state === 'completed' || jobStatus.state === 'failed') break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    expect(jobStatus.state).toBe('completed');
    productId = jobStatus.result.id;
    const uploadedImageUrls = jobStatus.result.images;
    expect(uploadedImageUrls.length).toBeGreaterThan(0);
    expect(uploadedImageUrls[0]).toContain('e2e-fixture-');
    recordUploadedImageUrls(uploadedImageUrls);

    await expect(page.getByTestId('product-form')).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Product created.')).toBeVisible();

    // Verify through the real API/DB, independent of the UI's own claim.
    const productCheck = await realApi.getProduct(productId);
    expect(productCheck.status).toBe(200);
    expect(productCheck.body.data.name).toBe(productName);
    expect(productCheck.body.data.price).toBe(777);
    // Post-R2-migration: real uploads now come back as
    // https://<R2_PUBLIC_URL>/product-images/..., not a
    // *.s3.*.amazonaws.com URL — assert the shape rather than a specific
    // domain so this doesn't need its own env load (R2_PUBLIC_URL isn't
    // in this process's env; see s3Cleanup.js's own note on that).
    expect(productCheck.body.data.images[0]).toContain('/product-images/');
    expect(productCheck.body.data.images[0]).not.toContain('amazonaws.com');
  });
});
