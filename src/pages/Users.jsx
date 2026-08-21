// src/pages/Users.jsx
//
// PHASE 12 — rebuilt on the shared admin data-interaction layer
// (useAdminListQuery + DataTable). Same backend contract as before
// (GET /api/admin/users — admin.service.js's getAllUsersWithStats) — only
// how this screen manages/renders that query changed. See Products.jsx
// for the fuller rationale. Nothing here is computed on the frontend:
// totalOrders/totalSpent/addressSummary all arrive pre-formatted from
// userTransformer.js's formatUser, and this page never re-derives them.
//
// Name/Email/Joined On column headers are directly clickable to sort —
// replacing the previous separate "Sort by" dropdown + direction button,
// for the same consistent, deterministic pattern Products.jsx now uses.
// The allow-list (name/email/createdAt) mirrors admin.validation.js's
// validateAdminQueries `sort` allow-list exactly; picking any other
// sortKey isn't possible from this UI.
import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import PageHeader from '../layout/PageHeader';
import Panel from '../layout/Panel';
import DataTable from '../layout/DataTable';
import Badge from '../layout/Badge';
import useAdminListQuery from '../hooks/useAdminListQuery';

// Mirrors admin.validation.js's validateAdminQueries `role` allow-list.
const ROLES = ['customer', 'admin', 'superadmin'];

const PAGE_SIZE = 20;

const DEFAULT_FILTERS = {
  search: '',
  role: '',
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
};

const formatCurrency = (value) =>
  `₹${typeof value === 'number' ? value.toFixed(2) : Number(value || 0).toFixed(2)}`;

const roleTone = (role) => {
  if (role === 'admin' || role === 'superadmin') return 'blue';
  return 'gray';
};

const formatAddressSummary = (address) => {
  if (!address) return '—';
  return [address.city, address.state].filter(Boolean).join(', ') || '—';
};

const Users = () => {
  const fetchUsers = useCallback(
    (params, signal) =>
      apiClient
        .get('/api/admin/users', { params, signal })
        .then((response) => ({ data: response.data.data, meta: response.data.meta })),
    []
  );

  const {
    data: users,
    meta,
    loading,
    refreshing,
    error,
    isStale,
    filters,
    setFilter,
    clearFilters,
    setPage,
    sort,
    order,
    setSort,
    hasActiveFilters,
    refetch,
  } = useAdminListQuery({
    fetcher: fetchUsers,
    defaultFilters: DEFAULT_FILTERS,
    defaultSort: { sort: 'createdAt', order: 'desc' },
    pageSize: PAGE_SIZE,
    errorMessage: 'Failed to load users.',
  });

  const columns = [
    {
      key: 'name',
      header: 'Name',
      sortKey: 'name',
      mobileHidden: true, // already the mobile card title
      cellClassName: 'font-medium text-gray-900',
      accessor: (user) => user.name,
    },
    {
      key: 'email',
      header: 'Email',
      sortKey: 'email',
      mobileHidden: true, // already the mobile card subtitle
      accessor: (user) => user.email,
    },
    {
      key: 'phone',
      header: 'Phone',
      accessor: (user) => user.phone,
    },
    {
      key: 'role',
      header: 'Role',
      accessor: (user) => <Badge tone={roleTone(user.role)}>{user.role || 'customer'}</Badge>,
    },
    {
      key: 'totalOrders',
      header: 'Total Orders',
      hideBelow: 'lg',
      accessor: (user) => user.totalOrders,
    },
    {
      key: 'totalSpent',
      header: 'Total Spent',
      hideBelow: 'lg',
      accessor: (user) => formatCurrency(user.totalSpent),
    },
    {
      key: 'lastOrderDate',
      header: 'Last Order',
      hideBelow: 'lg',
      accessor: (user) => formatDate(user.lastOrderDate),
    },
    {
      key: 'location',
      header: 'Location',
      hideBelow: 'lg',
      accessor: (user) => formatAddressSummary(user.addressSummary),
    },
    {
      key: 'joinedOn',
      header: 'Joined On',
      sortKey: 'createdAt',
      hideBelow: 'lg',
      accessor: (user) => formatDate(user.joinedOn),
    },
  ];

  return (
    <>
      <PageHeader title="Users" description="Registered customer and staff accounts." />

      <Panel className="mb-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label htmlFor="user-search" className="sr-only">
              Search by name, email, or phone
            </label>
            <input
              id="user-search"
              type="search"
              placeholder="Search name, email, or phone…"
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>

          <select
            aria-label="Filter by role"
            value={filters.role}
            onChange={(e) => setFilter('role', e.target.value)}
            className="rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <option value="">All roles (default: customer)</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {(Boolean(filters.role) || Boolean(filters.search)) && (
          <div className="mt-3">
            <button
              type="button"
              onClick={clearFilters}
              className="rounded text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Clear filters
            </button>
          </div>
        )}
      </Panel>

      <Panel>
        <DataTable
          columns={columns}
          rows={users}
          getRowKey={(user) => user.id}
          caption="Users"
          loading={loading}
          loadingLabel="Loading users…"
          error={error}
          onRetry={refetch}
          refreshing={refreshing}
          isStale={isStale}
          empty={{
            icon: 'users',
            title: 'No users found',
            description: hasActiveFilters
              ? 'No users match the current search/filters.'
              : 'Registered customers will appear here.',
          }}
          sort={sort}
          order={order}
          onSortChange={setSort}
          meta={meta}
          onPageChange={setPage}
          mobileCardTitle={(user) => user.name}
          mobileCardSubtitle={(user) => user.email}
          renderRowActions={(user) => (
            <Link
              className="rounded font-medium text-blue-600 hover:text-blue-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              to={`/users/${user.id}`}
              aria-label={`View ${user.name}`}
            >
              View
            </Link>
          )}
        />
      </Panel>
    </>
  );
};

export default Users;
