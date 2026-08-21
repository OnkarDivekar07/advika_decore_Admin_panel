// src/pages/Analytics.jsx
import AnalyticsOverview from "../component/Adminlogin/AnalyticsOverview";
import PageHeader from "../layout/PageHeader";

const AnalyticsPage = () => {
  return (
    <>
      <PageHeader
        title="Analytics"
        description="Date-ranged revenue and order KPIs, computed on the backend."
      />
      <AnalyticsOverview />
    </>
  );
};

export default AnalyticsPage;
