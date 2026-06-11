import { useEffect, useEffectEvent } from 'react';

const WS_BASE_URL = resolveWebSocketBaseUrl();

export function useWebSocket(jobId, onMessage) {
  const handleMessage = useEffectEvent((payload) => {
    onMessage?.(payload);
  });

  useEffect(() => {
    if (!jobId) {
      return undefined;
    }

    const socket = new WebSocket(`${WS_BASE_URL}?jobId=${jobId}`);

    socket.onmessage = (event) => {
      try {
        handleMessage(JSON.parse(event.data));
      } catch {
        // Ignore malformed WebSocket messages.
      }
    };

    socket.onerror = () => socket.close();

    return () => socket.close();
  }, [jobId]);
}

function resolveWebSocketBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim();
  if (!configuredUrl || configuredUrl.startsWith('/')) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }

  if (!/^https?:\/\//i.test(configuredUrl)) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }

  return configuredUrl.replace(/^http/i, 'ws').replace(/\/api\/?$/, '');
}
