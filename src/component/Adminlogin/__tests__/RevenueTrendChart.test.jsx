import React from 'react';
import { render, screen, within } from '@testing-library/react';
import RevenueTrendChart from '../RevenueTrendChart';

describe('RevenueTrendChart', () => {
  it('shows an empty state instead of a fabricated chart when there are no buckets', () => {
    render(<RevenueTrendChart buckets={[]} />);
    expect(screen.getByText(/no paid orders in this range yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /revenue trend chart/i })).not.toBeInTheDocument();
  });

  it('treats a missing buckets prop the same as an empty array', () => {
    render(<RevenueTrendChart />);
    expect(screen.getByText(/no paid orders in this range yet/i)).toBeInTheDocument();
  });

  it('renders one bar per bucket, straight off backend data', () => {
    const buckets = [
      { label: '2026-08-10', periodStart: '2026-08-10T00:00:00.000Z', periodEnd: '2026-08-10T23:59:59.999Z', revenue: 1000, orderCount: 2 },
      { label: '2026-08-11', periodStart: '2026-08-11T00:00:00.000Z', periodEnd: '2026-08-11T23:59:59.999Z', revenue: 3000, orderCount: 5 },
      { label: '2026-08-12', periodStart: '2026-08-12T00:00:00.000Z', periodEnd: '2026-08-12T23:59:59.999Z', revenue: 500, orderCount: 1 },
    ];
    const { container } = render(<RevenueTrendChart buckets={buckets} />);

    expect(container.querySelectorAll('rect')).toHaveLength(3);

    // Each bucket's label deliberately appears twice — once in the
    // sr-only accessible data table (every bucket) and once in the
    // visible axis-label row (first/last bucket only, see the
    // component's aria-hidden footer). Scope to the accessible table so
    // this asserts the real per-bucket data rendered, without being
    // ambiguous about which of the two same-text elements it means.
    const accessibleTable = screen.getByText('Revenue by period').closest('table');
    expect(within(accessibleTable).getByText('2026-08-10')).toBeInTheDocument();
    expect(within(accessibleTable).getByText('2026-08-11')).toBeInTheDocument();
    expect(within(accessibleTable).getByText('2026-08-12')).toBeInTheDocument();
  });

  it('never divides by zero when every bucket has 0 revenue', () => {
    const buckets = [
      { label: 'a', revenue: 0, orderCount: 0 },
      { label: 'b', revenue: 0, orderCount: 0 },
    ];
    const { container } = render(<RevenueTrendChart buckets={buckets} />);

    const rects = container.querySelectorAll('rect');
    rects.forEach((rect) => {
      expect(rect.getAttribute('height')).not.toBe('NaN');
    });
  });
});
