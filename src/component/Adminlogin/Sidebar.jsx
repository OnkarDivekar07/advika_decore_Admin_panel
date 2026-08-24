// src/components/Sidebar.jsx
//
// Renders once, but behaves as two different things depending on
// viewport: on large screens it's a normal sticky column that's always
// visible (isOpen is irrelevant there — see the `lg:` overrides below);
// below that breakpoint it becomes an off-canvas drawer controlled by
// AdminLayout's sidebarOpen state, with its own backdrop, Escape-to-close,
// and focus handling so keyboard/touch users aren't stuck behind it.
import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '../../layout/navConfig';

function Sidebar({ isOpen = false, onClose = () => {} }) {
  const location = useLocation();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    // Send focus into the drawer when it opens so keyboard/screen-reader
    // users land on the nav itself rather than staying behind it.
    panelRef.current?.querySelector('a')?.focus();

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop — only ever rendered/interactive on the mobile drawer;
          large screens never show it (lg:hidden). */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-[35] bg-black/40 transition-opacity duration-200 lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        ref={panelRef}
        id="admin-sidebar"
        aria-label="Admin navigation"
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto bg-white p-4 shadow-xl transition-transform duration-200 ease-in-out
          lg:sticky lg:top-20 lg:z-0 lg:h-fit lg:w-64 lg:max-w-none lg:translate-x-0 lg:rounded-lg lg:p-6 lg:shadow-md
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <span className="text-sm font-semibold uppercase tracking-wide text-gray-500">Menu</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <i className="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <nav className="space-y-1">
          {NAV_ITEMS.map(({ to, icon, label }) => {
            const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);
            return (
              <Link
                key={to}
                to={to}
                aria-current={isActive ? 'page' : undefined}
                data-testid={`nav-link-${to.replace(/^\//, '')}`}
                className={`flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                  isActive
                    ? 'bg-blue-100 font-semibold text-gray-900'
                    : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                <i
                  className={`fas fa-${icon} w-4 text-center ${isActive ? 'text-blue-600' : ''}`}
                  aria-hidden="true"
                ></i>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
