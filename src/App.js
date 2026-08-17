// src/App.js
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/AdminLoginPage/LoginPage';
import ContentPage from './pages/Content';
import AdminDashboard from './pages/Dashboard';
import ProductsPage from './pages/Products';
import Order from './pages/Orders';
import OrderViewPage from './pages/orderviewpage';
import Users from './pages/Users';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';
import AdminRoute from './layout/AdminRoute';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <Router>
      {/* AuthProvider must live inside the Router — it uses useNavigate()
          to redirect on logout / session invalidation. */}
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/content"   element={<AdminRoute><ContentPage /></AdminRoute>} />
          <Route path="/products"  element={<AdminRoute><ProductsPage /></AdminRoute>} />
          <Route path="/orders"    element={<AdminRoute><Order /></AdminRoute>} />
          <Route path="/orders/:id" element={<AdminRoute><OrderViewPage /></AdminRoute>} />
          <Route path="/users"     element={<AdminRoute><Users /></AdminRoute>} />
          <Route path="/inventory" element={<AdminRoute><Inventory /></AdminRoute>} />
          <Route path="/settings"  element={<AdminRoute><Settings /></AdminRoute>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
