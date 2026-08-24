// src/pages/Settings.jsx
//
// PHASE 13 — deliberately contains ONLY functionality the backend
// actually supports today:
//   - Account/session info: name/email/role, straight from AuthContext's
//     `user` — which is itself never anything the frontend invented; it's
//     either the direct response of POST /api/admin/login or the
//     re-confirmed result of GET /api/admin/me (see AuthContext.jsx).
//   - Logout: clears local session state via the same logout() every
//     other screen uses (see AuthContext.jsx) — there's no server-side
//     session/token-blacklist table to call out to (admin auth is a
//     stateless 1-hour JWT, see backend/src/utils/generateToken.js), so
//     "logout" IS clearing local state; there's no missing backend call
//     being skipped here.
//   - System status: GET /health (backend/src/routes/health.js) — a real,
//     public, unauthenticated endpoint that pings the actual database and
//     Redis connections. Shown as exactly what it reports, nothing
//     inferred or embellished.
//
// What this page deliberately does NOT contain: any toggle for a
// business setting (site name, currency, tax rate, feature flags, email
// templates, …). None of those have a backend model, table, or endpoint
// to persist to — a toggle with nowhere to save would be pure UI theater
// that silently does nothing, or worse, looks like it worked. If one of
// those becomes a real requirement, the backend contract (a settings
// table/endpoint) needs to exist first; this page would then read/write
// that, not invent local state pretending to be it.
import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/apiClient';
import PageHeader from '../layout/PageHeader';
import Panel from '../layout/Panel';
import Button from '../layout/Button';
import Badge from '../layout/Badge';

const CHECK_LABELS = {
  database: 'Database',
  redis: 'Redis / job queue',
};

const healthTone = (status) => {
  if (status === 'ok') return 'green';
  if (status === 'error') return 'red';
  return 'gray';
};

const formatTimestamp = (iso) => {
  if (!iso) return null;
  const date = new Date(iso);
  return isNaN(date.getTime()) ? null : date.toLocaleString();
};

const Settings = () => {
  const { user, logout: handleLogout } = useAuth();

  // --- System status (GET /health) ----------------------------------------
  // Public and unauthenticated by design (see health.js's own comment —
  // hosting-platform health checks need to reach it without a token), so
  // this never touches session state either way; it's informational only.
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState('');
  const [checkedAt, setCheckedAt] = useState(null);

  const fetchHealth = useCallback(async () => {
    try {
      setHealthError('');
      setHealthLoading(true);
      // /health lives outside the /api prefix (see backend/src/app.js) and
      // returns its own plain { status, checks, timestamp } shape rather
      // than the usual { success, message, data, meta } envelope — read
      // as-is rather than assumed to be wrapped.
      const response = await apiClient.get('/health');
      setHealth(response.data);
      setCheckedAt(new Date());
    } catch (err) {
      // A non-2xx here (health.js itself returns 503, not just a network
      // failure, when a dependency is down) still carries the same
      // { status, checks, timestamp } body — show that real detail
      // instead of a generic failure message when it's there.
      if (err.response?.data?.status) {
        setHealth(err.response.data);
        setCheckedAt(new Date());
      } else {
        setHealth(null);
        setHealthError('Could not reach the API to check system status.');
      }
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return (
    <>
      <PageHeader title="Settings" description="Admin account, session, and system status." />

      <div className="space-y-6">
        <Panel aria-label="Account">
          <h3 className="text-lg font-medium text-gray-700">Account</h3>
          <p className="mt-1 text-sm text-gray-500">
            Signed in as the account below. This is exactly what the backend has on
            record — it isn't editable from here.
          </p>

          {user ? (
            <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-600">Name</dt>
                <dd className="mt-0.5 text-sm font-medium text-gray-900">{user.name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-600">Email</dt>
                <dd className="mt-0.5 text-sm font-medium text-gray-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-600">Role</dt>
                <dd className="mt-0.5">
                  <Badge tone="blue">{user.role}</Badge>
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-gray-500">No account information available.</p>
          )}
        </Panel>

        <Panel aria-label="Session">
          <h3 className="text-lg font-medium text-gray-700">Session</h3>
          <p className="mt-1 text-sm text-gray-500">
            Admin sessions expire automatically after a period of inactivity. If that
            happens, you'll be signed out and returned to the login page the next time
            you try to do something — no action needed from you, and nothing you were
            doing is silently retried on an invalid session.
          </p>
          <div className="mt-4">
            <Button variant="danger" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
              Log out
            </Button>
          </div>
        </Panel>

        <Panel aria-label="System status">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-medium text-gray-700">System status</h3>
              <p className="mt-1 text-sm text-gray-500">
                Live status of the API's own dependencies, not a configuration screen.
              </p>
            </div>
            <Button variant="secondary" onClick={fetchHealth} disabled={healthLoading}>
              <i className={`fas fa-rotate ${healthLoading ? 'fa-spin' : ''}`} aria-hidden="true"></i>
              Refresh
            </Button>
          </div>

          <div className="mt-4">
            {healthLoading && !health ? (
              <p className="text-sm text-gray-500">Checking…</p>
            ) : healthError ? (
              <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {healthError}
              </div>
            ) : health ? (
              <div className={healthLoading ? 'opacity-60 transition-opacity' : ''}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Overall:</span>
                  <Badge tone={healthTone(health.status)}>{health.status}</Badge>
                </div>
                {health.checks && (
                  <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {Object.entries(health.checks).map(([key, value]) => (
                      <li key={key} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
                        <span className="text-sm text-gray-600">{CHECK_LABELS[key] || key}</span>
                        <Badge tone={healthTone(value)}>{value}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
                {checkedAt && (
                  <p className="mt-3 text-xs text-gray-600">
                    Last checked {formatTimestamp(checkedAt.toISOString())}
                    {formatTimestamp(health.timestamp) && ` · reported ${formatTimestamp(health.timestamp)}`}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No status available.</p>
            )}
          </div>

          {process.env.REACT_APP_API_URL && (
            <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-600">
              API endpoint: <span className="font-mono">{process.env.REACT_APP_API_URL}</span>
            </p>
          )}
        </Panel>
      </div>
    </>
  );
};

export default Settings;
