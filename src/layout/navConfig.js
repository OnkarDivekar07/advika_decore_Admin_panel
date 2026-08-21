// src/layout/navConfig.js
//
// Single source of truth for "what routes exist in the admin shell and
// what are they called". Sidebar renders this list; Breadcrumbs reads the
// same list so a page's nav label and its breadcrumb label can never
// drift apart the way two hand-written copies eventually would.
export const NAV_ITEMS = [
  { to: '/dashboard', icon: 'tachometer-alt', label: 'Dashboard' },
  { to: '/alerts', icon: 'bell', label: 'Alerts' },
  { to: '/analytics', icon: 'chart-line', label: 'Analytics' },
  { to: '/products', icon: 'box-open', label: 'Products' },
  { to: '/orders', icon: 'shopping-cart', label: 'Orders' },
  { to: '/users', icon: 'users', label: 'Users' },
  { to: '/inventory', icon: 'warehouse', label: 'Inventory' },
  { to: '/content', icon: 'image', label: 'Content' },
  { to: '/settings', icon: 'cogs', label: 'Settings' },
];
