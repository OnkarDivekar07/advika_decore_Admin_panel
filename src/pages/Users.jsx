import React, { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import PageHeader from '../layout/PageHeader';
import Panel from '../layout/Panel';
import LoadingState from '../layout/LoadingState';
import ErrorState from '../layout/ErrorState';
import EmptyState from '../layout/EmptyState';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      setError('');
      setLoading(true);
      // GET /api/admin/users responds with { data: [...], meta: {...} }
      // (see backend/src/modules/admin/admin.controller.js) — the users
      // array lives at response.data.data, not response.data.
      const response = await apiClient.get('/api/admin/users');
      setUsers(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (err) {
      console.error('Failed to fetch users', err);
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <>
      <PageHeader title="Users" description="Registered customer accounts." />

      <Panel>
        {error && <ErrorState message={error} onRetry={fetchUsers} className="mb-4" />}

        {loading ? (
          <LoadingState label="Loading users…" />
        ) : users.length === 0 ? (
          <EmptyState icon="users" title="No users found" description="Registered customers will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm md:text-base">
              <thead className="bg-gray-100 text-left text-gray-600 font-semibold">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="hidden px-4 py-2 sm:table-cell">Phone</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="hidden px-4 py-2 md:table-cell">Total Orders</th>
                  <th className="hidden px-4 py-2 md:table-cell">Total Spent</th>
                  <th className="hidden px-4 py-2 lg:table-cell">Last Order</th>
                  <th className="hidden px-4 py-2 lg:table-cell">City</th>
                  <th className="hidden px-4 py-2 lg:table-cell">Joined On</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={user.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2">{user.name}</td>
                    <td className="px-4 py-2">{user.email}</td>
                    <td className="hidden px-4 py-2 sm:table-cell">{user.phone}</td>
                    <td className="px-4 py-2">{user.role || 'Customer'}</td>
                    <td className="hidden px-4 py-2 md:table-cell">{user.totalOrders}</td>
                    <td className="hidden px-4 py-2 md:table-cell">₹{user.totalSpent}</td>
                    <td className="hidden px-4 py-2 lg:table-cell">
                      {user.lastOrderDate
                        ? new Date(user.lastOrderDate).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td className="hidden px-4 py-2 lg:table-cell">{user.addresses?.[0]?.city || '—'}</td>
                    <td className="hidden px-4 py-2 lg:table-cell">
                      {new Date(user.joinedOn).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
};

export default Users;
