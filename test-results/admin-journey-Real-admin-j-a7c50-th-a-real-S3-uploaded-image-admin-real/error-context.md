# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-real\admin-journey.spec.js >> Real admin journey (real backend + real DB + real S3) >> creates a real product with a real S3-uploaded image
- Location: e2e-real\admin-journey.spec.js:182:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "completed"
Received: "delayed"
```

# Page snapshot

```yaml
- generic [ref=f3e3]:
  - link "Skip to main content" [ref=f3e4] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=f3e5]:
    - generic [ref=f3e6]:
      - generic [ref=f3e7]:
        - text: 
        - img "E-commerce Admin Panel logo" [ref=f3e8]
        - heading "Advika Decore Admin" [level=1] [ref=f3e9]
      - generic [ref=f3e10]:
        - link "Operational alerts, 2 needing attention" [ref=f3e11] [cursor=pointer]:
          - /url: /alerts
          - generic [ref=f3e12]: 
          - generic [ref=f3e13]: "2"
        - button "ADMIN" [ref=f3e14] [cursor=pointer]:
          - generic [ref=f3e16]: 
        - button "Logout" [ref=f3e17] [cursor=pointer]:
          - generic [ref=f3e18]: 
  - generic [ref=f3e20]:
    - complementary "Admin navigation" [ref=f3e21]:
      - text: 
      - navigation [ref=f3e22]:
        - link "Dashboard" [ref=f3e23] [cursor=pointer]:
          - /url: /dashboard
          - generic [ref=f3e24]: 
        - link "Alerts" [ref=f3e26] [cursor=pointer]:
          - /url: /alerts
          - generic [ref=f3e27]: 
        - link "Analytics" [ref=f3e29] [cursor=pointer]:
          - /url: /analytics
          - generic [ref=f3e30]: 
        - link "Products" [ref=f3e32] [cursor=pointer]:
          - /url: /products
          - generic [ref=f3e33]: 
        - link "Orders" [ref=f3e35] [cursor=pointer]:
          - /url: /orders
          - generic [ref=f3e36]: 
        - link "Users" [ref=f3e38] [cursor=pointer]:
          - /url: /users
          - generic [ref=f3e39]: 
        - link "Inventory" [ref=f3e41] [cursor=pointer]:
          - /url: /inventory
          - generic [ref=f3e42]: 
        - link "Content" [ref=f3e44] [cursor=pointer]:
          - /url: /content
          - generic [ref=f3e45]: 
        - link "Settings" [ref=f3e47] [cursor=pointer]:
          - /url: /settings
          - generic [ref=f3e48]: 
    - main [ref=f3e50]:
      - navigation "Breadcrumb" [ref=f3e51]:
        - list [ref=f3e52]:
          - listitem [ref=f3e53]:
            - link "Dashboard" [ref=f3e54] [cursor=pointer]:
              - /url: /dashboard
          - listitem [ref=f3e55]:
            - generic [ref=f3e56]: 
            - generic [ref=f3e57]: Products
      - generic [ref=f3e58]:
        - generic [ref=f3e59]:
          - heading "Products" [level=1] [ref=f3e60]
          - paragraph [ref=f3e61]: Manage the product catalog — pricing, stock, and images.
        - button "Add New Product" [ref=f3e63] [cursor=pointer]:
          - generic [ref=f3e64]: +
          - text: Add New Product
      - generic [ref=f3e66]:
        - heading "Add New Product" [level=2] [ref=f3e67]
        - alert [ref=f3e68]:
          - generic [ref=f3e70]:
            - generic [ref=f3e71]: 
            - generic [ref=f3e72]: Still processing — this is taking longer than expected. The product list will update once it finishes; you can safely close this form.
        - generic [ref=f3e73]:
          - generic [ref=f3e74]: Product name
          - textbox "Product name" [ref=f3e75]:
            - /placeholder: e.g. Heavy Duty Tarpaulin
            - text: E2E-AdminCreated-1787596056244-11989
        - group "Select categories" [ref=f3e76]:
          - generic [ref=f3e78]:
            - generic [ref=f3e79]:
              - checkbox "Lights" [ref=f3e80]
              - generic [ref=f3e81]: Lights
            - generic [ref=f3e82]:
              - checkbox "Horns & Air" [ref=f3e83]
              - generic [ref=f3e84]: Horns & Air
            - generic [ref=f3e85]:
              - checkbox "Interior & Comfort" [ref=f3e86]
              - generic [ref=f3e87]: Interior & Comfort
            - generic [ref=f3e88]:
              - checkbox "Exterior Styling" [ref=f3e89]
              - generic [ref=f3e90]: Exterior Styling
            - generic [ref=f3e91]:
              - checkbox "Electrical & Wiring" [ref=f3e92]
              - generic [ref=f3e93]: Electrical & Wiring
            - generic [ref=f3e94]:
              - checkbox "Safety & Tools" [checked] [ref=f3e95]
              - generic [ref=f3e96]: Safety & Tools
            - generic [ref=f3e97]:
              - checkbox "Spares & Fitting" [ref=f3e98]
              - generic [ref=f3e99]: Spares & Fitting
        - generic [ref=f3e100]:
          - generic [ref=f3e101]: Brand
          - textbox "Brand" [ref=f3e102]:
            - /placeholder: e.g. Advika
            - text: Advika E2E
        - generic [ref=f3e103]:
          - generic [ref=f3e104]:
            - generic [ref=f3e105]: Price (₹)
            - spinbutton "Price (₹)" [ref=f3e106]: "777"
          - generic [ref=f3e107]:
            - generic [ref=f3e108]: MRP (₹, optional)
            - spinbutton "MRP (₹, optional)" [ref=f3e109]
        - generic [ref=f3e110]:
          - generic [ref=f3e111]: Stock quantity
          - spinbutton "Stock quantity" [ref=f3e112]: "25"
        - generic [ref=f3e113]:
          - generic [ref=f3e114]: Voltage (optional)
          - combobox "Voltage (optional)" [ref=f3e115]:
            - option "No voltage (non-electrical part)" [selected]
            - option "12V"
            - option "24V"
            - option "12V/24V"
        - generic [ref=f3e116]:
          - generic [ref=f3e117]: Description
          - textbox "Description" [ref=f3e118]:
            - /placeholder: Describe the product…
            - text: Created by the real admin E2E layer.
        - generic [ref=f3e119]:
          - generic [ref=f3e120]: "Specifications (optional, one per line as \"Key: Value\")"
          - 'textbox "Specifications (optional, one per line as \"Key: Value\")" [ref=f3e121]':
            - /placeholder: "Wattage: 100W\nLumens: 9,000 lm\nIP Rating: IP68"
        - group "Vehicle compatibility (optional)" [ref=f3e122]:
          - generic [ref=f3e124]:
            - generic [ref=f3e125]:
              - generic [ref=f3e126]: 12V vehicles (comma-separated)
              - textbox "12V vehicles (comma-separated)" [ref=f3e127]:
                - /placeholder: Tata Ace, Mahindra Bolero Pickup
            - generic [ref=f3e128]:
              - generic [ref=f3e129]: 24V vehicles (comma-separated)
              - textbox "24V vehicles (comma-separated)" [ref=f3e130]:
                - /placeholder: Tata Signa 4825, Ashok Leyland 3718
        - group "Variants (optional — e.g. different wattages at different prices)" [ref=f3e131]:
          - button "+ Add variant group" [ref=f3e134] [cursor=pointer]
        - generic [ref=f3e135]:
          - generic [ref=f3e136]:
            - generic [ref=f3e137]: Rating (0–5, optional)
            - spinbutton "Rating (0–5, optional)" [ref=f3e138]
          - generic [ref=f3e139]:
            - generic [ref=f3e140]: Review count (optional)
            - spinbutton "Review count (optional)" [ref=f3e141]
        - generic [ref=f3e142]:
          - checkbox "New arrival?" [ref=f3e143]
          - text: New arrival?
        - generic [ref=f3e144]:
          - checkbox "Best seller?" [ref=f3e145]
          - text: Best seller?
        - generic [ref=f3e146]:
          - generic [ref=f3e147]: Product images
          - button "Product images" [ref=f3e148]
        - generic [ref=f3e149]:
          - button "Add Product" [ref=f3e150] [cursor=pointer]
          - button "Cancel" [ref=f3e151] [cursor=pointer]
      - generic [ref=f3e153]:
        - generic [ref=f3e154]:
          - generic [ref=f3e155]: Search products
          - searchbox "Search products" [ref=f3e156]
        - combobox "Filter by category" [ref=f3e157]:
          - option "All categories" [selected]
          - option "Lights"
          - option "Horns & Air"
          - option "Interior & Comfort"
          - option "Exterior Styling"
          - option "Electrical & Wiring"
          - option "Safety & Tools"
          - option "Spares & Fitting"
        - textbox "Filter by brand" [ref=f3e158]:
          - /placeholder: Brand
        - combobox "Filter by stock status" [ref=f3e159]:
          - option "Any stock level" [selected]
          - option "In stock"
          - option "Out of stock"
        - combobox "Filter by new arrival" [ref=f3e160]:
          - 'option "New arrival: any" [selected]'
          - option "New arrivals only"
          - option "Not new arrivals"
      - generic [ref=f3e161]:
        - table [ref=f3e163]:
          - caption [ref=f3e164]: Products
          - rowgroup [ref=f3e165]:
            - row [ref=f3e166]:
              - columnheader "Image" [ref=f3e167]
              - columnheader "ID" [ref=f3e168]
              - columnheader [ref=f3e169]:
                - button "Name" [ref=f3e170] [cursor=pointer]:
                  - text: Name
                  - generic [ref=f3e171]: 
              - columnheader "Brand" [ref=f3e172]
              - columnheader "Category" [ref=f3e173]
              - columnheader [ref=f3e174]:
                - button "Price" [ref=f3e175] [cursor=pointer]:
                  - text: Price
                  - generic [ref=f3e176]: 
              - columnheader [ref=f3e177]:
                - button "Stock" [ref=f3e178] [cursor=pointer]:
                  - text: Stock
                  - generic [ref=f3e179]: 
              - columnheader "New Arrival" [ref=f3e180]
              - columnheader "Actions" [ref=f3e181]
          - rowgroup [ref=f3e183]:
            - row [ref=f3e184]:
              - cell [ref=f3e185]:
                - img "Universal Mounting Bracket Set" [ref=f3e186]
              - cell "378daabb" [ref=f3e187]
              - cell "Universal Mounting Bracket Set" [ref=f3e188]
              - cell "Advika" [ref=f3e189]
              - cell "Spares & Fitting" [ref=f3e190]
              - cell "₹449.00" [ref=f3e191]
              - cell "65 · In Stock" [ref=f3e192]
              - cell "—" [ref=f3e194]
              - cell [ref=f3e195]:
                - generic [ref=f3e196]:
                  - button "Edit Universal Mounting Bracket Set" [ref=f3e197] [cursor=pointer]: Edit
                  - button "Delete Universal Mounting Bracket Set" [ref=f3e198] [cursor=pointer]: Delete
            - row [ref=f3e199]:
              - cell [ref=f3e200]:
                - img "Reflective Safety Triangle Kit" [ref=f3e201]
              - cell "378daaba" [ref=f3e202]
              - cell "Reflective Safety Triangle Kit" [ref=f3e203]
              - cell "Advika" [ref=f3e204]
              - cell "Safety & Tools" [ref=f3e205]
              - cell "₹399.00" [ref=f3e206]
              - cell "89 · In Stock" [ref=f3e207]
              - cell "—" [ref=f3e209]
              - cell [ref=f3e210]:
                - generic [ref=f3e211]:
                  - button "Edit Reflective Safety Triangle Kit" [ref=f3e212] [cursor=pointer]: Edit
                  - button "Delete Reflective Safety Triangle Kit" [ref=f3e213] [cursor=pointer]: Delete
            - row [ref=f3e214]:
              - cell [ref=f3e215]:
                - img "Braided Wiring Harness Kit" [ref=f3e216]
              - cell "378daab9" [ref=f3e217]
              - cell "Braided Wiring Harness Kit" [ref=f3e218]
              - cell "Advika" [ref=f3e219]
              - cell "Electrical & Wiring" [ref=f3e220]
              - cell "₹1899.00" [ref=f3e221]
              - cell "22 · In Stock" [ref=f3e222]
              - cell "—" [ref=f3e224]
              - cell [ref=f3e225]:
                - generic [ref=f3e226]:
                  - button "Edit Braided Wiring Harness Kit" [ref=f3e227] [cursor=pointer]: Edit
                  - button "Delete Braided Wiring Harness Kit" [ref=f3e228] [cursor=pointer]: Delete
            - row [ref=f3e229]:
              - cell [ref=f3e230]:
                - img "12V Reverse Horn with Sensor" [ref=f3e231]
              - cell "378daab8" [ref=f3e232]
              - cell "12V Reverse Horn with Sensor" [ref=f3e233]
              - cell "Advika" [ref=f3e234]
              - cell "Horns & Air" [ref=f3e235]
              - cell "₹1099.00" [ref=f3e236]
              - cell "45 · In Stock" [ref=f3e237]
              - cell "—" [ref=f3e239]
              - cell [ref=f3e240]:
                - generic [ref=f3e241]:
                  - button "Edit 12V Reverse Horn with Sensor" [ref=f3e242] [cursor=pointer]: Edit
                  - button "Delete 12V Reverse Horn with Sensor" [ref=f3e243] [cursor=pointer]: Delete
            - row [ref=f3e244]:
              - cell [ref=f3e245]:
                - img "Cotton Dash Mat, Large" [ref=f3e246]
              - cell "378daab7" [ref=f3e247]
              - cell "Cotton Dash Mat, Large" [ref=f3e248]
              - cell "Advika" [ref=f3e249]
              - cell "Interior & Comfort" [ref=f3e250]
              - cell "₹549.00" [ref=f3e251]
              - cell "0 · Out of Stock" [ref=f3e252]
              - cell "—" [ref=f3e254]
              - cell [ref=f3e255]:
                - generic [ref=f3e256]:
                  - button "Edit Cotton Dash Mat, Large" [ref=f3e257] [cursor=pointer]: Edit
                  - button "Delete Cotton Dash Mat, Large" [ref=f3e258] [cursor=pointer]: Delete
            - row [ref=f3e259]:
              - cell [ref=f3e260]:
                - img "SlimBar 72W LED Light Bar" [ref=f3e261]
              - cell "378daab6" [ref=f3e262]
              - cell "SlimBar 72W LED Light Bar" [ref=f3e263]
              - cell "Advika" [ref=f3e264]
              - cell "Lights" [ref=f3e265]
              - cell "₹9999.00" [ref=f3e266]
              - cell "3 · Low Stock" [ref=f3e267]
              - cell "—" [ref=f3e269]
              - cell [ref=f3e270]:
                - generic [ref=f3e271]:
                  - button "Edit SlimBar 72W LED Light Bar" [ref=f3e272] [cursor=pointer]: Edit
                  - button "Delete SlimBar 72W LED Light Bar" [ref=f3e273] [cursor=pointer]: Delete
            - row [ref=f3e274]:
              - cell [ref=f3e275]:
                - img "FogMaster Dual Beam Set" [ref=f3e276]
              - cell "378daab5" [ref=f3e277]
              - cell "FogMaster Dual Beam Set" [ref=f3e278]
              - cell "Advika" [ref=f3e279]
              - cell "Lights" [ref=f3e280]
              - cell "₹7299.00" [ref=f3e281]
              - cell "20 · In Stock" [ref=f3e282]
              - cell "—" [ref=f3e284]
              - cell [ref=f3e285]:
                - generic [ref=f3e286]:
                  - button "Edit FogMaster Dual Beam Set" [ref=f3e287] [cursor=pointer]: Edit
                  - button "Delete FogMaster Dual Beam Set" [ref=f3e288] [cursor=pointer]: Delete
            - row [ref=f3e289]:
              - cell [ref=f3e290]:
                - img "Steering Cover + Knob Combo" [ref=f3e291]
              - cell "378daab4" [ref=f3e292]
              - cell "Steering Cover + Knob Combo" [ref=f3e293]
              - cell "Advika" [ref=f3e294]
              - cell "Interior & Comfort" [ref=f3e295]
              - cell "₹649.00" [ref=f3e296]
              - cell "80 · In Stock" [ref=f3e297]
              - cell "—" [ref=f3e299]
              - cell [ref=f3e300]:
                - generic [ref=f3e301]:
                  - button "Edit Steering Cover + Knob Combo" [ref=f3e302] [cursor=pointer]: Edit
                  - button "Delete Steering Cover + Knob Combo" [ref=f3e303] [cursor=pointer]: Delete
            - row [ref=f3e304]:
              - cell [ref=f3e305]:
                - img "24V Charger + USB Hub" [ref=f3e306]
              - cell "378daab3" [ref=f3e307]
              - cell "24V Charger + USB Hub" [ref=f3e308]
              - cell "Advika" [ref=f3e309]
              - cell "Electrical & Wiring" [ref=f3e310]
              - cell "₹749.00" [ref=f3e311]
              - cell "70 · In Stock" [ref=f3e312]
              - cell "—" [ref=f3e314]
              - cell [ref=f3e315]:
                - generic [ref=f3e316]:
                  - button "Edit 24V Charger + USB Hub" [ref=f3e317] [cursor=pointer]: Edit
                  - button "Delete 24V Charger + USB Hub" [ref=f3e318] [cursor=pointer]: Delete
            - row [ref=f3e319]:
              - cell [ref=f3e320]:
                - img "Heavy Duty Mud Flap Set" [ref=f3e321]
              - cell "378daab2" [ref=f3e322]
              - cell "Heavy Duty Mud Flap Set" [ref=f3e323]
              - cell "Advika" [ref=f3e324]
              - cell "Exterior Styling" [ref=f3e325]
              - cell "₹899.00" [ref=f3e326]
              - cell "50 · In Stock" [ref=f3e327]
              - cell "—" [ref=f3e329]
              - cell [ref=f3e330]:
                - generic [ref=f3e331]:
                  - button "Edit Heavy Duty Mud Flap Set" [ref=f3e332] [cursor=pointer]: Edit
                  - button "Delete Heavy Duty Mud Flap Set" [ref=f3e333] [cursor=pointer]: Delete
        - generic [ref=f3e334]:
          - paragraph [ref=f3e335]:
            - text: Page 1 of 2
            - generic [ref=f3e336]: (16 total)
          - generic [ref=f3e337]:
            - button "Previous" [disabled] [ref=f3e338]:
              - generic [ref=f3e339]: 
              - text: Previous
            - button "Next" [ref=f3e340] [cursor=pointer]:
              - text: Next
              - generic [ref=f3e341]: 
  - contentinfo [ref=f3e342]:
    - generic [ref=f3e343]: © 2024 E-commerce Admin Panel. All rights reserved.
