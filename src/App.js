// src/App.js
import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/AdminLoginPage/LoginPage';
import AdminRoute from './layout/AdminRoute';
import ErrorBoundary from './layout/ErrorBoundary';
import LoadingState from './layout/LoadingState';
import { AuthProvider } from './context/AuthContext';

// LoginPage stays eagerly imported — it's the first thing every visitor
// sees and there's no auth gate to wait behind. Every page beyond it is
// only ever reached after that gate, so splitting them out keeps them out
// of the bundle a not-yet-logged-in visitor has to download at all
// (previously all 11 routes shipped in one bundle regardless of which
// page, if any, the visitor could actually reach).
const ContentPage = lazy(() => import('./pages/Content'));
const AdminDashboard = lazy(() => import('./pages/Dashboard'));
const AnalyticsPage = lazy(() => import('./pages/Analytics'));
const Alerts = lazy(() => import('./pages/Alerts'));
const ProductsPage = lazy(() => import('./pages/Products'));
const Order = lazy(() => import('./pages/Orders'));
const OrderViewPage = lazy(() => import('./pages/orderviewpage'));
const Users = lazy(() => import('./pages/Users'));
const UserViewPage = lazy(() => import('./pages/userviewpage'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Router>
      {/* Outermost safety net — catches a crash even before AdminLayout
          (or AuthProvider itself) is able to mount. AdminLayout adds its
          own, narrower boundary around just page content so a crash on
          one screen doesn't take the whole shell down; this one is the
          backstop for everything else. */}
      <ErrorBoundary>
        {/* AuthProvider must live inside the Router — it uses useNavigate()
            to redirect on logout / session invalidation. */}
        <AuthProvider>
          <Suspense fallback={<LoadingState label="Loading…" />}>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route path="/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/alerts" element={<AdminRoute><Alerts /></AdminRoute>} />
              <Route path="/analytics" element={<AdminRoute><AnalyticsPage /></AdminRoute>} />
              <Route path="/content"   element={<AdminRoute><ContentPage /></AdminRoute>} />
              <Route path="/products"  element={<AdminRoute><ProductsPage /></AdminRoute>} />
              <Route path="/orders"    element={<AdminRoute><Order /></AdminRoute>} />
              <Route path="/orders/:id" element={<AdminRoute><OrderViewPage /></AdminRoute>} />
              <Route path="/users"     element={<AdminRoute><Users /></AdminRoute>} />
              <Route path="/users/:id" element={<AdminRoute><UserViewPage /></AdminRoute>} />
              <Route path="/inventory" element={<AdminRoute><Inventory /></AdminRoute>} />
              <Route path="/settings"  element={<AdminRoute><Settings /></AdminRoute>} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
