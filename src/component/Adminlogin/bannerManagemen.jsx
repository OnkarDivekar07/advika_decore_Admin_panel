// src/component/Adminlogin/BannerManagement.jsx
//
// Admin homepage banner management — PHASE 10. GET/POST/DELETE
// /api/homepage/banners (see backend/src/modules/homepage/homepage.routes.js)
// is the single source of truth: this list is exactly what the customer
// storefront's homepage shows, nothing computed or cached separately here.
//
// POST is multipart (image + optional linkUrl) — mirrors ProductForm.jsx's
// upload conventions (axios onUploadProgress, an in-flight ref guard
// against double-submits, keeping the selected file on failure so the
// admin doesn't have to re-pick it to retry).
import React, { useEffect, useRef, useState } from 'react';
import apiClient from '../../api/apiClient';
import LoadingState from '../../layout/LoadingState';
import ErrorState from '../../layout/ErrorState';
import EmptyState from '../../layout/EmptyState';
import Button from '../../layout/Button';
import ConfirmDialog from '../../layout/ConfirmDialog';

// Advisory only — the backend (homepage.controller.js's createBanner ->
// bannerHelpers.validateImage) only checks that a file was attached at
// all, nothing about type or size. This client-side check exists purely
// so an admin gets an immediate, specific error instead of waiting on a
// slow upload of a 40MB file or a non-image that S3 will happily store
// but the storefront can't render. It is NOT a security boundary.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

const validateSelectedFile = (file) => {
  if (!file) return 'Please select an image.';
  if (!file.type || !file.type.startsWith('image/')) {
    return 'Please select an image file (JPG, PNG, WEBP, etc).';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'Image is too large — please use a file under 5MB.';
  }
  return '';
};

// Very small, permissive URL check purely so an obviously-malformed link
// (missing scheme, stray spaces) is caught before a round trip. The
// backend's own `isURL` validator (homepage.validation.js's
// createBannerValidator) is the actual source of truth — a value that
// passes this but fails there still comes back as a normal 422, handled
// by the same error path as any other backend rejection.
const looksLikeUrl = (value) => /^https?:\/\/.+/i.test(value.trim());

