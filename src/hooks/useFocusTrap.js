// src/hooks/useFocusTrap.js
//
// PHASE 17 — Accessibility. Shared keyboard-trap + focus-restore behavior
// for the app's modal dialogs (ConfirmDialog, StockAdjustModal) so that:
//   - Tab / Shift+Tab can never move focus out of an open dialog onto the
//     page behind it (a screen-reader or keyboard-only admin would
//     otherwise be able to tab "through" the dialog into hidden content).
//   - Closing the dialog — however it closes (Cancel, Escape, a
//     successful submit) — always returns focus to whatever element
//     opened it, instead of leaving focus on a removed/hidden node, which
//     most browsers silently reset to <body>, disorienting a keyboard or
//     screen-reader user who loses their place in the page.
//
// Two dialogs can be open at once (StockAdjustModal renders a nested
// ConfirmDialog for large/destructive corrections) — `paused` lets an
// outer dialog stop trapping Tab while an inner one is on top, without
// tearing down the outer trap's eventual focus-restore (that only runs
// once, when `active` itself goes false / the component unmounts).
import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement
  );
}

export default function useFocusTrap(containerRef, { active, paused = false } = {}) {
  const previouslyFocusedRef = useRef(null);

  // Remember + restore the triggering element. Keyed only on `active` so
  // a `paused` toggle (nested dialog opening/closing on top) never runs
  // this restore early — it only fires when the dialog this hook belongs
  // to actually opens/closes.
  useEffect(() => {
    if (!active) return undefined;
    previouslyFocusedRef.current = document.activeElement;

    return () => {
      const toRestore = previouslyFocusedRef.current;
      if (toRestore && document.contains(toRestore) && typeof toRestore.focus === 'function') {
        toRestore.focus();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Trap Tab/Shift+Tab within the container while active and not paused.
  useEffect(() => {
    if (!active || paused) return undefined;

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      const container = containerRef.current;
      const focusable = getFocusable(container);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;

      if (e.shiftKey) {
        if (current === first || !container.contains(current)) {
          e.preventDefault();
          last.focus();
        }
      } else if (current === last || !container.contains(current)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, paused, containerRef]);
}
