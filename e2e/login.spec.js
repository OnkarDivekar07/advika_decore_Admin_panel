// e2e/login.spec.js — AdminLoginPage.jsx + AuthContext + ProtectedRoute
const { test, expect } = require('@playwright/test');
const { installDefaultMocks, loginAsAdmin, API_BASE } = require('./support/mockApi');

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

  // LoginPage.jsx's <form> has noValidate, so the browser's native
  // required-field blocking is deliberately disabled — an empty submit is
  // never blocked client-side and always makes a live POST /api/admin/login,
  // relying entirely on the server's 422 to surface a clear message. This
  // confirms that server-validation-only path actually renders correctly
  // end-to-end, not just that the message-formatting logic is right in
  // isolation (see LoginPage.test.jsx's unit-level 422 rendering test).
  test('submitting with empty fields makes a real request and shows the server validation error', async ({ page }) => {
    await page.route(`${API_BASE}/api/admin/login`, (route) =>
      route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Email and password are required.',
          errors: [
            { field: 'email', message: 'Email is required' },
            { field: 'password', message: 'Password is required' },
          ],
        }),
      })
    );

    await page.goto('/');
    await page.locator('button[type="submit"]').click();

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('alert')).toContainText('required');
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

  // Pattern 13 (admin session security audit): a SPA logout is a client-
  // side navigate, not a full page unload — the browser back button after
  // it fires a popstate re-matched against the SAME live AuthContext
  // instance (already cleared), not a bfcache-restored stale render. This
  // pins that down with a real browser back-navigation rather than just
  // trusting the code trace.
  test('browser back after logout does not show a stale authenticated page', async ({ page }) => {
    // Deliberately logs in via the real form, NOT loginAsAdmin() — that
    // helper seeds the session with page.addInitScript(), which Playwright
    // re-runs on every subsequent navigation in this test for its entire
    // lifetime, including any reload/bfcache-restore triggered by the
    // back-navigation below. That would silently re-authenticate every
    // later page load regardless of what logout actually did, making this
    // specific test meaningless — confirmed by first writing it with
    // loginAsAdmin() and finding the assertion below failed identically
    // whether or not the app's own bfcache-reload guard was in place,
    // which only makes sense if something outside the app was
    // re-seeding storage on every load.
    await page.goto('/');
    await page.locator('#email').fill('admin@advika.test');
    await page.locator('#password').fill('correct-password');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/, { timeout: 10000 });

    await page.getByRole('button', { name: /log out/i }).click();
    await expect(page).toHaveURL('/', { timeout: 10000 });

    await page.goBack();

    // Still redirected to login, not a flash of the settings page — and
    // no session was silently restored by the back-navigation.
    await expect(page).toHaveURL('/', { timeout: 10000 });
    await expect(page.locator('#email')).toBeVisible();
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
