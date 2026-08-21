// src/component/Adminlogin/AnalyticsOverview.jsx
//
// PHASE 11 — Business Analytics & Financial Overview.
//
// Every number on this screen comes from GET /api/admin/analytics/overview
// or GET /api/admin/analytics/revenue-trend — see
// backend/src/modules/admin/admin.analytics.service.js for exactly how
// each is computed. Nothing here derives revenue, AOV, or any other
// financial figure client-side; this component only formats and displays
// backend-computed values. There is no profit/margin/inventory-valuation
// figure anywhere in this file, on purpose: the catalog has no recorded
// product cost, so there's nothing authoritative to show.
import { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '../../api/apiClient';
import ErrorState from '../../layout/ErrorState';
import Panel from '../../layout/Panel';
import Button from '../../layout/Button';
import RevenueTrendChart from './RevenueTrendChart';

const GRANULARITIES = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
];

const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const formatInt = (value) => Number(value || 0).toLocaleString('en-IN');

// Card definitions are data, not markup, same convention as
// DashboardOverview.jsx's STAT_CARDS — makes it obvious at a glance which
// backend field (and which definitions[key] tooltip) each card is tied to.
const KPI_CARDS = [
  { key: 'grossRevenue', label: 'Gross Revenue', icon: 'indian-rupee-sign', color: 'red', format: formatCurrency, badge: 'gross, not profit' },
  { key: 'averageOrderValue', label: 'Average Order Value', icon: 'chart-line', color: 'green', format: formatCurrency },
  { key: 'orderCount', label: 'Orders Placed', icon: 'shopping-cart', color: 'indigo', format: formatInt },
  { key: 'paidOrderCount', label: 'Paid Orders', icon: 'circle-check', color: 'blue', format: formatInt },
  { key: 'deliveredOrders', label: 'Delivered Orders', icon: 'truck', color: 'green', format: formatInt },
  { key: 'pendingOrders', label: 'Pending Orders', icon: 'hourglass-half', color: 'yellow', format: formatInt },
  { key: 'newCustomers', label: 'New Customers', icon: 'user-plus', color: 'purple', format: formatInt },
  { key: 'totalActiveProducts', label: 'Active Products', icon: 'box-open', color: 'blue', format: formatInt, badge: 'live snapshot' },
];

const COLOR_CLASSES = {
  blue: 'bg-blue-100 text-blue-600',
  indigo: 'bg-indigo-100 text-indigo-600',
  purple: 'bg-purple-100 text-purple-600',
  green: 'bg-green-100 text-green-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  red: 'bg-red-100 text-red-600',
};

function KpiCardSkeleton() {
  return (
    <div className="flex animate-pulse items-center space-x-4 rounded-lg bg-white p-5 shadow" role="status" aria-label="Loading KPI">
      <div className="h-12 w-12 shrink-0 rounded-full bg-gray-200" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3 w-24 rounded bg-gray-200" />
        <div className="h-6 w-16 rounded bg-gray-200" />
      </div>
    </div>
  );
}

