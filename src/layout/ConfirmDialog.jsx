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
}) => {
  const confirmButtonRef = useRef(null);

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
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
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
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={isConfirming}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmButtonRef}
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={isConfirming}
            aria-busy={isConfirming || undefined}
          >
            {isConfirming ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
