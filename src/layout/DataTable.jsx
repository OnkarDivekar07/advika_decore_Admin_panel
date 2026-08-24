// src/layout/DataTable.jsx
//
// PHASE 12 — shared table primitive for every backend-paginated admin list
// (Products, Orders, Users, Inventory). One place that owns:
//   - loading / error / empty states (via LoadingState/ErrorState/EmptyState)
//   - a "stale" banner when a refresh failed but previous data is still shown
//   - accessible table semantics (scope="col", aria-sort on sortable
//     headers, a visually-hidden caption)
//   - deterministic sorting: clicking a sortable header calls onSortChange
//     with that column's sortKey; the current sort/order always come from
//     the backend-driven state the caller passes in, never guessed here
//   - backend-driven pagination (renders the existing Pagination component
//     off of `meta`)
//   - a mobile card/list fallback so wide tables don't force horizontal
//     scrolling on small screens — the <table> only renders at the `md`
//     breakpoint and up; below that, the same rows render as stacked cards
//
// This component only renders what it's given — it never fetches, filters,
// sorts, or paginates data itself. All of that stays backend-authoritative,
// driven by useAdminListQuery.
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import EmptyState from './EmptyState';
import Pagination from './Pagination';
import useIsMobile from '../hooks/useIsMobile';

const RESPONSIVE_CLASS = {
  md: '',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
};

const SortIcon = ({ direction }) => {
  if (!direction) {
    return <i className="fas fa-sort text-gray-300" aria-hidden="true"></i>;
  }
  return (
    <i
      className={`fas fa-sort-${direction === 'asc' ? 'up' : 'down'} text-gray-500`}
      aria-hidden="true"
    ></i>
  );
};

const SortableHeader = ({ column, sort, order, onSortChange }) => {
  const isActive = column.sortKey && sort === column.sortKey;
  const ariaSort = !column.sortKey ? undefined : isActive ? (order === 'asc' ? 'ascending' : 'descending') : 'none';

  if (!column.sortKey) {
    return (
      <th
        scope="col"
        className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase ${
          column.align === 'right' ? 'text-right' : ''
        } ${RESPONSIVE_CLASS[column.hideBelow] || ''} ${column.headerClassName || ''}`}
      >
        {column.header}
      </th>
    );
  }

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase ${
        RESPONSIVE_CLASS[column.hideBelow] || ''
      } ${column.headerClassName || ''}`}
    >
      <button
        type="button"
        onClick={() => onSortChange(column.sortKey)}
        data-testid={`sort-header-${column.sortKey}`}
        className="inline-flex items-center gap-1 rounded font-medium uppercase text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {column.header}
        <SortIcon direction={isActive ? order : null} />
      </button>
    </th>
  );
};

const DataTable = ({
  columns,
  rows,
  getRowKey,
  caption,
  loading,
  loadingLabel = 'Loading…',
  error,
  onRetry,
  refreshing = false,
  isStale = false,
  staleMessage = "Showing previously loaded results — the latest data couldn't be confirmed. Try refreshing.",
  empty,
  sort,
  order,
  onSortChange,
  meta,
  onPageChange,
  renderRowActions,
  mobileCardTitle,
  mobileCardSubtitle,
}) => {
  const isMobile = useIsMobile();

  if (loading) {
    return <LoadingState label={loadingLabel} />;
  }

  const hasRows = Boolean(rows && rows.length > 0);

  // No data at all (first load failed, or a genuinely empty result) —
  // there's nothing underneath an error banner to keep showing, so it's
  // the only thing on screen.
  if (error && !hasRows) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (!error && !hasRows) {
    return (
      <EmptyState
        icon={empty?.icon}
        title={empty?.title}
        description={empty?.description}
        action={empty?.action}
      />
    );
  }

  const mobileColumns = columns.filter((c) => !c.mobileHidden);

  return (
    <>
      {/* A refresh (filter change, page turn, retry) that fails while
          rows from a previous successful fetch are still on screen keeps
          those rows visible — dimmed, with this banner on top — instead
          of replacing a working screen with a full error page. */}
      {error && <ErrorState message={error} onRetry={onRetry} className="mb-4" />}
      {isStale && !error && (
        <div role="status" className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          {staleMessage}
        </div>
      )}

      {isMobile ? (
        // Mobile fallback: stacked cards. Carries exactly the same rows
        // as the table below (never a subset, never re-derived), just
        // laid out for a narrow viewport instead of forcing horizontal
        // scroll on a wide table. Rendered instead of (not alongside) the
        // table, so a screen reader — and a query in this component's own
        // tests — never sees a row's content twice.
        <ul className={refreshing ? 'space-y-3 opacity-60 transition-opacity' : 'space-y-3'} aria-busy={refreshing}>
          {rows.map((row) => (
            <li
              key={getRowKey(row)}
              data-testid={`data-row-${getRowKey(row)}`}
              className="rounded-lg border border-gray-200 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {mobileCardTitle && <p className="truncate font-medium text-gray-900">{mobileCardTitle(row)}</p>}
                  {mobileCardSubtitle && <p className="truncate text-sm text-gray-500">{mobileCardSubtitle(row)}</p>}
                </div>
                {renderRowActions && <div className="flex shrink-0 gap-2">{renderRowActions(row)}</div>}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                {mobileColumns.map((column) => (
                  <div key={column.key} className="min-w-0">
                    <dt className="text-xs uppercase tracking-wide text-gray-600">
                      {column.mobileLabel || column.header}
                    </dt>
                    <dd className="truncate text-sm text-gray-700">{column.accessor(row)}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      ) : (
        <div
          className={refreshing ? 'overflow-x-auto opacity-60 transition-opacity' : 'overflow-x-auto'}
          aria-busy={refreshing}
        >
          <table className="min-w-full divide-y divide-gray-200">
            {caption && <caption className="sr-only">{caption}</caption>}
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <SortableHeader
                    key={column.key}
                    column={column}
                    sort={sort}
                    order={order}
                    onSortChange={onSortChange}
                  />
                ))}
                {renderRowActions && (
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {rows.map((row) => (
                <tr key={getRowKey(row)} data-testid={`data-row-${getRowKey(row)}`}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-3 text-sm text-gray-700 ${
                        column.align === 'right' ? 'text-right' : ''
                      } ${RESPONSIVE_CLASS[column.hideBelow] || ''} ${column.cellClassName || ''}`}
                    >
                      {column.accessor(row)}
                    </td>
                  ))}
                  {renderRowActions && (
                    <td className="px-4 py-3 text-right text-sm">
                      <div className="flex justify-end gap-2">{renderRowActions(row)}</div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && onPageChange && (
        <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPageChange={onPageChange} />
      )}
    </>
  );
};

export default DataTable;
