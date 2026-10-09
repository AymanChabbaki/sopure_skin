import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Cross-tab live sync: when the admin changes something, every open tab of the site
 * (store or admin) refetches its data immediately, without a page refresh.
 */
const CHANNEL = 'sps-live';
let channel = null;
try {
  channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;
} catch {
  channel = null;
}

/** Tell the other tabs that data changed. */
export function broadcastChange(scope = 'all') {
  try {
    channel?.postMessage({ type: 'changed', scope, at: Date.now() });
  } catch {
    /* channel closed */
  }
}

/** Mount once: refetch everything this tab displays when another tab reports a change. */
export function useLiveSync() {
  const qc = useQueryClient();
  useEffect(() => {
    if (!channel) return undefined;
    const onMessage = (e) => {
      if (e.data?.type === 'changed') qc.invalidateQueries();
    };
    channel.addEventListener('message', onMessage);
    return () => channel.removeEventListener('message', onMessage);
  }, [qc]);
}
