// src/layout/AdminRoute.jsx
//
// Every protected route needs both the auth guard and the shell. Keeping
// them composed here means App.js's route table stays a flat, readable
// list instead of repeating `<ProtectedRoute><AdminLayout>` on every line.
import ProtectedRoute from '../ProtectedRoute';
import AdminLayout from './AdminLayout';

const AdminRoute = ({ children }) => (
  <ProtectedRoute>
    <AdminLayout>{children}</AdminLayout>
  </ProtectedRoute>
);

export default AdminRoute;
