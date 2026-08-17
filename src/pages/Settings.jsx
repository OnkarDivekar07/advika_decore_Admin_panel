import React from 'react';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../layout/PageHeader';
import Panel from '../layout/Panel';
import Button from '../layout/Button';

const Settings = () => {
  // Same logout() as Header — previously this page had its own
  // hand-rolled copy that forgot to clear 'user' from storage, so a
  // logout from here left a stale user object behind.
  const { logout: handleLogout } = useAuth();

  return (
    <>
      <PageHeader title="Settings" description="Admin account and session settings." />

      <Panel aria-label="Settings">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-700">Account Settings</h3>
          <div className="mt-2">
            <Button variant="danger" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
              Logout
            </Button>
          </div>
        </div>
      </Panel>
    </>
  );
};

export default Settings;
