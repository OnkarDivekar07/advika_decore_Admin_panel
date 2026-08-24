// src/component/Adminlogin/DashboardOverview.jsx
//
// Live operational overview for GET /api/admin/stats — see
// backend/src/modules/admin/admin.service.js#getAdminStats for exactly
// what each field means. This component never invents numbers: every
// value rendered here is either a field straight off that response, or a
// static loading/zero state while/if that response isn't available yet.
import { useCallback, useEffect, useState } from 'react';
import apiClient from '../../api/apiClient';
import ErrorState from '../../layout/ErrorState';
import QuickLinks from './QuickLinks';

// Card definitions are data, not markup — keeps the render below a plain
// `.map()` and makes it obvious at a glance which backend field each card
// is tied to (so nobody is tempted to slot a hardcoded number back in).
const STAT_CARDS = [
  { key: 'totalUsers', icon: 'users', label: 'Total Customers', color: 'blue' },
  { key: 'totalOrders', icon: 'shopping-cart', label: 'Total Orders', color: 'indigo' },
  { key: 'totalProducts', icon: 'box-open', label: 'Total Products', color: 'purple' },
  { key: 'deliveredOrders', icon: 'truck', label: 'Delivered Orders', color: 'green' },
  { key: 'pendingOrders', icon: 'hourglass-half', label: 'Pending Orders', color: 'yellow' },
];

const COLOR_CLASSES = {
  blue: 'bg-blue-100 text-blue-600',
  indigo: 'bg-indigo-100 text-indigo-600',
  purple: 'bg-purple-100 text-purple-600',
  green: 'bg-green-100 text-green-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  red: 'bg-red-100 text-red-600',
};

const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// A skeleton card mirrors the exact layout of a loaded stat card so the
// grid doesn't jump/reflow once real numbers arrive.
function StatCardSkeleton() {
  return (
    <div
      className="flex animate-pulse items-center space-x-4 rounded-lg bg-white p-5 shadow"
      role="status"
      aria-label="Loading statistic"
    >
      <div className="h-12 w-12 shrink-0 rounded-full bg-gray-200" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3 w-20 rounded bg-gray-200" />
        <div className="h-6 w-14 rounded bg-gray-200" />
      </div>
    </div>
  );
}

function StatCard({ id, icon, label, value, color }) {
  return (
    <div
      aria-labelledby={id}
      className="flex items-center space-x-4 rounded-lg bg-white p-5 shadow"
      role="region"
    >
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${COLOR_CLASSES[color] || COLOR_CLASSES.blue}`}>
        <i className={`fas fa-${icon}`} aria-hidden="true"></i>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-500" id={id}>{label}</p>
        <p className="text-2xl font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

function DashboardCards() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      // Backend envelope is always { success, message, data, meta } — see
      // backend/src/utils/sendResponse.js. GET /api/admin/stats puts the
      // actual numbers under `data`, so this must read res.data.data, not
      // res.data (which is the whole envelope object).
      const res = await apiClient.get('/api/admin/stats');
      setStats(res.data.data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
      setError('Failed to load dashboard statistics.');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="space-y-6">
      {error && <ErrorState message={error} onRetry={fetchStats} />}

      <section aria-label="Dashboard overview" className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3" id="dashboard">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
          : stats
            ? STAT_CARDS.map(({ key, icon, label, color }) => (
                <StatCard
                  key={key}
                  id={`stat-${key}`}
                  icon={icon}
                  label={label}
                  // Every count here is a plain integer straight off the
                  // backend response — `?? 0` only guards against a field
                  // being absent from the payload, it never substitutes a
                  // fake/demo number.
                  value={(stats[key] ?? 0).toLocaleString('en-IN')}
                  color={color}
                />
              ))
            : null}

        {!loading && stats && (
          <div
            aria-labelledby="stat-totalRevenue"
            className="flex items-center space-x-4 rounded-lg bg-white p-5 shadow md:col-span-2 lg:col-span-1"
            role="region"
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${COLOR_CLASSES.red}`}>
              <i className="fas fa-indian-rupee-sign" aria-hidden="true"></i>
            </div>
            <div className="min-w-0">
              {/* Explicitly labeled as the backend's paid-revenue figure —
                  see admin.service.js: this is the sum of `total` across
                  orders with paymentStatus 'paid', not gross order value
                  or a projection. */}
              <p className="truncate text-sm font-medium text-gray-500" id="stat-totalRevenue">
                Paid Revenue <span className="text-gray-600">(backend-calculated)</span>
              </p>
              <p className="text-2xl font-semibold text-gray-800">{formatCurrency(stats.totalRevenue)}</p>
            </div>
          </div>
        )}
      </section>

      {!loading && !error && stats && (
        <p className="text-xs text-gray-600">
          Live figures from <code>GET /api/admin/stats</code>. Refresh the page or use retry above if a number looks stale.
        </p>
      )}

      <QuickLinks />
    </div>
  );
}

export default DashboardCards;
