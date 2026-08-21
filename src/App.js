// src/App.js
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/AdminLoginPage/LoginPage';
import ContentPage from './pages/Content';
import AdminDashboard from './pages/Dashboard';
import AnalyticsPage from './pages/Analytics';
import Alerts from './pages/Alerts';
import ProductsPage from './pages/Products';
import Order from './pages/Orders';
import OrderViewPage from './pages/orderviewpage';
import Users from './pages/Users';
import UserViewPage from './pages/userviewpage';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';
import AdminRoute from './layout/AdminRoute';
import ErrorBoundary from './layout/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';

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
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
