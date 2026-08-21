# Advika E-Commerce — Admin Panel (admin_panel_fixed)

Internal dashboard for managing the Advika e-commerce platform — products, inventory, orders, users, homepage content, and settings. Built with **React 19 (Create React App) + Tailwind CSS 4**.

---

## 1. Tech Stack

| Layer            | Technology                                   |
|------------------|-----------------------------------------------|
| Framework        | React 19                                       |
| Tooling          | Create React App (react-scripts 5)             |
| Styling          | Tailwind CSS 4                                 |
| Routing          | react-router-dom v7                            |
| HTTP client      | axios                                          |
| Icons            | Font Awesome                                    |
| Testing          | React Testing Library + Jest (via CRA)          |

---

## 2. Project Structure

```
admin_panel_fixed/
├── public/                       # Static assets, admin logo, favicon
├── src/
│   ├── index.js                  # Entry point
│   ├── App.js                    # Route definitions
│   ├── ProtectedRoute.jsx        # Route guard for authenticated admin pages
│   ├── layout/                   # Admin shell: header, responsive sidebar, breadcrumbs,
│   │   │                         # page title/actions, loading/empty/error states, shared
│   │   │                         # Button/Badge — see "Admin Shell" section below
│   │   ├── AdminRoute.jsx        # ProtectedRoute + AdminLayout, used by every protected route
│   │   ├── AdminLayout.jsx       # Header + Sidebar + Breadcrumbs + Footer shell
│   │   ├── Breadcrumbs.jsx, PageHeader.jsx, Panel.jsx
│   │   ├── LoadingState.jsx, EmptyState.jsx, ErrorState.jsx
│   │   ├── Button.jsx, Badge.jsx
│   │   └── navConfig.js          # Single source of nav items (Sidebar + Breadcrumbs)
│   ├── pages/
│   │   ├── AdminLoginPage/LoginPage.jsx   # Admin login screen
│   │   ├── Dashboard.jsx                  # Dashboard overview
│   │   ├── Content.jsx                    # Homepage content management (banners, new arrivals)
│   │   ├── Products.jsx                   # Product listing & management
│   │   ├── Orders.jsx                     # Orders listing
│   │   ├── orderviewpage.jsx              # Single order detail view
│   │   ├── Users.jsx                      # Registered users list (search/role filter/sort, paginated)
│   │   ├── userviewpage.jsx               # Single customer detail view
│   │   ├── Inventory.jsx                  # Stock/inventory management
│   │   └── Settings.jsx                   # Admin settings
│   └── component/Adminlogin/
│       ├── Header.jsx, Sidebar.jsx, footer.jsx, Logo.jsx   # Shell building blocks (used via layout/AdminLayout)
│       ├── DashboardOverview.jsx                            # Dashboard stat cards
│       ├── bannerManagemen.jsx, NewArrivalsManagement.jsx   # Content management widgets
│       ├── ProductForm.jsx                                  # Product create/edit form
│       ├── InputField.jsx, SubmitButton.jsx                 # Reusable login form controls
```

### Admin Shell (`src/layout/`)

Every protected route is wrapped in `<AdminRoute>` (auth guard + shell) instead of each page
hand-rolling its own header/sidebar/footer:

- **Responsive navigation** — `Sidebar.jsx` is a normal sticky column on `lg:` screens and an
  off-canvas drawer below that, with a backdrop, Escape-to-close, focus management, and a
  hamburger toggle in `Header.jsx`. It closes automatically on navigation.
- **Breadcrumbs** — auto-derived from the current route via `navConfig.js`, so page labels and
  nav labels can't drift apart.
- **`PageHeader`** — consistent title + description + action-buttons row for every page.
- **`Panel`** — the shared "white card" wrapper used for page content.
- **`LoadingState` / `EmptyState` / `ErrorState`** — consistent, accessible (`role="status"` /
  `role="alert"`) loading, empty-list, and error-with-retry treatments used across every page.
