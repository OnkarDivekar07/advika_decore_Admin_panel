// src/layout/Breadcrumbs.jsx
import { Link, useLocation, useParams } from 'react-router-dom';
import { NAV_ITEMS } from './navConfig';

// Two nested/dynamic routes exist today (/orders/:id, /users/:id), so this
// stays a couple of explicit cases rather than a generic route-matching
// engine — simplest thing that's actually correct for the routes App.js
// registers.
function crumbsFor(pathname, id) {
  if (pathname === '/dashboard') {
    return [{ label: 'Dashboard' }];
  }

  if (pathname.startsWith('/orders/') && id) {
    return [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Orders', to: '/orders' },
      { label: `Order #${id}` },
    ];
  }

  if (pathname.startsWith('/users/') && id) {
    return [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Users', to: '/users' },
      { label: 'Customer' },
    ];
  }

  const navItem = NAV_ITEMS.find(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`)
  );

  const crumbs = [{ label: 'Dashboard', to: '/dashboard' }];
  if (navItem && navItem.to !== '/dashboard') {
    crumbs.push({ label: navItem.label });
  }
  return crumbs;
}

const Breadcrumbs = () => {
  const { pathname } = useLocation();
  const { id } = useParams();
  const crumbs = crumbsFor(pathname, id);

  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && (
                <i className="fas fa-chevron-right text-[10px] text-gray-300" aria-hidden="true"></i>
              )}
              {crumb.to && !isLast ? (
                <Link
                  to={crumb.to}
                  className="rounded hover:text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={isLast ? 'font-medium text-gray-700' : ''}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
