// e2e/content.spec.js — src/pages/Content.jsx + BannerManagement +
// NewArrivalsManagement
const { test, expect } = require('@playwright/test');
const path = require('path');
const { installDefaultMocks, loginAsAdmin, json, API_BASE } = require('./support/mockApi');
const { PRODUCT_1, envelope } = require('./fixtures/data');

const LOGO_PATH = path.join(__dirname, '..', 'public', 'admin-logo.png');

test.describe('Content management — Banners', () => {
  test.beforeEach(async ({ page }) => {
    await installDefaultMocks(page);
    await loginAsAdmin(page);
  });

  test('the banner list loads', async ({ page }) => {
    await page.route(`${API_BASE}/api/homepage/banners`, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await json(route, 200, envelope([{ id: 'banner_1', imageUrl: '/admin-logo.png' }], { total: 1 }));
    });

    await page.goto('/content');
    await expect(page.getByTestId('banner-delete-btn-banner_1')).toBeVisible();
  });

  test('uploading a new banner succeeds and the list refreshes', async ({ page }) => {
    let banners = [];
    await page.route(`${API_BASE}/api/homepage/banners`, async (route) => {
      const method = route.request().method();
      if (method === 'GET') return json(route, 200, envelope(banners, { total: banners.length }));
      if (method === 'POST') {
        banners = [{ id: 'banner_new', imageUrl: '/admin-logo.png' }];
        return json(route, 201, envelope(banners[0]));
      }
      return route.fallback();
    });

    await page.goto('/content');
    await expect(page.getByText('No banners yet')).toBeVisible();

    await page.getByTestId('banner-image-input').setInputFiles(LOGO_PATH);
    await expect(page.getByAltText('Selected banner preview')).toBeVisible();

    await page.getByTestId('banner-upload-btn').click();

    // Scoped by text rather than a bare role — a "Loading banners…"
    // role="status" node can be transiently present at the same time as
    // the success banner (also role="status") right after the refetch
    // kicks off.
    await expect(page.getByText('Banner uploaded successfully.')).toBeVisible({ timeout: 10000 });
    // The form resets — file input cleared, upload button disabled again.
    await expect(page.getByTestId('banner-upload-btn')).toBeDisabled();
    // The refreshed list now shows the uploaded banner.
    await expect(page.getByTestId('banner-delete-btn-banner_new')).toBeVisible();
  });

  test('deleting a banner via ConfirmDialog: cancel path leaves it in place', async ({ page }) => {
    await page.route(`${API_BASE}/api/homepage/banners`, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await json(route, 200, envelope([{ id: 'banner_1', imageUrl: '/admin-logo.png' }], { total: 1 }));
    });

    await page.goto('/content');
    await page.getByTestId('banner-delete-btn-banner_1').click();

    await expect(page.getByTestId('confirm-dialog')).toBeVisible();
    await page.getByTestId('confirm-dialog-cancel-btn').click();
    await expect(page.getByTestId('confirm-dialog')).not.toBeVisible();
    await expect(page.getByTestId('banner-delete-btn-banner_1')).toBeVisible();
  });

  test('deleting a banner via ConfirmDialog: confirm path removes it', async ({ page }) => {
    await page.route(`${API_BASE}/api/homepage/banners`, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await json(route, 200, envelope([{ id: 'banner_1', imageUrl: '/admin-logo.png' }], { total: 1 }));
    });
    await page.route(`${API_BASE}/api/homepage/banners/banner_1`, async (route) => {
      if (route.request().method() !== 'DELETE') return route.fallback();
      await json(route, 200, envelope(null));
    });

    await page.goto('/content');
    await page.getByTestId('banner-delete-btn-banner_1').click();
    await expect(page.getByTestId('confirm-dialog')).toBeVisible();

    await page.getByTestId('confirm-dialog-confirm-btn').click();
    await expect(page.getByTestId('confirm-dialog')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Banner deleted.')).toBeVisible();
    await expect(page.getByText('No banners yet')).toBeVisible();
  });
});

test.describe('Content management — New Arrivals', () => {
  test.beforeEach(async ({ page }) => {
    await installDefaultMocks(page);
    await loginAsAdmin(page);

    // NewArrivalsManagement.jsx calls GET /api/homepage/new-arrivals with
    // no query params at all, but the default mock's route pattern
    // ('...new-arrivals?**') requires a literal '?' to be present in the
    // URL to match — a request with no query string never matches it, so
    // it falls through to a real (dead) network call and hangs. This
    // override matches the literal endpoint the app actually calls.
    await page.route(`${API_BASE}/api/homepage/new-arrivals`, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await json(route, 200, envelope([PRODUCT_1], { total: 1 }));
    });
  });

  test('the new arrivals list loads', async ({ page }) => {
    await page.goto('/content');
    await expect(page.getByRole('heading', { name: 'New Arrivals' })).toBeVisible();
    await expect(page.getByTestId(`new-arrival-remove-btn-${PRODUCT_1.id}`)).toBeVisible();
    await expect(page.getByText(PRODUCT_1.name)).toBeVisible();
  });

  test('removing an item via ConfirmDialog: cancel path leaves it in place', async ({ page }) => {
    await page.goto('/content');
    await page.getByTestId(`new-arrival-remove-btn-${PRODUCT_1.id}`).click();

    await expect(page.getByTestId('confirm-dialog')).toBeVisible();
    await expect(page.getByTestId('confirm-dialog')).toContainText(PRODUCT_1.name);

    await page.getByTestId('confirm-dialog-cancel-btn').click();
    await expect(page.getByTestId('confirm-dialog')).not.toBeVisible();
    await expect(page.getByTestId(`new-arrival-remove-btn-${PRODUCT_1.id}`)).toBeVisible();
  });

  test('removing an item via ConfirmDialog: confirm path removes it and shows a success banner', async ({ page }) => {
    await page.route(`${API_BASE}/api/homepage/new-arrivals/${PRODUCT_1.id}`, async (route) => {
      if (route.request().method() !== 'PATCH') return route.fallback();
      await json(route, 200, envelope(null));
    });

    await page.goto('/content');
    await page.getByTestId(`new-arrival-remove-btn-${PRODUCT_1.id}`).click();
    await expect(page.getByTestId('confirm-dialog')).toBeVisible();

    await page.getByTestId('confirm-dialog-confirm-btn').click();
    await expect(page.getByTestId('confirm-dialog')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(`"${PRODUCT_1.name}" removed from New Arrivals.`)).toBeVisible();
    await expect(page.getByText('No new arrivals marked')).toBeVisible();
  });
});
