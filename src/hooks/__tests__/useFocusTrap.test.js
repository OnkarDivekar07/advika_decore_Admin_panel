// src/hooks/__tests__/useFocusTrap.test.js
//
// Pattern 21 (mobile/responsive/accessibility smoke): useFocusTrap backs
// every real modal in the admin panel (ConfirmDialog, StockAdjustModal)
// but had no test of its own — a regression here would silently break
// Tab-trapping/focus-restore for both, and for the nested-dialog `paused`
// behavior StockAdjustModal specifically relies on (it renders a
// ConfirmDialog on top of itself for large/destructive corrections).
import React, { useRef, useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useFocusTrap from '../useFocusTrap';

function TestDialog({ active, paused }) {
  const ref = useRef(null);
  useFocusTrap(ref, { active, paused });
  return (
    <div ref={ref} role="dialog" data-testid="dialog">
      <button data-testid="first">First</button>
      <button data-testid="middle">Middle</button>
      <button data-testid="last">Last</button>
    </div>
  );
}

function Harness() {
  const [active, setActive] = useState(false);
  return (
    <div>
      <button data-testid="trigger" onClick={() => setActive(true)}>
        Open
      </button>
      {active && <TestDialog active={active} paused={false} />}
      {active && (
        <button data-testid="close" onClick={() => setActive(false)}>
          Close
        </button>
      )}
    </div>
  );
}

describe('useFocusTrap', () => {
  it('restores focus to the trigger element when the dialog closes', async () => {
    render(<Harness />);
    const trigger = screen.getByTestId('trigger');
    trigger.focus();
    await userEvent.click(trigger);

    await userEvent.click(screen.getByTestId('close'));

    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('wraps Tab from the last focusable element back to the first', () => {
    render(<TestDialog active paused={false} />);
    screen.getByTestId('last').focus();

    fireEvent.keyDown(document, { key: 'Tab' });

    expect(screen.getByTestId('first')).toHaveFocus();
  });

  it('wraps Shift+Tab from the first focusable element to the last', () => {
    render(<TestDialog active paused={false} />);
    screen.getByTestId('first').focus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });

    expect(screen.getByTestId('last')).toHaveFocus();
  });

  it('does not trap Tab while paused (a nested dialog is on top)', () => {
    render(<TestDialog active paused />);
    screen.getByTestId('last').focus();

    fireEvent.keyDown(document, { key: 'Tab' });

    // Not trapped — focus stays wherever it was; the trap must not fight
    // the nested dialog on top of it for control of Tab.
    expect(screen.getByTestId('last')).toHaveFocus();
  });

  it('does nothing when not active', () => {
    render(<TestDialog active={false} paused={false} />);
    document.body.focus();

    fireEvent.keyDown(document, { key: 'Tab' });

    // No candidate elements were trapped into — nothing throws, focus is
    // simply left alone.
    expect(screen.getByTestId('first')).not.toHaveFocus();
  });
});
