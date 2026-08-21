// src/pages/userviewpage.jsx
//
// Admin customer detail — PHASE 9. GET /api/admin/users/:id
// (backend/src/modules/admin/admin.service.js's getUserDetailById) is the
// single source of truth for everything on this page: profile, every
// saved address, the 10 most recent orders, and full-history order
// totals. Nothing here is computed or inferred on the frontend.
//
// This page never renders a password, OTP, auth token, or payment
// secret — the backend response itself never contains one (see
// getUserDetailById's Prisma `select`), so there is nothing to filter
// out here; this page just displays whatever comes back.
//
// There is currently no backend operation to change a user's role, so no
// such control exists here — see admin.routes.js. A future "promote to
// admin" action needs its own protected backend endpoint before any
// button for it is added.
import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import PageHeader from '../layout/PageHeader';
import Panel from '../layout/Panel';
import Button from '../layout/Button';
import LoadingState from '../layout/LoadingState';
import ErrorState from '../layout/ErrorState';
import EmptyState from '../layout/EmptyState';
import Badge, { statusTone } from '../layout/Badge';

const formatDate = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  return isNaN(d) ? '—' : d.toLocaleDateString();
};

const formatDateTime = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  return isNaN(d) ? '—' : d.toLocaleString();
};

const formatEnumLabel = (value) =>
  value
    ? String(value)
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : value;

const formatCurrency = (value) =>
  `₹${typeof value === 'number' ? value.toFixed(2) : Number(value || 0).toFixed(2)}`;

const roleTone = (role) => (role === 'admin' || role === 'superadmin' ? 'blue' : 'gray');

const UserViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // 'notFound' | 'forbidden' | 'error' | ''
  const [errorKind, setErrorKind] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchUser = useCallback(async () => {
    setLoading(true);
    setErrorKind('');
    setErrorMessage('');
    try {
      // GET /api/admin/users/:id responds with { data: {...} } (see
      // backend/src/modules/admin/admin.controller.js's getUserById) —
      // the user object lives at response.data.data, not response.data.
      const { data } = await apiClient.get(`/api/admin/users/${id}`);
      setUser(data.data);
      setErrorKind('');
    } catch (err) {
      console.error('Error fetching user:', err);
      const status = err.response?.status;
      if (status === 404 || status === 422) {
        // A malformed id (422 — see admin.validation.js's
        // validateUserIdParam) and a well-formed but nonexistent id (404)
        // both mean the same thing to an admin looking this customer up:
        // there's nothing here.
        setErrorKind('notFound');
      } else if (status === 403) {
        setErrorKind('forbidden');
      } else {
        setErrorKind('error');
        setErrorMessage(err.response?.data?.message || 'Failed to load user.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <>
      <PageHeader
        title={loading ? 'Loading customer…' : user?.name || 'Customer'}
        description={!loading && user ? user.email : undefined}
        actions={
          <Button variant="secondary" onClick={() => navigate('/users')}>
            <i className="fas fa-arrow-left" aria-hidden="true"></i>
            Back to Users
          </Button>
        }
      />

      {loading && <LoadingState label="Loading customer…" />}

      {!loading && errorKind === 'notFound' && (
        <Panel>
          <EmptyState
            icon="circle-exclamation"
            title="Customer not found"
            description="This user doesn't exist, or the ID in the URL isn't valid."
            action={
              <Button variant="secondary" onClick={() => navigate('/users')}>
                Back to Users
              </Button>
            }
          />
        </Panel>
      )}

      {!loading && errorKind === 'forbidden' && (
        <Panel>
          <EmptyState
            icon="lock"
            title="Access denied"
            description="You don't have access to this customer."
            action={
              <Button variant="secondary" onClick={() => navigate('/users')}>
                Back to Users
              </Button>
            }
          />
        </Panel>
      )}

      {!loading && errorKind === 'error' && (
        <ErrorState message={errorMessage} onRetry={fetchUser} />
      )}

      {!loading && !errorKind && user && (
        <div className="space-y-6">
          <Panel>
            <h2 className="mb-3 text-lg font-semibold text-gray-800">Profile</h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">Name</dt>
                <dd className="font-medium text-gray-900">{user.name}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Role</dt>
                <dd className="mt-1">
                  <Badge tone={roleTone(user.role)}>{user.role || 'customer'}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium text-gray-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Phone</dt>
                <dd className="font-medium text-gray-900">{user.phone}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Joined On</dt>
                <dd className="font-medium text-gray-900">{formatDate(user.joinedOn)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Customer ID</dt>
                <dd className="font-mono text-xs font-medium text-gray-900" title={user.id}>
                  {user.id}
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel>
            <h2 className="mb-3 text-lg font-semibold text-gray-800">Order Summary</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-gray-500">Total Orders</dt>
                <dd className="text-lg font-semibold text-gray-900">{user.orderSummary?.totalOrders ?? 0}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Total Spent</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {formatCurrency(user.orderSummary?.totalSpent)}
                </dd>
              </div>
            </dl>

            <h3 className="mt-6 mb-2 text-sm font-semibold text-gray-600">
              Recent Orders
              {user.orderSummary?.totalOrders > (user.recentOrders?.length || 0) && (
                <span className="ml-2 font-normal text-gray-400">
                  (showing {user.recentOrders.length} most recent of {user.orderSummary.totalOrders})
                </span>
              )}
            </h3>

            {!user.recentOrders || user.recentOrders.length === 0 ? (
              <p className="text-sm text-gray-500">No orders placed yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                    <tr>
                      <th scope="col" className="px-4 py-2">Order ID</th>
                      <th scope="col" className="px-4 py-2">Placed On</th>
                      <th scope="col" className="px-4 py-2">Total</th>
                      <th scope="col" className="px-4 py-2">Order Status</th>
                      <th scope="col" className="px-4 py-2">Payment Status</th>
                      <th scope="col" className="relative px-4 py-2">
                        <span className="sr-only">View</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {user.recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-4 py-2 font-mono text-xs text-gray-500" title={order.id}>
                          {String(order.id).slice(-8)}
                        </td>
                        <td className="px-4 py-2 text-gray-600">{formatDateTime(order.createdAt)}</td>
                        <td className="px-4 py-2 font-medium text-gray-900">{formatCurrency(order.total)}</td>
                        <td className="px-4 py-2">
                          <Badge tone={statusTone(order.status)}>{formatEnumLabel(order.status)}</Badge>
                        </td>
                        <td className="px-4 py-2">
                          <Badge tone={statusTone(order.paymentStatus)}>{formatEnumLabel(order.paymentStatus)}</Badge>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Link
                            className="rounded font-medium text-blue-600 hover:text-blue-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            to={`/orders/${order.id}`}
                            aria-label={`View order #${String(order.id).slice(-8)}`}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel>
            <h2 className="mb-3 text-lg font-semibold text-gray-800">Addresses</h2>
            {!user.addresses || user.addresses.length === 0 ? (
              <p className="text-sm text-gray-500">No saved addresses.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {user.addresses.map((address) => (
                  <div
                    key={address.id}
                    className="rounded-md border border-gray-200 p-3 text-sm"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium text-gray-900">{address.name || user.name}</span>
                      {address.isDefault && <Badge tone="green">Default</Badge>}
                    </div>
                    <p className="text-gray-600">
                      {[address.houseArea, address.area, address.city, address.state, address.pincode]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    {address.landmark && (
                      <p className="text-gray-500">Landmark: {address.landmark}</p>
                    )}
                    {address.phone && <p className="text-gray-500">Phone: {address.phone}</p>}
                    {address.deliveryInstructions && (
                      <p className="mt-1 text-xs text-gray-400">Note: {address.deliveryInstructions}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}
    </>
  );
};

export default UserViewPage;
