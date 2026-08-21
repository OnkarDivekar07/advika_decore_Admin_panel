// src/hooks/useNetworkStatus.js
//
// PHASE 16 — "Handle network offline/online transitions where
// practical." A thin wrapper around the browser's own connectivity
// signal (navigator.onLine + the window online/offline events) — this
// deliberately does NOT try to actively probe the backend (no polling
// /health from here); that's what AdminLayout's OfflineBanner + each
// screen's own retry button are for. This hook only answers one
// question: does the browser itself currently believe it has a network
// connection.
//
// `wasOffline` stays true for a short window after reconnecting so a
// caller (OfflineBanner) can show a brief "back online" confirmation
// instead of the offline banner just vanishing with no acknowledgement.
import { useEffect, useState } from 'react';

const getInitialOnlineState = () =>
  typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean' ? true : navigator.onLine;

export default function useNetworkStatus({ reconnectedMessageMs = 4000 } = {}) {
  const [isOnline, setIsOnline] = useState(getInitialOnlineState);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let reconnectTimer;

    const handleOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => setJustReconnected(false), reconnectedMessageMs);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setJustReconnected(false);
      clearTimeout(reconnectTimer);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(reconnectTimer);
    };
  }, [reconnectedMessageMs]);

  return { isOnline, justReconnected };
}
