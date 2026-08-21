// src/hooks/useAdminListQuery.js
//
// PHASE 12 — shared "admin data table" query engine used by every
// backend-paginated admin list (Products, Orders, Users, Inventory).
// Consolidates the pattern those screens had each re-implemented slightly
// differently (see the pre-Phase-12 versions of Orders.jsx/Users.jsx) into
// one hook, and fixes the gaps that pattern had:
//
//   - Free-text `search` is debounced; every other filter and sort change
//     applies immediately (same convention every screen already used).
//   - The list ALWAYS resets to page 1 when the *effective* query changes
//     (a settled search term, a filter, or a sort) — including search,
//     which the pre-Phase-12 Products/Orders/Users pages did not reset on,
//     a real bug (searching while on page 3 could "find" nothing just
//     because page 3 no longer exists for the new query).
//   - Filters/sort/page are seeded from the URL on mount and kept in sync
//     with it afterwards, so a reload, browser back/forward, or a shared
//     link reproduces exactly what an admin was looking at.
//   - Requests are race-safe: starting a new request aborts whatever was
//     still in flight, and any response that manages to resolve out of
//     order is ignored — an older, slower response can never overwrite a
//     newer one's results.
//   - `loading` only covers the very first paint; every fetch after that
//     is `refreshing` (existing data stays on screen, dimmed) so a filter
//     change or page turn never flashes an empty screen. If a refresh
//     fails, the previous data is flagged `isStale` rather than cleared.
//
// This hook never invents page counts, totals, or filtered rows — `data`
// and `meta` are exactly whatever `fetcher` resolves with, i.e. exactly
// what the backend returned. It's a state machine around the request
// lifecycle, not a second source of truth.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useDebouncedValue from './useDebouncedValue';
import { getErrorMessage, isCancelError } from '../utils/apiError';

const buildSearchParams = (obj) => {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });
  return params;
};

/**
 * @param {Object} options
 * @param {(params: object, signal: AbortSignal) => Promise<{data: any[], meta: object}>} options.fetcher
 *   Must be a STABLE reference (wrap in useCallback with no changing deps —
 *   typically just an apiClient.get call) so this hook can safely re-run it
 *   whenever the query actually changes without an extra render lag.
 * @param {Object} options.defaultFilters - e.g. { search: '', category: '' }.
 *   Every key here becomes a URL-synced filter; 'search' is treated
 *   specially (debounced, never applied instantly).
 * @param {{sort: string, order: 'asc'|'desc'}|null} [options.defaultSort] -
 *   null for lists with no user-controllable sort (e.g. Orders, which is
 *   always createdAt desc server-side).
 * @param {number} options.pageSize - fixed, backend-driven page size. Never
 *   user-adjustable here — that's how "no page downloads an unnecessarily
 *   large dataset" stays true regardless of what filters are applied.
 * @param {number} [options.searchDebounceMs]
 * @param {boolean} [options.syncUrl] - default true
 * @param {string} [options.errorMessage] - shown when a request fails and
 *   the backend didn't send its own message. Screen-specific ("Failed to
 *   load orders.") rather than a generic fallback, matching each screen's
 *   existing convention of never surfacing a raw network/JS error string.
 *   PHASE 16 — actual message selection (backend message > joined field
 *   errors > true-network-error text > this fallback) now goes through
 *   utils/apiError.js's getErrorMessage, the same normalization every
 *   other admin screen's mutations use, so a real offline/timeout always
 *   reads as "Network error…" here too instead of this generic string.
 */
