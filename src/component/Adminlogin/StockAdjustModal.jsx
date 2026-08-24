// src/component/Adminlogin/StockAdjustModal.jsx
//
// The one place in the admin panel that mutates stock. Backend is the
// single source of truth throughout:
//   - On open, it reads GET /api/inventory/:productId (not whatever stock
//     value the calling table row happened to have) so the "current stock"
//     shown is fresh, not possibly-stale list data.
//   - The predicted "will become" number is clearly labeled as a preview —
//     the number actually applied comes back from the PATCH response and
//     is what gets reported to the caller via onSuccess.
//   - The current stock it read is sent back as `expectedStock` on 'set'
//     corrections, so the backend can reject (409) if another admin
//     changed the same product in between, instead of silently
//     overwriting their change. If that happens, this refreshes to the
//     real current stock and lets the admin decide again — it never
//     retries automatically.
import { useEffect, useRef, useState } from 'react';
import apiClient from '../../api/apiClient';
import Button from '../../layout/Button';
import ConfirmDialog from '../../layout/ConfirmDialog';
import useFocusTrap from '../../hooks/useFocusTrap';

// A correction is treated as "large or destructive" — and gated behind an
// explicit confirmation step — when it removes stock at all, or moves the
// count by a lot in either direction (guards against a fat-fingered
// quantity on a routine restock too).
const LARGE_CHANGE_THRESHOLD = 50;

const ACTIONS = [
  { value: 'increment', label: 'Increase by' },
  { value: 'decrement', label: 'Decrease by' },
  { value: 'set', label: 'Set exact stock to' },
];

const computePredictedStock = (action, quantity, currentStock) => {
  if (currentStock === null || quantity === null) return null;
  if (action === 'set') return quantity;
  if (action === 'increment') return currentStock + quantity;
  return currentStock - quantity; // decrement
};

const isLargeOrDestructive = (action, quantity, currentStock) => {
  const predicted = computePredictedStock(action, quantity, currentStock);
  if (predicted === null) return false;
  if (action === 'decrement') return true;
  if (predicted < currentStock) return true; // a 'set' that reduces stock
  return Math.abs(predicted - currentStock) >= LARGE_CHANGE_THRESHOLD;
};

