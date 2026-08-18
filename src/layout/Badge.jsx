// src/layout/Badge.jsx
const TONE_CLASSES = {
  gray: 'bg-gray-100 text-gray-700',
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  blue: 'bg-blue-100 text-blue-800',
};

// Purely a presentation helper — never used to change what's fetched or
// sent, only how an already-known status string is colored. Unrecognized
// values (any status the backend adds later that we don't know about
// yet) fall back to neutral gray rather than guessing.
//
// Also covers Shipment.status values (see prisma schema's ShipmentStatus
// enum — CREATED/PICKED_UP/IN_TRANSIT/OUT_FOR_DELIVERY/DELIVERED/
// DELIVERY_FAILED/RTO_INITIATED/RTO_DELIVERED/CANCELLED), which arrive
// SCREAMING_SNAKE_CASE rather than lowercase — normalized below so both
// shapes hit the same keyword lists.
export function statusTone(status) {
  const s = String(status || '').trim().toLowerCase().replace(/_/g, ' ');
  if (
    ['delivered', 'paid', 'completed', 'success', 'in stock', 'active', 'rto delivered'].includes(s)
  ) {
    return 'green';
  }
  if (
    [
      'pending', 'processing', 'shipped', 'in transit', 'confirmed',
      'created', 'picked up', 'out for delivery', 'attempted', 'cod pending',
    ].includes(s)
  ) {
    return 'yellow';
  }
  if (
    [
      'cancelled', 'canceled', 'failed', 'refunded', 'low stock', 'out of stock',
      'delivery failed', 'rto initiated', 'timeout', 'unknown', 'returned',
    ].includes(s)
  ) {
    return 'red';
  }
  return 'gray';
}

const Badge = ({ children, tone = 'gray' }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      TONE_CLASSES[tone] || TONE_CLASSES.gray
    }`}
  >
    {children}
  </span>
);

export default Badge;
