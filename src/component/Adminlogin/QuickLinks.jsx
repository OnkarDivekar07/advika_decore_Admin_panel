// src/component/Adminlogin/QuickLinks.jsx
//
// Static navigation shortcuts to the admin screens an operator jumps to
// most often right after checking the dashboard. These are plain routes
// within this app (see src/App.js) — no data fetching here, so there's
// nothing to load/error/retry.
import { Link } from 'react-router-dom';

const LINKS = [
  {
    to: '/orders',
    icon: 'shopping-cart',
    label: 'Orders',
    description: 'View and manage all orders',
    color: 'indigo',
  },
  {
    to: '/inventory',
    icon: 'warehouse',
    label: 'Low Stock',
    description: 'Check stock levels and low-stock items',
    color: 'red',
  },
  {
    to: '/products',
    icon: 'box-open',
    label: 'Products',
    description: 'Manage the product catalog',
    color: 'purple',
  },
  {
    to: '/users',
    icon: 'users',
    label: 'Customers',
    description: 'Browse registered customers',
    color: 'blue',
  },
];

const COLOR_CLASSES = {
  indigo: 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white',
  red: 'bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white',
  purple: 'bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
  blue: 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
};

function QuickLinks() {
  return (
    <section aria-label="Quick links">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Quick links
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {LINKS.map(({ to, icon, label, description, color }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-center space-x-3 rounded-lg bg-white p-4 shadow transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${COLOR_CLASSES[color] || COLOR_CLASSES.blue}`}>
              <i className={`fas fa-${icon}`} aria-hidden="true"></i>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-800">{label}</p>
              <p className="truncate text-xs text-gray-500">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default QuickLinks;