const StockAdjustModal = ({ product, onClose, onSuccess }) => {
  const [currentStock, setCurrentStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [action, setAction] = useState('increment');
  const [quantityText, setQuantityText] = useState('');
  const [fieldError, setFieldError] = useState('');

  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const dialogRef = useRef(null);

  // Traps Tab/Shift+Tab inside this dialog and restores focus to the
  // "Adjust Stock" button that opened it once the component unmounts.
  // `active: true` is safe here (rather than tied to some prop) because
  // the parent only ever renders this component at all while a target
  // product is set — see Inventory.jsx. Paused (not torn down) while the
  // nested large/destructive-change ConfirmDialog is on top, so the two
  // dialogs' Tab traps never fight over the same keydown event.
  useFocusTrap(dialogRef, { active: true, paused: confirming });

  // Send focus into the dialog as soon as it mounts, same as
  // ConfirmDialog — otherwise a keyboard/screen-reader user stays
  // positioned on the now-hidden "Adjust Stock" button behind it.
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // Escape closes this dialog — but only when the nested ConfirmDialog
  // isn't the one on top; that dialog handles its own Escape and this
  // listener staying live too would close both at once on a single
  // keypress.
  useEffect(() => {
    if (confirming) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [confirming, submitting, onClose]);

  const loadCurrentStock = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await apiClient.get(`/api/inventory/${product.id}`);
      setCurrentStock(response.data.data.stock);
    } catch (err) {
      console.error('Error loading current stock:', err);
      setLoadError(
        err.response?.status === 404
          ? 'This product no longer exists.'
          : 'Failed to load current stock.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const parsedQuantity = quantityText.trim() === '' ? null : Number(quantityText);
  const quantityIsValid =
    parsedQuantity !== null && Number.isInteger(parsedQuantity) && parsedQuantity >= 0;
  const predictedStock = quantityIsValid
    ? computePredictedStock(action, parsedQuantity, currentStock)
    : null;
  const willUnderflow =
    action === 'decrement' && quantityIsValid && currentStock !== null && predictedStock < 0;

  const submit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const body = { action, quantity: parsedQuantity };
      // Only 'set' benefits from the optimistic-concurrency precondition
      // (increment/decrement are already atomic relative changes on the
      // backend), but sending it whenever we have a known current value
      // costs nothing and the backend simply ignores it for those actions.
      if (currentStock !== null) {
        body.expectedStock = currentStock;
      }

      const response = await apiClient.patch(`/api/inventory/${product.id}`, body);
      onSuccess(response.data.data);
    } catch (err) {
      console.error('Error adjusting stock:', err);
      const status = err.response?.status;
      const errors = err.response?.data?.errors;

      if (status === 409 && errors?.currentStock !== undefined) {
        // Stale edit: someone else changed this product's stock since we
        // loaded it. Show the real current value and let the admin decide
        // again instead of retrying blindly.
        setCurrentStock(errors.currentStock);
        setConfirming(false);
        setSubmitError(
          `Stock changed to ${errors.currentStock} since this was loaded. Review and try again.`
        );
      } else if (status === 409 && errors?.insufficientItems) {
        // Refresh so the admin sees exactly how much is actually available.
        await loadCurrentStock();
        setConfirming(false);
        setSubmitError('Not enough stock available for that decrease. Current stock is shown above.');
      } else if (status === 404) {
        setSubmitError('This product no longer exists.');
      } else {
        setSubmitError(err.response?.data?.message || 'Failed to update stock.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = (e) => {
    e.preventDefault();
    if (!quantityIsValid) {
      setFieldError('Enter a whole number, 0 or greater.');
      return;
    }
    setFieldError('');
    setSubmitError('');

    if (isLargeOrDestructive(action, parsedQuantity, currentStock)) {
      setConfirming(true);
    } else {
      submit();
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={() => !submitting && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-adjust-title"
        tabIndex={-1}
        data-testid="stock-adjust-modal"
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="stock-adjust-title" className="text-lg font-semibold text-gray-900">
          Adjust stock
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {product.name}
          {product.brand ? ` · ${product.brand}` : ''}
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-gray-500" role="status">
            Loading current stock…
          </p>
        ) : loadError ? (
          <div className="mt-6">
            <p role="alert" className="text-sm text-red-600">
              {loadError}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button variant="primary" onClick={loadCurrentStock}>
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-4 text-sm text-gray-700">
              Current stock: <span className="font-semibold">{currentStock}</span>
            </p>

            <form className="mt-4 space-y-3" onSubmit={handleReview}>
              <div>
                <label htmlFor="stock-action" className="block text-sm font-medium text-gray-700">
                  Action
                </label>
                <select
                  id="stock-action"
                  value={action}
                  onChange={(e) => {
                    setAction(e.target.value);
                    setSubmitError('');
                  }}
                  disabled={submitting}
                  className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  data-testid="stock-action-select"
                >
                  {ACTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="stock-quantity" className="block text-sm font-medium text-gray-700">
                  Quantity
                </label>
                <input
                  id="stock-quantity"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={quantityText}
                  onChange={(e) => {
                    setQuantityText(e.target.value);
                    setFieldError('');
                    setSubmitError('');
                  }}
                  disabled={submitting}
                  className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  data-testid="stock-quantity-input"
                />
                {fieldError && (
                  <p role="alert" className="mt-1 text-sm text-red-600" data-testid="stock-quantity-field-error">
                    {fieldError}
                  </p>
                )}
              </div>

              {quantityIsValid && (
                <p className="text-sm text-gray-600">
                  Stock will become{' '}
                  <span className="font-semibold">{willUnderflow ? '—' : predictedStock}</span>
                  {willUnderflow && (
                    <span className="text-red-600"> (not enough stock — backend will reject this)</span>
                  )}
                </p>
              )}

              {submitError && (
                <p role="alert" className="text-sm text-red-600" data-testid="stock-adjust-error">
                  {submitError}
                </p>
              )}

              <div className="mt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  disabled={submitting}
                  data-testid="stock-adjust-cancel-btn"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting}
                  aria-busy={submitting || undefined}
                  data-testid="stock-adjust-submit-btn"
                >
                  {submitting ? 'Applying…' : 'Apply'}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        title="Confirm stock correction"
        message={`This will change stock for "${product.name}" from ${currentStock} to ${predictedStock}. This is a large or reducing change and can't be undone from here.`}
        error={submitError}
        confirmLabel="Confirm correction"
        confirmVariant="danger"
        isConfirming={submitting}
        onConfirm={submit}
        onCancel={() => !submitting && setConfirming(false)}
      />
    </div>
  );
};

export default StockAdjustModal;