export default function useAdminListQuery({
  fetcher,
  defaultFilters = {},
  defaultSort = null,
  pageSize,
  searchDebounceMs = 400,
  syncUrl = true,
  errorMessage = 'Failed to load data.',
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Seed once from whatever's already in the URL when this screen mounts.
  // Deliberately NOT reactive to further external searchParams changes —
  // from here on, this hook is the one writing the URL, and re-reading it
  // on every change would fight with that (and re-parsing on our own
  // writes is redundant work at best, an infinite loop at worst).
  const initial = useMemo(() => {
    if (!syncUrl) return { filters: defaultFilters, page: 1, sort: defaultSort };

    const filtersFromUrl = { ...defaultFilters };
    Object.keys(defaultFilters).forEach((key) => {
      const value = searchParams.get(key);
      if (value !== null) filtersFromUrl[key] = value;
    });

    const pageFromUrl = Number(searchParams.get('page'));
    const page = Number.isInteger(pageFromUrl) && pageFromUrl > 0 ? pageFromUrl : 1;

    let sort = defaultSort;
    if (defaultSort) {
      const orderParam = searchParams.get('order');
      sort = {
        sort: searchParams.get('sort') || defaultSort.sort,
        order: orderParam === 'asc' || orderParam === 'desc' ? orderParam : defaultSort.order,
      };
    }

    return { filters: filtersFromUrl, page, sort };
    // Intentionally empty deps — read the URL exactly once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [filters, setFiltersState] = useState(initial.filters);
  const [page, setPage] = useState(initial.page);
  const [sortState, setSortState] = useState(initial.sort);

  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [isStale, setIsStale] = useState(false);

  const hasLoadedRef = useRef(false);
  const requestIdRef = useRef(0);
  const abortRef = useRef(null);

  const debouncedSearch = useDebouncedValue(filters.search ?? '', searchDebounceMs);

  // ---- filter / sort / page setters --------------------------------------
  const setFilter = useCallback((key, value) => {
    if (key === 'search') {
      // Page reset for search happens once the debounce settles (below) —
      // resetting immediately here would be resetting on every keystroke.
      setFiltersState((prev) => ({ ...prev, search: value }));
      return;
    }
    setFiltersState((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const replaceFilters = useCallback((next) => {
    setFiltersState(next);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(defaultFilters);
    setPage(1);
    // defaultFilters is a caller-provided literal; only care about identity
    // at mount time, same as `initial` above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSort = useCallback((sortKey) => {
    setSortState((prev) => {
      if (!prev) return prev;
      if (prev.sort === sortKey) {
        return { sort: sortKey, order: prev.order === 'asc' ? 'desc' : 'asc' };
      }
      return { sort: sortKey, order: 'asc' };
    });
    setPage(1);
  }, []);

  // Reset to page 1 once the debounced search term actually settles on a
  // new value. Skipped on mount (nothing to reset yet) and skipped while
  // the value is unchanged (avoids an extra no-op render on every fetch).
  const prevDebouncedSearchRef = useRef(debouncedSearch);
  useEffect(() => {
    if (prevDebouncedSearchRef.current !== debouncedSearch) {
      prevDebouncedSearchRef.current = debouncedSearch;
      setPage(1);
    }
  }, [debouncedSearch]);

  // ---- fetch --------------------------------------------------------------
  const otherFilters = useMemo(() => {
    const { search, ...rest } = filters;
    return rest;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);
  const otherFiltersKey = JSON.stringify(otherFilters);

  const fetchData = useCallback(async () => {
    // Starting a new request always supersedes whatever's in flight —
    // this is what makes an older, slower response unable to clobber a
    // newer one: it gets aborted outright, and even if it still resolves
    // (a real network layer doesn't guarantee instant cancellation), the
    // requestId check below throws its result away.
    const requestId = ++requestIdRef.current;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setError('');
      if (!hasLoadedRef.current) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const params = { page, limit: pageSize };
      if (sortState) {
        params.sort = sortState.sort;
        params.order = sortState.order;
      }
      if (debouncedSearch) params.search = debouncedSearch;
      Object.entries(otherFilters).forEach(([key, value]) => {
        if (value !== '' && value !== undefined && value !== null) params[key] = value;
      });

      const result = await fetcher(params, controller.signal);
      if (requestId !== requestIdRef.current) return; // superseded — drop it

      hasLoadedRef.current = true;
      setData(Array.isArray(result?.data) ? result.data : []);
      setMeta({
        page: result?.meta?.page ?? 1,
        totalPages: result?.meta?.totalPages ?? 1,
        total: result?.meta?.total ?? 0,
      });
      setIsStale(false);
    } catch (err) {
      if (isCancelError(err)) return; // we cancelled it ourselves — not an error
      if (requestId !== requestIdRef.current) return; // superseded

      setError(getErrorMessage(err, errorMessage));
      if (hasLoadedRef.current) setIsStale(true);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher, page, pageSize, sortState && sortState.sort, sortState && sortState.order, debouncedSearch, otherFiltersKey, errorMessage]);

  // fetchData already fully captures every value that should trigger a
  // re-fetch via its own useCallback deps above — depending on just
  // `fetchData` here (rather than duplicating that list) means there's one
  // place that defines "what a query change is", not two that can drift.
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Never leave a request hanging past unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  // ---- URL sync -------------------------------------------------------
  useEffect(() => {
    if (!syncUrl) return;
    const next = buildSearchParams({
      ...otherFilters,
      search: debouncedSearch,
      page: page > 1 ? page : undefined,
      sort: sortState ? sortState.sort : undefined,
      order: sortState ? sortState.order : undefined,
    });
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncUrl, otherFiltersKey, debouncedSearch, page, sortState && sortState.sort, sortState && sortState.order]);

  const hasActiveFilters = useMemo(
    () =>
      Object.keys(defaultFilters).some((key) => {
        if (key === 'search') return Boolean(filters.search);
        return (filters[key] ?? '') !== (defaultFilters[key] ?? '');
      }),
    // defaultFilters compared by its (caller-stable) shape via filters values
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters]
  );

  return {
    data,
    // Lets a caller reconcile the current page's rows against a value it
    // already knows is backend-authoritative (e.g. the response body of
    // a PATCH it just made) without a redundant re-fetch. Still exactly
    // "backend is the source of truth" — the value being written in was
    // never computed on the frontend, just already in hand.
    mutateData: setData,
    meta,
    loading,
    refreshing,
    error,
    isStale,
    filters,
    setFilter,
    replaceFilters,
    clearFilters,
    page,
    setPage,
    sort: sortState ? sortState.sort : undefined,
    order: sortState ? sortState.order : undefined,
    setSort,
    hasActiveFilters,
    refetch: fetchData,
  };
}
