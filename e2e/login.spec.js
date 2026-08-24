// e2e/login.spec.js — AdminLoginPage.jsx + AuthContext + ProtectedRoute
const { test, expect } = require('@playwright/test');
const { installDefaultMocks, loginAsAdmin } = require('./support/mockApi');

test.describe('Admin login', () => {
  test.beforeEach(async ({ page }) => {
    await installDefaultMocks(page);
  });

  test('happy path: valid credentials reach the dashboard', async ({ page }) => {
    await page.goto('/');
    await page.locator('#email').fill('admin@advika.test');
    await page.locator('#password').fill('correct-password');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    const token = await page.evaluate(() => window.localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });

  test('wrong password shows an inline error and does not navigate', async ({ page }) => {
    await page.goto('/');
    await page.locator('#email').fill('admin@advika.test');
    await page.locator('#password').fill('wrong-password');
    await page.locator('button[type="submit"]').click();

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL('/');
  });

  test('unauthenticated visit to a protected route redirects to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });

  test('a stored session restores on load without re-entering credentials', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.locator('#email')).not.toBeVisible();
  });

  test('logout clears the session and redirects to login', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/, { timeout: 10000 });

    await page.getByRole('button', { name: /log out/i }).click();
    await expect(page).toHaveURL('/', { timeout: 10000 });
    const token = await page.evaluate(() => window.localStorage.getItem('token'));
    expect(token).toBeFalsy();
  });

  test('a 401 on any API call mid-session redirects back to login', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Simulate the token expiring server-side on the very next call.
    await page.route('**/api/admin/stats', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Invalid token.', errors: null }),
      })
    );
    await page.reload();

    await expect(page).toHaveURL('/', { timeout: 10000 });
  });
});
