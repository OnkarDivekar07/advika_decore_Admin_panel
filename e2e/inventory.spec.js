// e2e/inventory.spec.js — src/pages/Inventory.jsx +
// src/component/Adminlogin/StockAdjustModal.jsx
const { test, expect } = require('@playwright/test');
const { installDefaultMocks, loginAsAdmin, json, API_BASE } = require('./support/mockApi');
const { PRODUCT_1, envelope } = require('./fixtures/data');

// The default mock's PATCH /api/inventory/:id fixture always *adds*
// body.quantity to the base stock, regardless of `action` — correct for
// 'increment', wrong for 'decrement'/'set'. This override computes the
// real per-action result, matching StockAdjustModal.jsx's contract
// (action/quantity/expectedStock in, { stock } out).
function installAccurateStockPatch(page) {
  return page.route(`${API_BASE}/api/inventory/${PRODUCT_1.id}`, async (route) => {
    if (route.request().method() === 'GET') {
      return json(route, 200, envelope({ productId: PRODUCT_1.id, stock: PRODUCT_1.stock }));
    }
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      let newStock = PRODUCT_1.stock;
      if (body.action === 'increment') newStock += body.quantity;
      else if (body.action === 'decrement') newStock -= body.quantity;
      else if (body.action === 'set') newStock = body.quantity;
      return json(route, 200, envelope({ productId: PRODUCT_1.id, stock: newStock }));
    }
    return route.fallback();
  });
}

test.describe('Inventory', () => {
  test.beforeEach(async ({ page }) => {
    await installDefaultMocks(page);
    await loginAsAdmin(page);
  });

  test('the low-stock panel loads', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page.getByText('2 products at or below the threshold.')).toBeVisible();
    // PRODUCT_1 also appears in the catalog browser table below, so scope
    // this assertion to the restock button that's unique to the
    // low-stock panel row.
    await expect(page.getByTestId(`inventory-restock-btn-${PRODUCT_1.id}`)).toBeVisible();
    await expect(page.getByText('Low item')).toBeVisible();
  });

  test('changing the threshold sends a debounced request with the new value', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page.getByTestId(`inventory-restock-btn-${PRODUCT_1.id}`)).toBeVisible();

    const requestPromise = page.waitForRequest(
      (req) => req.url().includes('/api/inventory/low-stock') && req.url().includes('threshold=25')
    );
    await page.getByTestId('inventory-threshold-input').fill('25');
    await requestPromise;
  });

  test('the catalog browser table loads all products', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page.getByTestId(`data-row-${PRODUCT_1.id}`)).toBeVisible();
    await expect(page.getByTestId(`data-row-${PRODUCT_1.id}`)).toContainText(PRODUCT_1.name);
    await expect(page.getByTestId(`data-row-${PRODUCT_1.id}`)).toContainText('In Stock');
  });

  test('opening the stock adjust modal shows the authoritative current stock', async ({ page }) => {
    await page.goto('/inventory');
    await page.getByTestId(`inventory-adjust-btn-${PRODUCT_1.id}`).click();

    await expect(page.getByTestId('stock-adjust-modal')).toBeVisible();
    await expect(page.getByText(`Current stock: ${PRODUCT_1.stock}`)).toBeVisible();
  });

  test('a small increment applies immediately (no confirmation) and updates the banner', async ({ page }) => {
    await installAccurateStockPatch(page);

    await page.goto('/inventory');
    await page.getByTestId(`inventory-adjust-btn-${PRODUCT_1.id}`).click();
    await expect(page.getByTestId('stock-adjust-modal')).toBeVisible();

    await page.getByTestId('stock-quantity-input').fill('5');
    await page.getByTestId('stock-adjust-submit-btn').click();

    await expect(page.getByTestId('confirm-dialog')).not.toBeVisible();
    await expect(page.getByTestId('stock-adjust-modal')).not.toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText(`Stock for "${PRODUCT_1.name}" is now ${PRODUCT_1.stock + 5}.`)
    ).toBeVisible();
  });

  test('a decrement is treated as destructive and requires confirmation', async ({ page }) => {
    await installAccurateStockPatch(page);

    await page.goto('/inventory');
    await page.getByTestId(`inventory-adjust-btn-${PRODUCT_1.id}`).click();
    await expect(page.getByTestId('stock-adjust-modal')).toBeVisible();

    await page.getByTestId('stock-action-select').selectOption('decrement');
    await page.getByTestId('stock-quantity-input').fill('5');
    await page.getByTestId('stock-adjust-submit-btn').click();

    const dialog = page.getByTestId('confirm-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(
      `from ${PRODUCT_1.stock} to ${PRODUCT_1.stock - 5}`
    );

    await page.getByTestId('confirm-dialog-confirm-btn').click();
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText(`Stock for "${PRODUCT_1.name}" is now ${PRODUCT_1.stock - 5}.`)
    ).toBeVisible();
  });

  test('an increment of 50+ units is treated as a large change and requires confirmation', async ({ page }) => {
    await installAccurateStockPatch(page);

    await page.goto('/inventory');
    await page.getByTestId(`inventory-adjust-btn-${PRODUCT_1.id}`).click();
    await expect(page.getByTestId('stock-adjust-modal')).toBeVisible();

    await page.getByTestId('stock-quantity-input').fill('60');
    await page.getByTestId('stock-adjust-submit-btn').click();

    const dialog = page.getByTestId('confirm-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(
      `from ${PRODUCT_1.stock} to ${PRODUCT_1.stock + 60}`
    );

    await page.getByTestId('confirm-dialog-cancel-btn').click();
    await expect(dialog).not.toBeVisible();
    // Cancelling the confirmation leaves the modal open with nothing applied.
    await expect(page.getByTestId('stock-adjust-modal')).toBeVisible();
  });

  test('a 409 stale-stock conflict is shown inline instead of crashing', async ({ page }) => {
    await page.route(`${API_BASE}/api/inventory/${PRODUCT_1.id}`, async (route) => {
      if (route.request().method() === 'GET') {
        return json(route, 200, envelope({ productId: PRODUCT_1.id, stock: PRODUCT_1.stock }));
      }
      if (route.request().method() === 'PATCH') {
        return json(route, 409, {
          success: false,
          message: 'Stock conflict',
          errors: { currentStock: 18 },
        });
      }
      return route.fallback();
    });

    await page.goto('/inventory');
    await page.getByTestId(`inventory-adjust-btn-${PRODUCT_1.id}`).click();
    await expect(page.getByTestId('stock-adjust-modal')).toBeVisible();

    await page.getByTestId('stock-quantity-input').fill('5');
    await page.getByTestId('stock-adjust-submit-btn').click();

    await expect(page.getByTestId('stock-adjust-error')).toContainText(
      'Stock changed to 18 since this was loaded. Review and try again.'
    );
    // The modal stays open with the real current value, not a crash/blank screen.
    await expect(page.getByTestId('stock-adjust-modal')).toBeVisible();
    await expect(page.getByText('Current stock: 18')).toBeVisible();
  });
});
