import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { uid } from '../lib/utils';
import { useSocket } from '../context/SocketContext';

export function useDebounce(value, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/** Records a page view for the admin analytics dashboard on every route change. */
export function usePageTracking() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname.startsWith('/admin')) return;
    const t = setTimeout(() => api.post('/analytics/visit', { path: pathname, referrer: document.referrer }).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [pathname]);
}

/**
 * Streams an AI task over the WebSocket.
 * status: idle → connecting → streaming → done | error | stopped
 */
export function useAIStream() {
  const { socket } = useSocket();
  const [state, setState] = useState({ status: 'idle', text: '', error: null, provider: null });
  const current = useRef(null);
  const resolver = useRef(null);

  useEffect(() => {
    if (!socket) return undefined;
    const mine = (p) => p?.requestId && p.requestId === current.current;
    const onStart = (p) => mine(p) && setState((s) => ({ ...s, status: 'streaming', provider: p.provider }));
    const onChunk = (p) => mine(p) && setState((s) => ({ ...s, status: 'streaming', text: s.text + p.delta }));
    const onDone = (p) => {
      if (!mine(p)) return;
      setState((s) => ({ ...s, status: p.aborted ? 'stopped' : 'done', text: p.content ?? s.text }));
      resolver.current?.resolve(p.content);
      current.current = null;
    };
    const onError = (p) => {
      if (!mine(p)) return;
      setState((s) => ({ ...s, status: 'error', error: p.message }));
      resolver.current?.reject(new Error(p.message));
      current.current = null;
    };
    const onDrop = () => {
      if (!current.current) return;
      setState((s) => ({ ...s, status: s.text ? 'stopped' : 'error', error: s.text ? null : 'Connection to the server was lost. Please try again.' }));
      resolver.current?.reject(new Error('disconnected'));
      current.current = null;
    };
    socket.on('disconnect', onDrop);
    socket.on('ai:start', onStart);
    socket.on('ai:chunk', onChunk);
    socket.on('ai:done', onDone);
    socket.on('ai:error', onError);
    return () => {
      socket.off('disconnect', onDrop);
      socket.off('ai:start', onStart);
      socket.off('ai:chunk', onChunk);
      socket.off('ai:done', onDone);
      socket.off('ai:error', onError);
    };
  }, [socket]);

  const start = useCallback(
    (task, payload = {}) =>
      new Promise((resolve, reject) => {
        if (!socket) {
          setState({ status: 'error', text: '', error: 'Real-time connection is starting — please try again in a moment.', provider: null });
          reject(new Error('Socket not ready'));
          return;
        }
        const requestId = uid();
        current.current = requestId;
        resolver.current = { resolve, reject };
        setState({ status: 'connecting', text: '', error: null, provider: null });
        const send = () => current.current === requestId && socket.emit('ai:request', { requestId, task, ...payload });
        if (socket.connected) return send();
        // Briefly wait for a (re)connecting socket instead of failing instantly.
        socket.connect();
        const giveUp = setTimeout(() => {
          socket.off('connect', onConnect);
          if (current.current !== requestId) return;
          current.current = null;
          setState({ status: 'error', text: '', error: 'Cannot reach the HireLoom server. Check that the API is running and try again.', provider: null });
          reject(new Error('Socket not connected'));
        }, 8000);
        const onConnect = () => {
          clearTimeout(giveUp);
          send();
        };
        socket.once('connect', onConnect);
      }),
    [socket]
  );

  const stop = useCallback(() => {
    if (current.current) socket?.emit('ai:cancel', { requestId: current.current });
  }, [socket]);

  const reset = useCallback(() => setState({ status: 'idle', text: '', error: null, provider: null }), []);
  const setText = useCallback((text) => setState((s) => ({ ...s, text })), []);

  return { ...state, busy: state.status === 'connecting' || state.status === 'streaming', start, stop, reset, setText };
}

export function useClickOutside(ref, handler) {
  useEffect(() => {
    const fn = (e) => ref.current && !ref.current.contains(e.target) && handler(e);
    document.addEventListener('mousedown', fn);
    document.addEventListener('touchstart', fn);
    return () => {
      document.removeEventListener('mousedown', fn);
      document.removeEventListener('touchstart', fn);
    };
  }, [ref, handler]);
}
