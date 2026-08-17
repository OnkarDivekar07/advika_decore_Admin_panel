// src/components/Header.jsx
import { useAuth } from '../../context/AuthContext';

function Header({ onMenuClick = () => {}, sidebarOpen = false }) {
  // logout() is the single implementation of "clear admin session state"
  // (see AuthContext) — every page that renders this Header gets a
  // working logout for free instead of re-deriving it.
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white shadow-md">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-expanded={sidebarOpen}
            aria-controls="admin-sidebar"
            aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="-ml-1 shrink-0 rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:hidden"
          >
            <i className={`fas ${sidebarOpen ? 'fa-xmark' : 'fa-bars'} fa-lg`} aria-hidden="true"></i>
          </button>

          <img
            src="/admin-logo.png"
            alt="E-commerce Admin Panel logo"
            className="h-9 w-9 shrink-0 rounded sm:h-10 sm:w-10"
          />
          <h1 className="min-w-0 truncate text-lg font-semibold text-gray-800 sm:text-2xl">
            Advika Decore Admin
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-4">
          <button
            type="button"
            aria-label="Notifications, 5 unread"
            className="relative rounded-md p-2 text-gray-600 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <i className="fas fa-bell fa-lg" aria-hidden="true"></i>
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-semibold text-white">
              5
            </span>
          </button>

          <button
            type="button"
            className="hidden items-center space-x-2 rounded-md p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:flex"
          >
            <span className="font-medium text-gray-700">ADMIN</span>
            <i className="fas fa-chevron-down text-gray-500" aria-hidden="true"></i>
          </button>

          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1 rounded-md p-2 text-sm text-red-500 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
            <span className="hidden sm:block">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
