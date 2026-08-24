// e2e/products.spec.js — src/pages/Products.jsx + ProductForm.jsx +
// DataTable.jsx + Pagination.jsx
const { test, expect } = require('@playwright/test');
const path = require('path');
const { installDefaultMocks, loginAsAdmin, json, API_BASE } = require('./support/mockApi');
const { PRODUCTS, PRODUCT_1, envelope } = require('./fixtures/data');

const LOGO_PATH = path.join(__dirname, '..', 'public', 'admin-logo.png');

test.describe('Products', () => {
  test.beforeEach(async ({ page }) => {
    await installDefaultMocks(page);
    await loginAsAdmin(page);

    // The base mock's /api/products/jobs/:jobId fixture returns
    // `{ status: 'done', ... }`, but ProductForm.jsx / api/productJobs.js
    // read `state` (expecting 'completed'/'failed') — a mismatch between
    // the fixture and the real backend contract documented in
    // productJobs.js. Overriding here (per the harness's own "add
    // scenario overrides" convention) so create/edit tests reflect the
    // real contract instead of polling for the full ~25s timeout.
    await page.route(`${API_BASE}/api/products/jobs/*`, async (route) => {
      await json(route, 200, envelope({ state: 'completed', productId: PRODUCT_1.id, result: PRODUCT_1 }));
    });
  });

  test('the product list renders seeded products', async ({ page }) => {
    await page.goto('/products');
    await expect(page.getByTestId(`data-row-${PRODUCT_1.id}`)).toBeVisible();
    await expect(page.getByTestId(`data-row-${PRODUCT_1.id}`)).toContainText(PRODUCT_1.name);
    await expect(page.getByTestId(`data-row-${PRODUCT_1.id}`)).toContainText(PRODUCT_1.brand);
  });

  test('search sends the debounced term to the backend', async ({ page }) => {
    await page.goto('/products');
    await expect(page.getByTestId(`data-row-${PRODUCT_1.id}`)).toBeVisible();

    const requestPromise = page.waitForRequest(
      (req) => req.url().includes('/api/products?') && req.url().includes('search=Fog')
    );
    await page.getByTestId('products-search-input').fill('Fog');
    const req = await requestPromise;
    expect(req.url()).toContain('search=Fog');
  });

  test('filtering by category sends the filter to the backend and shows a clear-filters control', async ({ page }) => {
    await page.goto('/products');
    await expect(page.getByTestId(`data-row-${PRODUCT_1.id}`)).toBeVisible();

    const requestPromise = page.waitForRequest(
      (req) => req.url().includes('/api/products?') && req.url().includes('category=Lights')
    );
    await page.getByTestId('products-category-filter').selectOption('Lights');
    await requestPromise;

    await expect(page.getByTestId('products-clear-filters-btn')).toBeVisible();
    await page.getByTestId('products-clear-filters-btn').click();
    await expect(page.getByTestId('products-category-filter')).toHaveValue('');
  });

  test('clicking a sortable column header toggles sort/order sent to the backend', async ({ page }) => {
    await page.goto('/products');
    await expect(page.getByTestId(`data-row-${PRODUCT_1.id}`)).toBeVisible();

    // aria-sort lives on the <th> itself, not the button inside it.
    const nameHeaderCell = page.getByTestId('sort-header-name').locator('xpath=ancestor::th[1]');

    const ascRequest = page.waitForRequest(
      (req) => req.url().includes('sort=name') && req.url().includes('order=asc')
    );
    await page.getByTestId('sort-header-name').click();
    await ascRequest;
    await expect(nameHeaderCell).toHaveAttribute('aria-sort', 'ascending');

    const descRequest = page.waitForRequest(
      (req) => req.url().includes('sort=name') && req.url().includes('order=desc')
    );
    await page.getByTestId('sort-header-name').click();
    await descRequest;
    await expect(nameHeaderCell).toHaveAttribute('aria-sort', 'descending');
  });

  test('pagination controls reflect backend meta and page forward', async ({ page }) => {
    await page.route(`${API_BASE}/api/products?**`, async (route) => {
      const url = new URL(route.request().url());
      const requestedPage = Number(url.searchParams.get('page')) || 1;
      await json(route, 200, envelope(PRODUCTS, { total: 25, page: requestedPage, limit: 10, totalPages: 3 }));
    });

    await page.goto('/products');
    await expect(page.getByTestId('pagination-current-page')).toHaveText('Page 1 of 3 (25 total)');
    await expect(page.getByTestId('pagination-prev-btn')).toBeDisabled();
    await expect(page.getByTestId('pagination-next-btn')).toBeEnabled();

    const nextPageRequest = page.waitForRequest((req) => req.url().includes('page=2'));
    await page.getByTestId('pagination-next-btn').click();
    await nextPageRequest;
    await expect(page.getByTestId('pagination-current-page')).toHaveText('Page 2 of 3 (25 total)');
    await expect(page.getByTestId('pagination-prev-btn')).toBeEnabled();
  });

  test('creating a new product succeeds and shows a success banner', async ({ page }) => {
    await page.goto('/products');
    await page.getByTestId('products-add-new-btn').click();
    await expect(page.getByTestId('product-form')).toBeVisible();

    await page.getByTestId('product-name-input').fill('Heavy Duty Tarpaulin Cover');
    await page.getByTestId('product-category-checkbox-Safety & Tools').check();
    await page.getByTestId('product-brand-input').fill('Advika');
    await page.getByTestId('product-price-input').fill('999');
    await page.getByTestId('product-stock-input').fill('50');
    await page.getByTestId('product-description-input').fill('A durable heavy-duty tarpaulin cover.');
    await page.getByTestId('product-images-input').setInputFiles(LOGO_PATH);

    await page.getByTestId('product-form-submit-btn').click();

    // Product processing goes through uploading -> processing phases;
    // give the polled job status (mocked to resolve immediately, but
    // still async) time to settle, then the form should close and a
    // success banner should appear on the Products page.
    await expect(page.getByTestId('product-form')).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Product created.')).toBeVisible();
  });

  test('editing an existing product succeeds and shows a success banner', async ({ page }) => {
    await page.goto('/products');
    await page.getByTestId(`products-edit-btn-${PRODUCT_1.id}`).click();

    await expect(page.getByTestId('product-form')).toBeVisible();
    await expect(page.getByTestId('product-name-input')).toHaveValue(PRODUCT_1.name);

    await page.getByTestId('product-name-input').fill(`${PRODUCT_1.name} Updated`);
    await page.getByTestId('product-form-submit-btn').click();

    await expect(page.getByTestId('product-form')).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Product updated.')).toBeVisible();
  });

  test('deleting a product: cancel path leaves the product in place', async ({ page }) => {
    await page.goto('/products');
    await page.getByTestId(`products-delete-btn-${PRODUCT_1.id}`).click();

    await expect(page.getByTestId('confirm-dialog')).toBeVisible();
    await expect(page.getByTestId('confirm-dialog')).toContainText(PRODUCT_1.name);

    await page.getByTestId('confirm-dialog-cancel-btn').click();
    await expect(page.getByTestId('confirm-dialog')).not.toBeVisible();
    await expect(page.getByTestId(`data-row-${PRODUCT_1.id}`)).toBeVisible();
  });

  test('deleting a product: confirm path removes it and shows a success banner', async ({ page }) => {
    await page.route(`${API_BASE}/api/products/${PRODUCT_1.id}`, async (route) => {
      if (route.request().method() === 'DELETE') return json(route, 200, envelope(null));
      return route.fallback();
    });

    await page.goto('/products');
    await page.getByTestId(`products-delete-btn-${PRODUCT_1.id}`).click();
    await expect(page.getByTestId('confirm-dialog')).toBeVisible();

    await page.getByTestId('confirm-dialog-confirm-btn').click();
    await expect(page.getByTestId('confirm-dialog')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(`"${PRODUCT_1.name}" was deleted.`)).toBeVisible();
  });

  test('client-side validation blocks submission with empty required fields', async ({ page }) => {
    await page.goto('/products');
    await page.getByTestId('products-add-new-btn').click();
    await expect(page.getByTestId('product-form')).toBeVisible();

    await page.getByTestId('product-form-submit-btn').click();

    await expect(page.getByTestId('product-name-error')).toContainText('Product name is required');
    await expect(page.getByTestId('product-brand-error')).toContainText('Brand is required');
    await expect(page.getByTestId('product-price-error')).toContainText('Price must be a number greater than 0');
    await expect(page.getByTestId('product-stock-error')).toContainText('Stock must be a non-negative integer');
    await expect(page.getByTestId('product-description-error')).toContainText('Description is required');
    await expect(page.getByTestId('product-category-error')).toContainText('At least one category is required');
    await expect(page.getByTestId('product-images-error')).toContainText('At least one product image is required');

    // The form should never have been submitted.
    await expect(page.getByTestId('product-form')).toBeVisible();
  });

  test('an empty product list shows the empty state', async ({ page }) => {
    await page.route(`${API_BASE}/api/products?**`, async (route) => {
      await json(route, 200, envelope([], { total: 0, page: 1, limit: 10, totalPages: 0 }));
    });

    await page.goto('/products');
    await expect(page.getByText('No products found')).toBeVisible();
    await expect(page.getByText('Add your first product to get started.')).toBeVisible();
  });
});
