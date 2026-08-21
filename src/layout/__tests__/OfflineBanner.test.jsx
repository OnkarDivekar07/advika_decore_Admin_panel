import React from 'react';
import { render, screen, act } from '@testing-library/react';
import OfflineBanner from '../OfflineBanner';

describe('OfflineBanner', () => {
  const setNavigatorOnLine = (value) => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value,
    });
  };

  afterEach(() => {
    setNavigatorOnLine(true);
  });

  it('renders nothing while online', () => {
    setNavigatorOnLine(true);
    render(<OfflineBanner />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows an offline alert when the browser goes offline', () => {
    setNavigatorOnLine(true);
    render(<OfflineBanner />);

    setNavigatorOnLine(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/you're offline/i);
  });

  it('shows a "back online" confirmation after reconnecting', () => {
    setNavigatorOnLine(false);
    render(<OfflineBanner />);
    expect(screen.getByRole('alert')).toHaveTextContent(/you're offline/i);

    setNavigatorOnLine(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(screen.getByRole('status')).toHaveTextContent(/back online/i);
  });
});
