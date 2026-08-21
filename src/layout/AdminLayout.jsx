// src/layout/AdminLayout.jsx
//
// Single place that assembles the admin shell (header, nav, breadcrumb
// trail, footer). Previously every page imported Header/Sidebar/Footer
// itself and re-wrote the same wrapper markup with small inconsistencies
// (some had a Footer, some didn't; some constrained width, some didn't).
// Pages now only render their own title/actions/content — this owns the
// chrome, and owns the one bit of shared UI state (is the mobile nav
// drawer open) that the header's hamburger button and the sidebar both
// need to agree on.
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../component/Adminlogin/Header';
import Sidebar from '../component/Adminlogin/Sidebar';
import Footer from '../component/Adminlogin/footer';
import Breadcrumbs from './Breadcrumbs';
import ErrorBoundary from './ErrorBoundary';
import OfflineBanner from './OfflineBanner';

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const mainRef = useRef(null);
  const isFirstRender = useRef(true);

  // Navigating (via a nav link, breadcrumb, or browser back/forward)
  // should always close the mobile drawer — otherwise it stays open,
  // covering the very page the admin just chose.
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // A route change re-renders the page's content in place — the nav link
  // or breadcrumb the admin just activated is gone or re-styled, so
  // without this the browser is left with no real focus target and
  // silently resets it to <body>, disorienting keyboard and
  // screen-reader users (nothing gets announced, and Tab starts back
  // from the very top of the page). Moving focus onto the main region
  // matches the pattern the skip link above already uses. Skipped on the
  // very first render so loading the app doesn't yank focus away from
  // wherever the browser naturally puts it (e.g. the address bar).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [location.pathname]);

  // Lock background scroll while the mobile drawer is open so the page
  // behind it doesn't scroll along with a touch drag on the overlay.
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>

      <OfflineBanner />

      <Header sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen((open) => !open)} />

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 min-w-0 lg:gap-6 lg:px-6 xl:px-8">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main
          ref={mainRef}
          id="main-content"
          tabIndex={-1}
          className="w-full min-w-0 flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-0"
        >
          <Breadcrumbs />
          {/* Keyed on the route so navigating away from a crashed page
              (via the sidebar, a breadcrumb, or browser back/forward —
              all still fully usable since only this boundary, not the
              whole shell, caught the error) always mounts the next page
              fresh rather than staying stuck showing the fallback UI. */}
          <ErrorBoundary key={location.pathname} compact>
            {children}
          </ErrorBoundary>
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default AdminLayout;