```

# Test source

```ts
  124 | 
  125 |     const inventoryCheck = await realApi.getInventory(productId, adminToken);
  126 |     expect(inventoryCheck.body.data.stock).toBe(stockAfter);
  127 |   });
  128 | 
  129 |   test('finds a real customer order, ships it, and the status change is real (DB + API)', async () => {
  130 |     const page = adminPage;
  131 |     // Self-contained rather than depending on frontend-improved's suite
  132 |     // having run first: places a real order via the real API as a real
  133 |     // customer, so this spec deterministically has a 'confirmed' order to
  134 |     // work with regardless of run order.
  135 |     const customerToken = await realApi.loginCustomer(E2E_CUSTOMER_PHONE, E2E_OTP);
  136 |     const address = await realApi.createAddress(
  137 |       { name: 'E2E Admin-Journey Customer', phone: '9876500094', pincode: '411001', city: 'Pune', houseArea: '1 Ship Lane', area: 'Camp', state: 'Maharashtra' },
  138 |       customerToken
  139 |     );
  140 |     const products = await realApi.get('/api/products?search=Reflective+Safety');
  141 |     const buyProductId = products.body.data[0].id;
  142 |     await realApi.addToCart(buyProductId, 1, customerToken);
  143 |     const draft = await realApi.createDraftOrder(address.body.data.id, customerToken);
  144 |     // handleCODOrder (payment.service.js) requires the draft order's own
  145 |     // id in the body — not inferred from the authenticated user alone.
  146 |     const placed = await realApi.placeCodOrder(draft.body.data.id, customerToken);
  147 |     expect(placed.status).toBe(200);
  148 |     // handleCODOrder's real response nests the order under `data.order`,
  149 |     // not `data` directly (see payment.service.js).
  150 |     orderId = placed.body.data.order.id;
  151 | 
  152 |     await page.goto(`/orders/${orderId}`);
  153 |     await expect(page.getByText('Order Summary')).toBeVisible({ timeout: 10000 });
  154 |     await expect(page.getByTestId('order-create-shipment-btn')).toBeVisible({ timeout: 10000 });
  155 | 
  156 |     // Real POST /api/shipping/:orderId/create -> real shipping.service.js
  157 |     // -> real HTTP call to the mock Ekart server -> real Prisma Shipment
  158 |     // row + real Order.status update to 'shipped'.
  159 |     const shipRes = page.waitForResponse((res) => res.url().includes(`/api/shipping/${orderId}/create`));
  160 |     await page.getByTestId('order-create-shipment-btn').click();
  161 |     expect((await shipRes).status()).toBe(200);
  162 |     await expect(page.getByTestId('order-refresh-tracking-btn')).toBeVisible({ timeout: 10000 });
  163 | 
  164 |     const orderCheck = await realApi.getOrder(orderId, adminToken);
  165 |     expect(orderCheck.body.data.status).toBe('shipped');
  166 |   });
  167 | 
  168 |   test('the customer sees the real updated order status on the real storefront', async ({ page }) => {
  169 |     const customerToken = await realApi.loginCustomer(E2E_CUSTOMER_PHONE, E2E_OTP);
  170 |     await page.goto(FRONTEND_REAL_BASE_URL);
  171 |     await page.evaluate((t) => window.sessionStorage.setItem('authToken', t), customerToken);
  172 |     await page.goto(`${FRONTEND_REAL_BASE_URL}/orders/${orderId}/track`);
  173 | 
  174 |     await expect(page.getByText(`#${orderId}`)).toBeVisible({ timeout: 15000 });
  175 |     await expect(page.getByText('Shipped', { exact: true }).first()).toBeVisible({ timeout: 10000 });
  176 |   });
  177 | 
  178 |   // Runs LAST deliberately: describe.serial skips every test after the
  179 |   // first failure, and this one is expected to fail in this environment
  180 |   // (see the file header's ENVIRONMENT NOTE) — every other, unrelated real
  181 |   // admin-journey test above must still get to run.
  182 |   test('creates a real product with a real S3-uploaded image', async () => {
  183 |     const page = adminPage;
  184 |     productName = uniqueProductName('AdminCreated');
  185 |     const imageName = e2eFixtureImageName();
  186 | 
  187 |     await page.goto('/products');
  188 |     await page.getByTestId('products-add-new-btn').click();
  189 |     await expect(page.getByTestId('product-form')).toBeVisible();
  190 | 
  191 |     await page.getByTestId('product-name-input').fill(productName);
  192 |     await page.getByTestId('product-category-checkbox-Safety & Tools').check();
  193 |     await page.getByTestId('product-brand-input').fill('Advika E2E');
  194 |     await page.getByTestId('product-price-input').fill('777');
  195 |     await page.getByTestId('product-stock-input').fill('25');
  196 |     await page.getByTestId('product-description-input').fill('Created by the real admin E2E layer.');
  197 |     await page.getByTestId('product-images-input').setInputFiles({
  198 |       name: imageName,
  199 |       mimeType: 'image/png',
  200 |       buffer: LOGO_BYTES,
  201 |     });
  202 | 
  203 |     const createRes = page.waitForResponse(
  204 |       (res) => res.url().endsWith('/api/products') && res.request().method() === 'POST'
  205 |     );
  206 |     await page.getByTestId('product-form-submit-btn').click();
  207 |     const created = await createRes;
  208 |     expect([200, 201]).toContain(created.status());
  209 |     const jobId = (await created.json()).data.jobId;
  210 |     expect(jobId).toBeTruthy();
  211 | 
  212 |     // Real async pipeline: BullMQ image-processing-queue -> real sharp
  213 |     // compression -> real S3 PutObject -> real Prisma product.create. Poll
  214 |     // the REAL job-status endpoint until it actually completes — the UI
  215 |     // does the same polling (see api/productJobs.js), this just asserts on
  216 |     // the network truth directly instead of only the resulting banner text.
  217 |     let jobStatus;
  218 |     for (let attempt = 0; attempt < 30; attempt += 1) {
  219 |       const res = await realApi.getProductJobStatus(jobId, adminToken);
  220 |       jobStatus = res.body.data;
  221 |       if (jobStatus.state === 'completed' || jobStatus.state === 'failed') break;
  222 |       await new Promise((r) => setTimeout(r, 1000));
  223 |     }
> 224 |     expect(jobStatus.state).toBe('completed');
      |                             ^ Error: expect(received).toBe(expected) // Object.is equality
  225 |     productId = jobStatus.result.id;
  226 |     const uploadedImageUrls = jobStatus.result.images;
  227 |     expect(uploadedImageUrls.length).toBeGreaterThan(0);
  228 |     expect(uploadedImageUrls[0]).toContain('e2e-fixture-');
  229 |     recordUploadedImageUrls(uploadedImageUrls);
  230 | 
  231 |     await expect(page.getByTestId('product-form')).not.toBeVisible({ timeout: 15000 });
  232 |     await expect(page.getByText('Product created.')).toBeVisible();
  233 | 
  234 |     // Verify through the real API/DB, independent of the UI's own claim.
  235 |     const productCheck = await realApi.getProduct(productId);
  236 |     expect(productCheck.status).toBe(200);
  237 |     expect(productCheck.body.data.name).toBe(productName);
  238 |     expect(productCheck.body.data.price).toBe(777);
  239 |     expect(productCheck.body.data.images[0]).toContain('s3');
  240 |   });
  241 | });
  242 | 
```