// e2e-real/failures.spec.js — REAL FULL-STACK E2E, admin failure scenarios.
// Every scenario is produced by the real backend's own real auth/authorization
// logic — nothing here mocks the app's own API.
const { test, expect } = require('@playwright/test');
const realApi = require('./support/realApi');
const { E2E_ADMIN_EMAIL, E2E_OTP } = require('./fixtures/e2eData');

test.describe('Real-backend admin failure scenarios', () => {
  test('wrong admin password is rejected by the real backend, no session created', async ({ page }) => {
    await page.goto('/');
    await page.locator('#email').fill(E2E_ADMIN_EMAIL);
    await page.locator('#password').fill('definitely-wrong-password');

    const res = page.waitForResponse((r) => r.url().includes('/api/admin/login'));
    await page.locator('button[type="submit"]').click();
    expect((await res).status()).toBe(401);

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL('/');
    const token = await page.evaluate(() => window.localStorage.getItem('token'));
    expect(token).toBeFalsy();
  });

  test('a real customer JWT (not an admin) is rejected by real admin-only routes', async () => {
    // A genuine, validly-signed JWT for a real customer account — the real
    // authorizeAdminOnly middleware must still reject it, not just
    // authenticate().
    const customerToken = await realApi.loginCustomer('9812345670', E2E_OTP);
    expect(customerToken).toBeTruthy();

    const res = await realApi.get('/api/admin/stats', customerToken);
    expect(res.status).toBe(403);
  });

  test('no token at all is rejected by real admin-only routes', async () => {
    const res = await realApi.get('/api/admin/stats');
    expect(res.status).toBe(401);
  });

  test('a malformed/tampered token is rejected (simulating an expired/invalid session)', async ({ page }) => {
    await page.goto('/');
    await page.locator('#email').fill(E2E_ADMIN_EMAIL);
    await page.locator('#password').fill('E2eAdmin@12345');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Simulate a real expired/invalidated session by corrupting the real
    // stored token, then reload — the real backend's real JWT
    // verification (not a mock) rejects it, and the real apiClient
    // interceptor should bounce back to login.
    await page.evaluate(() => {
      const token = window.localStorage.getItem('token');
      window.localStorage.setItem('token', `${token}tampered`);
    });
    await page.reload();

    await expect(page).toHaveURL('/', { timeout: 10000 });
  });
});
