// src/pages/AdminDashboard.jsx
import DashboardCards from "../component/Adminlogin/DashboardOverview";
import PageHeader from "../layout/PageHeader";

const AdminDashboard = () => {
  return (
    <>
      <PageHeader title="Dashboard" description="Store performance at a glance." />
      <DashboardCards />
    </>
  );
};

export default AdminDashboard;
