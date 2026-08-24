// src/layout/ConfirmDialog.jsx
//
// A single reusable confirmation modal so destructive admin actions (like
// deleting a product) never fire directly off a click — the admin always
// sees exactly what's about to happen and has to explicitly confirm it.
// Deliberately not window.confirm(): that's untestable with Testing
// Library, unstyled, and blocks the JS event loop, and it wouldn't let us
// show a loading/"deleting…" state on the confirm button while the
// request is in flight.
import { useEffect, useRef } from 'react';
import Button from './Button';
import useFocusTrap from '../hooks/useFocusTrap';

const ConfirmDialog = ({
  open,
  title,
  message,
  error,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  isConfirming = false,
  onConfirm,
  onCancel,
  // Optional extra content (e.g. a reason input) rendered between the
  // message and any error text. Omitted by every existing caller, so this
  // is purely additive — it doesn't change how Products.jsx's delete
  // confirmation (or any other existing usage) renders.
  children,
}) => {
  const confirmButtonRef = useRef(null);
  const dialogRef = useRef(null);

  // Traps Tab/Shift+Tab inside the dialog while open, and returns focus to
  // whatever triggered it (the "Delete"/"Remove"/etc. button) once it
  // closes — see useFocusTrap for why this is a separate hook shared with
  // StockAdjustModal rather than duplicated logic.
  useFocusTrap(dialogRef, { active: open });

  // Focus the confirm button as soon as the dialog opens, and let Escape
  // cancel — matches native dialog keyboard behavior so keyboard-only
  // admins aren't stuck.
  useEffect(() => {
    if (!open) return undefined;

    confirmButtonRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isConfirming) {
        onCancel?.();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={() => !isConfirming && onCancel?.()}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        data-testid="confirm-dialog"
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-gray-900">
          {title}
        </h2>
        {message && (
          <p id="confirm-dialog-message" className="mt-2 text-sm text-gray-600">
            {message}
          </p>
        )}
        {children && <div className="mt-3">{children}</div>}
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={isConfirming}
            data-testid="confirm-dialog-cancel-btn"
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmButtonRef}
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={isConfirming}
            aria-busy={isConfirming || undefined}
            data-testid="confirm-dialog-confirm-btn"
          >
            {isConfirming ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