function KpiCard({ id, icon, label, value, color, badge, definition }) {
  return (
    <div aria-labelledby={id} className="flex items-start space-x-4 rounded-lg bg-white p-5 shadow" role="region">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${COLOR_CLASSES[color] || COLOR_CLASSES.blue}`}>
        <i className={`fas fa-${icon}`} aria-hidden="true"></i>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-500" id={id}>
          {label} {badge && <span className="text-gray-400">({badge})</span>}
        </p>
        <p className="text-2xl font-semibold text-gray-800">{value}</p>
        {definition && (
          <p className="mt-1 max-w-xs text-xs leading-snug text-gray-400" title={definition}>
            {definition}
          </p>
        )}
      </div>
    </div>
  );
}

// toISODateInput/fromISODateInput bridge between the plain YYYY-MM-DD an
// <input type="date"> works with and the dateFrom/dateTo strings the
// backend's ISO8601 validator expects — same shape the Orders.jsx filter
// already sends, so the query contract stays identical across screens.
const DEFAULT_FILTERS = { dateFrom: '', dateTo: '' };

function AnalyticsOverview() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [granularity, setGranularity] = useState('day');

  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchAnalytics = useCallback(async () => {
    try {
      setError('');
      if (!overview) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const params = {};
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;

      // Both requests are independent GETs against the same backend
      // date-range criteria, so their figures always reconcile (see
      // admin.analytics.service.js) — fetched in parallel since neither
      // depends on the other's response.
      const [overviewRes, trendRes] = await Promise.all([
        apiClient.get('/api/admin/analytics/overview', { params }),
        apiClient.get('/api/admin/analytics/revenue-trend', { params: { ...params, granularity } }),
      ]);

      setOverview(overviewRes.data.data);
      setTrend(trendRes.data.data);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
      setError(err.response?.data?.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dateFrom, filters.dateTo, granularity]);

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dateFrom, filters.dateTo, granularity]);

  const hasFilters = Boolean(filters.dateFrom || filters.dateTo);

  const resolvedRangeLabel = useMemo(() => {
    if (!trend?.range) return null;
    const from = new Date(trend.range.from).toLocaleDateString('en-IN');
    const to = new Date(trend.range.to).toLocaleDateString('en-IN');
    return `${from} – ${to}`;
  }, [trend]);

  return (
    <div className="space-y-6">
      <Panel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-2">
            <label htmlFor="analytics-date-from" className="sr-only">From date</label>
            <input
              id="analytics-date-from"
              type="date"
              aria-label="From date"
              value={filters.dateFrom}
              max={filters.dateTo || undefined}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
            <span className="text-gray-400">–</span>
            <label htmlFor="analytics-date-to" className="sr-only">To date</label>
            <input
              id="analytics-date-to"
              type="date"
              aria-label="To date"
              value={filters.dateTo}
              min={filters.dateFrom || undefined}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>

          <select
            aria-label="Chart granularity"
            value={granularity}
            onChange={(e) => setGranularity(e.target.value)}
            className="rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {GRANULARITIES.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>

          {hasFilters && (
            <Button variant="secondary" onClick={() => setFilters(DEFAULT_FILTERS)}>
              Clear date filter
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Leave dates blank for all-time KPIs. The revenue chart defaults to the trailing 30 days when no dates are set.
        </p>
      </Panel>

      {error && <ErrorState message={error} onRetry={fetchAnalytics} />}

      <section aria-label="Business KPIs" className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <KpiCardSkeleton key={i} />)
          : overview
            ? KPI_CARDS.map(({ key, icon, label, color, format, badge }) => (
                <KpiCard
                  key={key}
                  id={`kpi-${key}`}
                  icon={icon}
                  label={label}
                  value={format(overview[key])}
                  color={color}
                  badge={badge}
                  definition={overview.definitions?.[key]}
                />
              ))
            : null}
      </section>

      <Panel>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Revenue Trend</h2>
            {resolvedRangeLabel && (
              <p className="text-xs text-gray-400">{resolvedRangeLabel} · {trend?.granularity}</p>
            )}
          </div>
          {refreshing && <span className="text-xs text-gray-400">Refreshing…</span>}
        </div>

        {loading ? (
          <div className="flex h-56 animate-pulse items-center justify-center rounded-md bg-gray-100 text-sm text-gray-400" role="status" aria-label="Loading revenue trend">
            Loading…
          </div>
        ) : (
          <RevenueTrendChart buckets={trend?.buckets || []} />
        )}

        {trend?.definitions && (
          <p className="mt-3 text-xs text-gray-400">
            {trend.definitions.revenue}
          </p>
        )}
      </Panel>

      {!loading && !error && overview && (
        <p className="text-xs text-gray-400">
          Live figures from <code>GET /api/admin/analytics/overview</code> and{' '}
          <code>GET /api/admin/analytics/revenue-trend</code>. No profit or inventory-valuation figure is shown —
          the catalog has no recorded product cost, so none can be calculated authoritatively.
        </p>
      )}
    </div>
  );
}

export default AnalyticsOverview;
