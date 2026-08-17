// src/pages/ContentManagement.jsx
import React from 'react';
import BannerManagement from '../component/Adminlogin/bannerManagemen';
import NewArrivalsManagement from '../component/Adminlogin/NewArrivalsManagement';
import PageHeader from '../layout/PageHeader';
import Panel from '../layout/Panel';

const ContentManagement = () => {
  return (
    <>
      <PageHeader
        title="Content Management"
        description="Manage homepage banners and highlighted new arrivals."
      />
      <Panel aria-label="Content management" id="content">
        <div className="space-y-8">
          <BannerManagement />
          <NewArrivalsManagement />
        </div>
      </Panel>
    </>
  );
};

export default ContentManagement;