- **`Button` / `Badge`** — shared variants (`primary`, `secondary`, `ghost`, `danger`,
  `dangerOutline`) so destructive actions (delete, logout) are always visually distinct from
  neutral ones, and a status pill for order/stock status.
- Tables wrap in a scoped `overflow-x-auto` and hide secondary columns at small breakpoints, so
  no page requires horizontally scrolling the whole viewport.

---

## 3. Prerequisites

- Node.js 18+ and npm
- The backend API running and reachable (see `backend 2.0` README)
- An existing admin user in the database (`role: "admin"`) to log in with

---

## 4. Environment Variables

Create a `.env` file in `admin_panel_fixed/`:

```env
REACT_APP_API_URL='http://localhost:5000'
```

This points the admin panel at the backend API. Update it to your deployed backend URL for staging/production builds (CRA inlines `REACT_APP_*` variables at build time).

---

## 5. Installation & Running Locally

```bash
cd admin_panel_fixed

# 1. Install dependencies
npm install

# 2. Start the development server
npm start
```

The app opens at `http://localhost:3000` by default.

Log in at `/` using an admin account (email/password, authenticated against `POST /api/admin/login` on the backend). All other routes are wrapped in `ProtectedRoute` and require a valid session/token.

---

## 6. NPM Scripts

| Script          | Description                                              |
|------------------|------------------------------------------------------------|
| `npm start`       | Runs the app in development mode with hot reload          |
| `npm run build`   | Builds an optimized production bundle to `build/`           |
| `npm test`         | Runs the test suite in interactive watch mode               |
| `npm run eject`   | Ejects CRA config (one-way operation, use with caution)      |

---

## 7. Routes

| Path               | Page                  | Access              |
|---------------------|-----------------------|----------------------|
| `/`                  | Admin login           | Public               |
| `/dashboard`         | Dashboard overview     | Protected (admin)    |
| `/content`           | Homepage content (banners, new arrivals) | Protected (admin) |
| `/products`          | Product management      | Protected (admin)    |
| `/orders`            | Order list              | Protected (admin)    |
| `/orders/:id`        | Order detail view        | Protected (admin)    |
| `/users`             | Registered users (search/filter/sort) | Protected (admin) |
| `/users/:id`         | Customer detail view      | Protected (admin)    |
| `/inventory`         | Inventory management      | Protected (admin)    |
| `/settings`          | Admin settings             | Protected (admin)    |

---

## 8. Key Features

- **Dashboard** with business stats, user stats, and recent orders at a glance.
- **Product management** — create/edit products with images, view as cards, manage details via `ProductForm`.
- **Content management** — homepage banners (upload with link URL, preview, progress, client-side validation, broken-image recovery) and new-arrival products, both backed live by `GET/POST/DELETE /api/homepage/banners` and `GET/PATCH /api/homepage/new-arrivals`. Every destructive action (delete a banner, remove a new arrival) goes through `ConfirmDialog` — never a native `confirm()`.
- **Order management** — view all orders and drill into individual order details.
- **Customer management** — paginated, backend-sorted/filtered user directory (search by name/email/phone, filter by role) with a per-customer detail view (profile, all addresses, recent orders, full-history order totals). No credentials, OTPs, tokens, or payment secrets are ever fetched or rendered, and role changes are intentionally not exposed — there is no protected backend operation for it yet.
- **Inventory management** — track and update stock levels.
- **Protected routing** via `ProtectedRoute.jsx`, gating all admin pages behind authentication.

---

## 9. Building for Production

```bash
npm run build
```

Outputs a static, minified production build to `build/`, ready to deploy behind any static host or reverse proxy. Ensure `REACT_APP_API_URL` is set correctly before building, since CRA bakes environment variables into the build at compile time.

---

## 10. Notes

- This app was bootstrapped with Create React App; standard CRA behavior (env handling, build output, `eject`) applies.
- `.env` is git-ignored — do not commit real credentials or internal API URLs if they differ by environment.
- Admin authentication and route protection depend on the backend's `/api/admin/login` endpoint and the `authorizeAdminOnly` middleware — the backend must be reachable for login to succeed.