const BannerManagement = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [fileError, setFileError] = useState('');
  const [linkError, setLinkError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [banner, setBanner] = useState(null); // { tone: 'success' | 'error', message }

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Images that failed to load, so a broken URL renders one clear
  // fallback instead of the browser silently retrying/looping on the
  // same broken <img src>.
  const [brokenImageIds, setBrokenImageIds] = useState(() => new Set());

  const fileInputRef = useRef(null);
  const submittingRef = useRef(false); // guards a double-submit beyond what the disabled button already does
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Revoke the object URL whenever it's replaced/unmounted so we don't
  // leak memory across repeated selections.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!banner) return undefined;
    const timer = setTimeout(() => setBanner(null), 6000);
    return () => clearTimeout(timer);
  }, [banner]);

  // GET /api/homepage/banners responds with { data: [...], meta: {...} }
  // (see homepage.controller.js's getBanners) — the array lives at
  // response.data.data.
  const fetchBanners = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/api/homepage/banners');
      const list = res.data.data;
      setBanners(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error fetching banners:', err);
      setError(err.response?.data?.message || 'Failed to load banners.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const resetUploadForm = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setLinkUrl('');
    setFileError('');
    setLinkError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0] || null;
    setFileError('');
    setUploadError('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    const validationMessage = validateSelectedFile(file);
    if (validationMessage) {
      setFileError(validationMessage);
      setSelectedFile(null);
      setPreviewUrl(null);
      // Clear the native input too — otherwise a rejected file stays
      // "selected" as far as the browser is concerned, and re-picking the
      // exact same (still-invalid) file wouldn't even fire onChange again.
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;

    const fileValidation = validateSelectedFile(selectedFile);
    const trimmedLink = linkUrl.trim();
    const linkValidation = trimmedLink && !looksLikeUrl(trimmedLink)
      ? 'Link must be a full URL starting with http:// or https://'
      : '';

    if (fileValidation || linkValidation) {
      setFileError(fileValidation);
      setLinkError(linkValidation);
      return;
    }

    submittingRef.current = true;
    setUploading(true);
    setUploadError('');
    setUploadProgress(0);

    try {
      const form = new FormData();
      form.append('image', selectedFile);
      if (trimmedLink) form.append('linkUrl', trimmedLink);

      // POST /api/homepage/banners is admin-only; apiClient attaches the
      // Bearer token automatically. Called via apiClient(config) rather
      // than apiClient.post(...) so onUploadProgress can be passed through
      // — same convention as ProductForm.jsx.
      await apiClient({
        method: 'post',
        url: '/api/homepage/banners',
        data: form,
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          if (isMountedRef.current) setUploadProgress(pct);
        },
      });

      if (!isMountedRef.current) return;
      resetUploadForm();
      setBanner({ tone: 'success', message: 'Banner uploaded successfully.' });
      fetchBanners();
    } catch (err) {
      console.error('Error uploading banner:', err);
      if (!isMountedRef.current) return;

      // Field-level errors (e.g. an invalid linkUrl caught server-side)
      // get routed back to the specific field instead of a generic
      // banner, same treatment ProductForm.jsx gives a 422. The selected
      // file and preview are deliberately left in place either way — a
      // failed upload (network blip, validation miss) shouldn't force the
      // admin to re-pick the image to try again.
      const backendErrors = err.response?.data?.errors;
      const linkFieldError = Array.isArray(backendErrors)
        ? backendErrors.find((e2) => e2.field === 'linkUrl')?.message
        : null;

      if (linkFieldError) {
        setLinkError(linkFieldError);
      } else {
        setUploadError(err.response?.data?.message || 'Failed to upload banner. Please try again.');
      }
    } finally {
      submittingRef.current = false;
      if (isMountedRef.current) setUploading(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      // DELETE /api/homepage/banners/:id
      await apiClient.delete(`/api/homepage/banners/${deleteTarget.id}`);
      setBanners((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      setDeleteTarget(null);
      setBanner({ tone: 'success', message: 'Banner deleted.' });
    } catch (err) {
      console.error('Error deleting banner:', err);
      setDeleteError(err.response?.data?.message || 'Failed to delete banner.');
    } finally {
      setDeleting(false);
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
      <h3 className="mb-4 text-lg font-semibold text-gray-700">Homepage Banners</h3>

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

      {error && <ErrorState message={error} onRetry={fetchBanners} className="mb-4" />}

      {/* Upload Form */}
      <form
        onSubmit={handleUpload}
        className="mb-6 space-y-3 rounded-md border border-gray-200 p-4"
        data-testid="banner-upload-form"
      >
        <div>
          <label htmlFor="banner-image-input" className="mb-1 block text-sm font-medium text-gray-700">
            Banner image
          </label>
          <input
            id="banner-image-input"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            aria-invalid={Boolean(fileError)}
            data-testid="banner-image-input"
            className="block w-full text-sm text-gray-500 file:mr-4 file:rounded file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-white hover:file:bg-blue-700 disabled:opacity-60"
          />
          {fileError && (
            <p className="mt-1 text-sm text-red-600" role="alert" data-testid="banner-image-error">
              {fileError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="banner-link-input" className="mb-1 block text-sm font-medium text-gray-700">
            Link URL <span className="font-normal text-gray-600">(optional)</span>
          </label>
          <input
            id="banner-link-input"
            type="url"
            placeholder="https://example.com/sale"
            value={linkUrl}
            onChange={(e) => {
              setLinkUrl(e.target.value);
              if (linkError) setLinkError('');
            }}
            disabled={uploading}
            aria-invalid={Boolean(linkError)}
            data-testid="banner-link-input"
            className={`w-full rounded-md border p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 ${
              linkError ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {linkError && (
            <p className="mt-1 text-sm text-red-600" role="alert" data-testid="banner-link-error">
              {linkError}
            </p>
          )}
        </div>

        {previewUrl && (
          <div>
            <p className="mb-1 text-sm text-gray-600">Preview:</p>
            <img src={previewUrl} alt="Selected banner preview" className="w-full max-w-md rounded shadow" />
          </div>
        )}

        {uploadError && (
          <p className="text-sm text-red-600" role="alert" data-testid="banner-upload-error">
            {uploadError}
          </p>
        )}

        {uploading && (
          <div
            className="h-2 w-full rounded bg-gray-200"
            role="progressbar"
            aria-label="Upload progress"
            aria-valuenow={uploadProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            data-testid="banner-upload-progress"
          >
            <div
              className="h-2 rounded bg-blue-600 transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="submit"
            variant="primary"
            disabled={uploading || !selectedFile}
            aria-busy={uploading || undefined}
            data-testid="banner-upload-btn"
          >
            {uploading ? `Uploading… ${uploadProgress}%` : 'Upload Banner'}
          </Button>
          {(selectedFile || linkUrl) && !uploading && (
            <Button
              type="button"
              variant="secondary"
              onClick={resetUploadForm}
              data-testid="banner-clear-btn"
            >
              Clear
            </Button>
          )}
        </div>
      </form>

      {/* Existing Banners — exactly what the storefront homepage shows */}
      {loading ? (
        <LoadingState label="Loading banners…" />
      ) : banners.length === 0 ? (
        <EmptyState icon="image" title="No banners yet" description="Upload an image above to add the first homepage banner." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {banners.map((b, index) => (
            <div key={b.id} className="flex flex-col items-center rounded-lg border bg-gray-50 p-3">
              {brokenImageIds.has(b.id) ? (
                <div
                  className="mb-3 flex h-[150px] w-full flex-col items-center justify-center gap-1 rounded bg-gray-100 text-gray-600"
                  role="img"
                  aria-label="Image failed to load"
                >
                  <i className="fas fa-circle-exclamation text-2xl" aria-hidden="true"></i>
                  <span className="text-xs">Image failed to load</span>
                </div>
              ) : (
                <img
                  alt="Banner"
                  src={b.imageUrl}
                  onError={() => markImageBroken(b.id)}
                  className="mb-3 h-[150px] w-full rounded object-cover"
                />
              )}
              {b.linkUrl && (
                <a
                  href={b.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-2 max-w-full truncate text-xs text-blue-600 hover:underline"
                  title={b.linkUrl}
                >
                  {b.linkUrl}
                </a>
              )}
              <Button
                type="button"
                variant="dangerOutline"
                className="w-full"
                onClick={() => setDeleteTarget(b)}
                disabled={Boolean(deleteTarget)}
                aria-label={`Delete banner ${index + 1}${b.linkUrl ? ` (links to ${b.linkUrl})` : ''}`}
                data-testid={`banner-delete-btn-${b.id}`}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this banner?"
        message="This banner will be removed from the homepage immediately. This can't be undone from here."
        error={deleteError}
        confirmLabel="Delete"
        confirmVariant="danger"
        isConfirming={deleting}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
            setDeleteError('');
          }
        }}
      />
    </div>
  );
};

export default BannerManagement;
