import React, { useEffect, useState } from 'react';
import apiClient from '../../api/apiClient';
import LoadingState from '../../layout/LoadingState';
import ErrorState from '../../layout/ErrorState';
import EmptyState from '../../layout/EmptyState';

const NewArrivalsManagement = () => {
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Real route is GET /api/homepage/new-arrivals (see
  // backend/src/modules/homepage/homepage.routes.js) — was previously
  // pointed at a non-existent /api/banner/new-arrivals and always 404'd.
  const fetchNewArrivals = async () => {
    try {
      setError('');
      const res = await apiClient.get('/api/homepage/new-arrivals');
      setNewArrivals(res.data.data || []);
    } catch (err) {
      console.error('Error fetching new arrivals:', err);
      setError('Failed to load new arrivals.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      // Real route is PATCH /api/homepage/new-arrivals/:id (plural, and
      // admin-only — the shared apiClient now attaches the Bearer token
      // the previous version omitted entirely).
      await apiClient.patch(`/api/homepage/new-arrivals/${id}`);
      // Remove the deleted item from the UI
      setNewArrivals(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error removing item from new arrivals:', error);
      alert('Failed to remove item from new arrivals.');
    }
  };

  useEffect(() => {
    fetchNewArrivals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">New Arrivals</h3>
      {error && <ErrorState message={error} onRetry={fetchNewArrivals} className="mb-4" />}

      {loading ? (
        <LoadingState label="Loading new arrivals…" />
      ) : newArrivals.length === 0 ? (
        <EmptyState icon="star" title="No new arrivals marked" description="Mark a product as a new arrival from the Products page to feature it here." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {newArrivals.map((item, index) => (
            <div key={index} className="border rounded-lg p-3 bg-gray-50 flex flex-col items-center">
              <img
                alt={item.name}
                className="rounded mb-3 w-full object-cover"
                src={item.images?.[0] || 'https://via.placeholder.com/150'}
                height="150"
                width="150"
              />
              <p className="font-medium text-gray-900 mb-1 text-center text-sm">{item.name}</p>
              <button
                onClick={() => handleDelete(item.id)}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                type="button"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NewArrivalsManagement;
