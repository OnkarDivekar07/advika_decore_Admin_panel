// src/pages/ContentManagement.jsx
import React from 'react';
import BannerManagement from '../component/Adminlogin/bannerManagemen';
import NewArrivalsManagement from '../component/Adminlogin/NewArrivalsManagement';
import SiteContentManagement from '../component/Adminlogin/SiteContentManagement';
import PageHeader from '../layout/PageHeader';
import Panel from '../layout/Panel';

const ContentManagement = () => {
  return (
    <>
      <PageHeader
        title="Content Management"
        description="Manage homepage banners, highlighted new arrivals, and storefront text."
      />
      <Panel aria-label="Content management" id="content">
        <div className="space-y-8">
          <BannerManagement />
          <NewArrivalsManagement />
          <SiteContentManagement />
        </div>
      </Panel>
    </>
  );
};

export default ContentManagement;
