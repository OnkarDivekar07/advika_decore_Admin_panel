// src/components/Header.jsx
//
// PHASE 14 — the notification bell used to show a hardcoded "5 unread"
// badge with no backend behind it. It now reflects the real total across
// every operational-alerts section (GET /api/admin/alerts — see
// admin.service.js's getOperationalAlerts): low-stock products, orders
// still awaiting confirmation, payment exceptions, and shipment
// exceptions. Clicking it goes straight to the Alerts page, which is the
// only place any of this is broken down. No badge at all when the count
// is 0 — an empty badge reading "0" would just be visual noise mimicking
// an alert that isn't there.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/apiClient';

function Header({ onMenuClick = () => {}, sidebarOpen = false }) {
  // logout() is the single implementation of "clear admin session state"
  // (see AuthContext) — every page that renders this Header gets a
  // working logout for free instead of re-deriving it.
  const { logout } = useAuth();

  const [alertsCount, setAlertsCount] = useState(null);

  useEffect(() => {
    let cancelled = false;

    apiClient
      .get('/api/admin/alerts')
      .then((res) => {
        if (cancelled) return;
        const data = res.data.data || {};
        const total =
          (data.lowStock?.count || 0) +
          (data.pendingOrders?.count || 0) +
          (data.paymentExceptions?.count || 0) +
          (data.shipmentExceptions?.count || 0);
        setAlertsCount(total);
      })
      .catch(() => {
        // Silent — the bell simply shows no badge rather than a broken
        // header if this call fails; Alerts.jsx itself shows the real
        // error state if the admin navigates there.
        if (!cancelled) setAlertsCount(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const hasAlerts = typeof alertsCount === 'number' && alertsCount > 0;

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
            data-testid="header-menu-toggle-btn"
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
          <Link
            to="/alerts"
            aria-label={
              hasAlerts
                ? `Operational alerts, ${alertsCount} needing attention`
                : 'Operational alerts'
            }
            data-testid="header-alerts-bell"
            className="relative rounded-md p-2 text-gray-600 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <i className="fas fa-bell fa-lg" aria-hidden="true"></i>
            {hasAlerts && (
              <span
                className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-semibold text-white"
                data-testid="header-alerts-badge"
              >
                {alertsCount > 99 ? '99+' : alertsCount}
              </span>
            )}
          </Link>

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
            data-testid="header-logout-btn"
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
