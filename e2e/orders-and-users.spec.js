// e2e/orders-and-users.spec.js — src/pages/Orders.jsx, orderviewpage.jsx,
// Users.jsx, userviewpage.jsx
const { test, expect } = require('@playwright/test');
const { installDefaultMocks, loginAsAdmin, json, API_BASE } = require('./support/mockApi');
const { ORDER_1, CUSTOMER_1, envelope, errorEnvelope } = require('./fixtures/data');

test.describe('Orders', () => {
  test.beforeEach(async ({ page }) => {
    await installDefaultMocks(page);
    await loginAsAdmin(page);
  });

  test('the orders list renders seeded orders', async ({ page }) => {
    await page.goto('/orders');
    const row = page.getByTestId(`data-row-${ORDER_1.id}`);
    await expect(row).toBeVisible();
    await expect(row).toContainText('₹2499.00');
  });

  test('filtering by order status sends the filter to the backend', async ({ page }) => {
    await page.goto('/orders');
    await expect(page.getByTestId(`data-row-${ORDER_1.id}`)).toBeVisible();

    const requestPromise = page.waitForRequest(
      (req) => req.url().includes('/api/orders/all?') && req.url().includes('status=confirmed')
    );
    await page.getByTestId('orders-status-filter').selectOption('confirmed');
    await requestPromise;

    await expect(page.getByTestId('orders-clear-filters-btn')).toBeVisible();
  });

  test('navigating to an order detail page renders the order info', async ({ page }) => {
    await page.goto('/orders');
    await page.getByTestId(`data-row-${ORDER_1.id}`).getByRole('link', { name: /view/i }).click();

    await expect(page).toHaveURL(`/orders/${ORDER_1.id}`);
    await expect(page.getByText('Order Summary')).toBeVisible();
    await expect(page.getByText(ORDER_1.id, { exact: false }).first()).toBeVisible();
    await expect(page.getByText('₹2499.00', { exact: false }).first()).toBeVisible();
  });

  test('shipment actions: create, refresh tracking, and cancel go through their full lifecycle', async ({ page }) => {
    let shipment = null;

    await page.route(`${API_BASE}/api/orders/${ORDER_1.id}`, async (route) => {
      await json(route, 200, envelope({ ...ORDER_1, shipment }));
    });
    await page.route(`${API_BASE}/api/shipping/${ORDER_1.id}/create`, async (route) => {
      shipment = {
        status: 'PROCESSING',
        courierPartner: 'Delhivery',
        trackingId: 'TRK123456',
        paymentMode: 'PREPAID',
        lastLocation: null,
        estimatedDeliveryDate: null,
        lastSyncedAt: new Date().toISOString(),
      };
      await json(route, 200, envelope({ id: 'ship_1', status: 'created', alreadyProcessed: false }));
    });
    await page.route(`${API_BASE}/api/shipping/${ORDER_1.id}/track`, async (route) => {
      if (shipment) shipment = { ...shipment, status: 'IN_TRANSIT', lastLocation: 'Mumbai Hub' };
      await json(route, 200, envelope({ status: 'in_transit', history: [] }));
    });
    await page.route(`${API_BASE}/api/shipping/${ORDER_1.id}/cancel`, async (route) => {
      if (shipment) shipment = { ...shipment, status: 'CANCELLED' };
      await json(route, 200, envelope({ status: 'cancelled' }));
    });

    await page.goto(`/orders/${ORDER_1.id}`);

    // No shipment yet — only "Create Shipment" is offered (order is
    // 'confirmed' with no shipment).
    await expect(page.getByTestId('order-create-shipment-btn')).toBeVisible();
    await expect(page.getByTestId('order-refresh-tracking-btn')).not.toBeVisible();

    await page.getByTestId('order-create-shipment-btn').click();
    await expect(page.getByTestId('order-refresh-tracking-btn')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('order-cancel-shipment-btn')).toBeVisible();
    await expect(page.getByText('Delhivery')).toBeVisible();
    await expect(page.getByText('TRK123456')).toBeVisible();

    await page.getByTestId('order-refresh-tracking-btn').click();
    await expect(page.getByText('Mumbai Hub')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('order-cancel-shipment-btn').click();
    await expect(page.getByTestId('confirm-dialog')).toBeVisible();
    await page.getByTestId('order-cancel-reason-input').fill('Customer requested cancellation');
    await page.getByTestId('confirm-dialog-confirm-btn').click();

    await expect(page.getByTestId('confirm-dialog')).not.toBeVisible({ timeout: 10000 });
    // A CANCELLED shipment is terminal — the cancel action disappears.
    await expect(page.getByTestId('order-cancel-shipment-btn')).not.toBeVisible();
  });

  test('order detail: a 404 shows the not-found state', async ({ page }) => {
    await page.route(`${API_BASE}/api/orders/${ORDER_1.id}`, async (route) => {
      await json(route, 404, errorEnvelope('Order not found'));
    });

    await page.goto(`/orders/${ORDER_1.id}`);
    await expect(page.getByText('Order not found')).toBeVisible();
    await expect(page.getByText("This order doesn't exist, or the ID in the URL isn't valid.")).toBeVisible();
  });

  // REGRESSION TEST: apiClient.js's global response interceptor used to
  // treat a 403 from ANY authenticated request as a session-invalidation
  // event (clearSession + redirect to '/'), which fired before this
  // page's own `errorKind === 'forbidden'` branch ever got a chance to
  // render — orderviewpage.jsx's dedicated "Access denied" empty state
  // was unreachable. Fixed by having this page's detail fetch opt out via
  // `__skipAuthHandling` (apiClient.js still forces a global logout for
  // 401 and expired/malformed tokens — only this specific "you can't see
  // this one resource" 403 is scoped to stay in-page).
  test('order detail: a 403 shows the page\'s own "Access denied" state, without a session-invalidating redirect', async ({ page }) => {
    await page.route(`${API_BASE}/api/orders/${ORDER_1.id}`, async (route) => {
      await json(route, 403, errorEnvelope('Forbidden'));
    });

    await page.goto(`/orders/${ORDER_1.id}`);
    await expect(page.getByText('Access denied')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("You don't have access to this order.")).toBeVisible();
    // The session must still be intact — this was never a real auth failure.
    await expect(page).toHaveURL(`/orders/${ORDER_1.id}`);
    const token = await page.evaluate(() => window.localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });
});

test.describe('Users', () => {
  test.beforeEach(async ({ page }) => {
    await installDefaultMocks(page);
    await loginAsAdmin(page);
  });

  test('the users list renders seeded users', async ({ page }) => {
    await page.goto('/users');
    const row = page.getByTestId(`data-row-${CUSTOMER_1.id}`);
    await expect(row).toBeVisible();
    await expect(row).toContainText(CUSTOMER_1.name);
    await expect(row).toContainText(CUSTOMER_1.email);
  });

  test('search sends the debounced term to the backend', async ({ page }) => {
    await page.goto('/users');
    await expect(page.getByTestId(`data-row-${CUSTOMER_1.id}`)).toBeVisible();

    const requestPromise = page.waitForRequest(
      (req) => req.url().includes('/api/admin/users?') && req.url().includes('search=Test')
    );
    await page.getByTestId('users-search-input').fill('Test');
    await requestPromise;
  });

  test('navigating to a user detail page renders orderSummary, recentOrders, and addresses', async ({ page }) => {
    await page.route(`${API_BASE}/api/admin/users/${CUSTOMER_1.id}`, async (route) => {
      await json(
        route,
        200,
        envelope({
          ...CUSTOMER_1,
          orderSummary: { totalOrders: 1, totalSpent: 2499 },
          recentOrders: [ORDER_1],
          addresses: [
            {
              id: 'addr_1',
              name: 'Test Customer',
              houseArea: '12 MG Road',
              area: 'Andheri',
              city: 'Mumbai',
              state: 'Maharashtra',
              pincode: '400001',
              phone: '+919876543210',
              isDefault: true,
            },
          ],
        })
      );
    });

    await page.goto('/users');
    await page.getByTestId(`data-row-${CUSTOMER_1.id}`).getByRole('link', { name: /view/i }).click();

    await expect(page).toHaveURL(`/users/${CUSTOMER_1.id}`);
    await expect(page.getByText('Order Summary')).toBeVisible();
    await expect(page.getByText('₹2499.00', { exact: false }).first()).toBeVisible();

    await expect(page.getByText('Recent Orders')).toBeVisible();
    await expect(page.getByText(String(ORDER_1.id).slice(-8))).toBeVisible();

    await expect(page.getByText('Addresses')).toBeVisible();
    await expect(page.getByText('12 MG Road', { exact: false })).toBeVisible();
    await expect(page.getByText('Default')).toBeVisible();
  });

  test('user detail: a 404 shows the not-found state', async ({ page }) => {
    await page.route(`${API_BASE}/api/admin/users/${CUSTOMER_1.id}`, async (route) => {
      await json(route, 404, errorEnvelope('User not found'));
    });

    await page.goto(`/users/${CUSTOMER_1.id}`);
    await expect(page.getByText('Customer not found')).toBeVisible();
  });

  // REGRESSION TEST: same fix as the order detail page above — see that
  // test's comment for the full root-cause writeup.
  test('user detail: a 403 shows the page\'s own "Access denied" state, without a session-invalidating redirect', async ({ page }) => {
    await page.route(`${API_BASE}/api/admin/users/${CUSTOMER_1.id}`, async (route) => {
      await json(route, 403, errorEnvelope('Forbidden'));
    });

    await page.goto(`/users/${CUSTOMER_1.id}`);
    await expect(page.getByText('Access denied')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("You don't have access to this customer.")).toBeVisible();
    await expect(page).toHaveURL(`/users/${CUSTOMER_1.id}`);
    const token = await page.evaluate(() => window.localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });
});
