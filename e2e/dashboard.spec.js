// e2e/dashboard.spec.js — AdminDashboard (src/pages/Dashboard.jsx) +
// DashboardCards (src/component/Adminlogin/DashboardOverview.jsx)
const { test, expect } = require('@playwright/test');
const { installDefaultMocks, loginAsAdmin, json, API_BASE } = require('./support/mockApi');

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await installDefaultMocks(page);
    await loginAsAdmin(page);
  });

  test('stats load and render the values from GET /api/admin/stats', async ({ page }) => {
    await page.goto('/dashboard');

    // Each stat card is an accessible region labelled by its own heading —
    // assert on the region's accessible name + rendered value together so
    // a mislabeled card would fail this.
    await expect(page.getByRole('region', { name: 'Total Customers' })).toContainText('42');
    await expect(page.getByRole('region', { name: 'Total Orders' })).toContainText('128');
    await expect(page.getByRole('region', { name: 'Total Products' })).toContainText('2');
    await expect(page.getByRole('region', { name: 'Delivered Orders' })).toContainText('90');
    await expect(page.getByRole('region', { name: 'Pending Orders' })).toContainText('12');
    await expect(page.getByText(/Paid Revenue/)).toBeVisible();
    // formatCurrency uses en-IN grouping — 384210 -> ₹3,84,210
    await expect(page.getByRole('region', { name: /Paid Revenue/ })).toContainText('3,84,210');
  });

  test('a loading skeleton appears before the stats resolve', async ({ page }) => {
    // Delay the stats response so the skeleton has time to be observed.
    await page.route(`${API_BASE}/api/admin/stats`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await json(route, 200, {
        success: true,
        message: 'ok',
        data: { totalUsers: 5, totalOrders: 6, totalProducts: 7, deliveredOrders: 1, pendingOrders: 1, totalRevenue: 100 },
        meta: {},
      });
    });

    await page.goto('/dashboard');

    // Five skeleton cards render immediately, before the delayed response.
    const skeletons = page.getByRole('status', { name: 'Loading statistic' });
    await expect(skeletons).toHaveCount(5);

    // Once the response resolves, the skeletons are replaced by real cards.
    await expect(page.getByRole('region', { name: 'Total Customers' })).toContainText('5', { timeout: 10000 });
    await expect(skeletons).toHaveCount(0);
  });

  test('a 500 from the stats endpoint shows an error with a working retry', async ({ page }) => {
    let callCount = 0;
    await page.route(`${API_BASE}/api/admin/stats`, async (route) => {
      callCount += 1;
      if (callCount === 1) {
        return json(route, 500, { success: false, message: 'Internal server error', errors: null });
      }
      await json(route, 200, {
        success: true,
        message: 'ok',
        data: { totalUsers: 9, totalOrders: 9, totalProducts: 9, deliveredOrders: 9, pendingOrders: 9, totalRevenue: 900 },
        meta: {},
      });
    });

    await page.goto('/dashboard');

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible({ timeout: 10000 });
    await expect(alert).toContainText('Failed to load dashboard statistics.');

    await page.getByRole('button', { name: /retry/i }).click();

    await expect(page.getByRole('region', { name: 'Total Customers' })).toContainText('9', { timeout: 10000 });
    await expect(page.getByRole('alert')).not.toBeVisible();
  });
});
