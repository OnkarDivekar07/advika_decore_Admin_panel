// src/component/Adminlogin/NewArrivalsManagement.jsx
//
// Admin "new arrivals" homepage section — PHASE 10. GET
// /api/homepage/new-arrivals is exactly the same query the customer
// storefront's homepage runs (see
// backend/src/modules/homepage/homepage.service.js's
// getNewArrivalProducts — isNewArrival: true, isDeleted: false), so this
// list always reflects what's actually live.
//
// There is no "add to new arrivals" endpoint in the homepage module —
// that flag is set from the product itself (Products.jsx's "New Arrival?"
// checkbox on ProductForm, PATCH/POST /api/products). This component only
// ever does what the homepage module's own admin mutation supports:
// PATCH /api/homepage/new-arrivals/:id, which unfeatures a product
// (sets isNewArrival: false) — it does not delete the product. No
// separate "add" control is invented here for that reason.
import React, { useEffect, useState } from 'react';
import apiClient from '../../api/apiClient';
import LoadingState from '../../layout/LoadingState';
import ErrorState from '../../layout/ErrorState';
import EmptyState from '../../layout/EmptyState';
import Button from '../../layout/Button';
import ConfirmDialog from '../../layout/ConfirmDialog';

const NewArrivalsManagement = () => {
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState(null); // { tone: 'success' | 'error', message }

  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');

  // Same broken-image handling as BannerManagement — one clear fallback
  // instead of the browser silently retrying/looping on a dead image URL.
  const [brokenImageIds, setBrokenImageIds] = useState(() => new Set());

  useEffect(() => {
    if (!banner) return undefined;
    const timer = setTimeout(() => setBanner(null), 6000);
    return () => clearTimeout(timer);
  }, [banner]);

  // GET /api/homepage/new-arrivals responds with { data: [...], meta: {...} }
  // (see homepage.controller.js's getNewArrivalProducts) — the array
  // lives at response.data.data.
  const fetchNewArrivals = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/api/homepage/new-arrivals');
      setNewArrivals(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      console.error('Error fetching new arrivals:', err);
      setError(err.response?.data?.message || 'Failed to load new arrivals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewArrivals();
  }, []);

  const handleRemoveConfirmed = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    setRemoveError('');
    try {
      // PATCH /api/homepage/new-arrivals/:id — admin-only, sets
      // isNewArrival: false on the product (see
      // homepage.service.js's softDeleteNewArrivalService). This never
      // deletes the product itself.
      await apiClient.patch(`/api/homepage/new-arrivals/${removeTarget.id}`);
      setNewArrivals((prev) => prev.filter((item) => item.id !== removeTarget.id));
      setRemoveTarget(null);
      setBanner({ tone: 'success', message: `"${removeTarget.name}" removed from New Arrivals.` });
    } catch (err) {
      console.error('Error removing item from new arrivals:', err);
      setRemoveError(err.response?.data?.message || 'Failed to remove item from new arrivals.');
    } finally {
      setRemoving(false);
    }
  };

  const markImageBroken = (id) => {
    setBrokenImageIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  return (
    <div>
      <h3 className="mb-2 text-lg font-semibold text-gray-700">New Arrivals</h3>

      {banner && (
        <div
          role="status"
          className={`mb-4 rounded-md border p-3 text-sm ${
            banner.tone === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {banner.message}
        </div>
      )}

      {error && <ErrorState message={error} onRetry={fetchNewArrivals} className="mb-4" />}

      {loading ? (
        <LoadingState label="Loading new arrivals…" />
      ) : newArrivals.length === 0 ? (
        <EmptyState
          icon="star"
          title="No new arrivals marked"
          description="Mark a product as a new arrival from the Products page to feature it here."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {newArrivals.map((item) => (
            <div key={item.id} className="flex flex-col items-center rounded-lg border bg-gray-50 p-3">
              {brokenImageIds.has(item.id) || !item.images?.[0] ? (
                <div
                  className="mb-3 flex h-[150px] w-full flex-col items-center justify-center gap-1 rounded bg-gray-100 text-gray-600"
                  role="img"
                  aria-label={`${item.name} — image unavailable`}
                >
                  <i className="fas fa-circle-exclamation text-2xl" aria-hidden="true"></i>
                  <span className="text-xs">No image</span>
                </div>
              ) : (
                <img
                  alt={item.name}
                  className="mb-3 h-[150px] w-full rounded object-cover"
                  src={item.images[0]}
                  onError={() => markImageBroken(item.id)}
                />
              )}
              <p className="mb-1 line-clamp-2 text-center text-sm font-medium text-gray-900">{item.name}</p>
              <Button
                type="button"
                variant="dangerOutline"
                className="w-full"
                onClick={() => setRemoveTarget(item)}
                disabled={Boolean(removeTarget)}
                aria-label={`Remove ${item.name} from New Arrivals`}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove from New Arrivals?"
        message={
          removeTarget
            ? `"${removeTarget.name}" will no longer appear in the homepage's New Arrivals section. The product itself is not deleted.`
            : ''
        }
        error={removeError}
        confirmLabel="Remove"
        confirmVariant="danger"
        isConfirming={removing}
        onConfirm={handleRemoveConfirmed}
        onCancel={() => {
          if (!removing) {
            setRemoveTarget(null);
            setRemoveError('');
          }
        }}
      />
    </div>
  );
};

export default NewArrivalsManagement;
