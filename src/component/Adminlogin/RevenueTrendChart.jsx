// src/component/Adminlogin/RevenueTrendChart.jsx
//
// Plain-SVG bar chart for GET /api/admin/analytics/revenue-trend's
// `buckets` array — no charting library dependency (none is installed in
// this app; see package.json), and deliberately no data massaging: every
// bar's height comes straight from a bucket's `revenue` field. There is no
// interpolation, no zero-filled gap for a period with no paid orders, and
// no synthetic/sample data ever rendered — an empty `buckets` array always
// renders the empty state below, never a placeholder chart.
const CHART_HEIGHT = 220;
const BAR_GAP_RATIO = 0.3;

const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function RevenueTrendChart({ buckets }) {
  if (!buckets || buckets.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-md border border-dashed border-gray-200 text-sm text-gray-400">
        No paid orders in this range yet.
      </div>
    );
  }

  const maxRevenue = Math.max(...buckets.map((b) => b.revenue), 0);
  // Guards a flat-zero series (every bucket present but $0 revenue, which
  // can't happen today since buckets only exist for paid orders — kept
  // anyway so a future edge case never divides by zero) from producing
  // NaN bar heights.
  const safeMax = maxRevenue > 0 ? maxRevenue : 1;

  const barWidth = 100 / buckets.length;
  const barInnerWidth = barWidth * (1 - BAR_GAP_RATIO);

  return (
    <div>
      <svg
        viewBox={`0 0 100 ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        className="h-56 w-full"
        role="img"
        aria-label="Revenue trend chart"
        aria-describedby="revenue-trend-chart-table"
      >
        {buckets.map((bucket, i) => {
          const barHeight = (bucket.revenue / safeMax) * (CHART_HEIGHT - 20);
          const x = i * barWidth + (barWidth * BAR_GAP_RATIO) / 2;
          const y = CHART_HEIGHT - barHeight;
          return (
            <g key={bucket.periodStart || bucket.label || i}>
              <title>
                {bucket.label}: {formatCurrency(bucket.revenue)} across {bucket.orderCount}{' '}
                {bucket.orderCount === 1 ? 'order' : 'orders'}
              </title>
              <rect
                x={x}
                y={y}
                width={Math.max(barInnerWidth, 0.5)}
                height={Math.max(barHeight, 0)}
                className="fill-blue-500 transition-opacity hover:opacity-80"
                rx="0.6"
              />
            </g>
          );
        })}
      </svg>

      {/* An SVG's per-bar <title> tooltip isn't reliably exposed by
          screen readers — this table is the actual accessible
          representation of the same `buckets` data, visually hidden but
          always present so the chart's numbers are never sighted-only. */}
      <table id="revenue-trend-chart-table" className="sr-only">
        <caption>Revenue by period</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">Revenue</th>
            <th scope="col">Orders</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((bucket, i) => (
            <tr key={bucket.periodStart || bucket.label || i}>
              <td>{bucket.label}</td>
              <td>{formatCurrency(bucket.revenue)}</td>
              <td>{bucket.orderCount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-2 flex justify-between text-xs text-gray-400" aria-hidden="true">
        <span>{buckets[0].label}</span>
        {buckets.length > 1 && <span>{buckets[buckets.length - 1].label}</span>}
      </div>
    </div>
  );
}

export default RevenueTrendChart;
