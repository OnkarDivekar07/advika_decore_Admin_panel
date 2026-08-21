import { renderHook, act } from '@testing-library/react';
import useNetworkStatus from '../useNetworkStatus';

describe('useNetworkStatus', () => {
  const setNavigatorOnLine = (value) => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value,
    });
  };

  afterEach(() => {
    setNavigatorOnLine(true);
    jest.useRealTimers();
  });

  it('starts online when navigator.onLine is true', () => {
    setNavigatorOnLine(true);
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
    expect(result.current.justReconnected).toBe(false);
  });

  it('starts offline when navigator.onLine is false', () => {
    setNavigatorOnLine(false);
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(false);
  });

  it('flips to offline when the browser fires an "offline" event', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
  });

  it('flips to online and flags justReconnected on an "online" event', () => {
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.isOnline).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.justReconnected).toBe(true);
  });

  it('clears justReconnected after the configured window', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useNetworkStatus({ reconnectedMessageMs: 1000 }));

    act(() => {
      window.dispatchEvent(new Event('offline'));
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.justReconnected).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.justReconnected).toBe(false);
  });

  it('clears any pending "just reconnected" state if it goes offline again first', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useNetworkStatus({ reconnectedMessageMs: 1000 }));

    act(() => {
      window.dispatchEvent(new Event('offline'));
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.justReconnected).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.justReconnected).toBe(false);
  });
});
