import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { useConfig } from './ConfigContext';
import { setSocketId } from '../lib/api';

const SocketContext = createContext(null);

/**
 * In development the socket talks to the API directly (http://<host>:5000) instead of going
 * through Vite's WebSocket proxy, which logs ECONNRESET / ECONNABORTED every time the API
 * restarts or a tab closes. Cookies are host-scoped (not port-scoped), so the session still works.
 * In production the API serves the client, so the socket stays same-origin.
 */
function socketUrl() {
  if (!import.meta.env.DEV) return undefined;
  const explicit = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_PROXY || 'http://localhost:5000';
  try {
    const u = new URL(explicit);
    // opened from another device on the LAN → reach the API on the same host
    if (['localhost', '127.0.0.1'].includes(u.hostname) && !['localhost', '127.0.0.1'].includes(window.location.hostname)) u.hostname = window.location.hostname;
    return u.origin;
  } catch {
    return undefined;
  }
}

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const { reload } = useConfig();
  const [socket, setSocket] = useState(null);
  const [online, setOnline] = useState(0);
  const [connected, setConnected] = useState(false);

  // keep reload in a ref so it does not re-create the socket
  const reloadRef = useRef(reload);
  useEffect(() => {
    reloadRef.current = reload;
  }, [reload]);

  useEffect(() => {
    let s = null;
    // Deferred so React StrictMode's mount → unmount → mount in development does not open and
    // immediately kill a socket ("WebSocket is closed before the connection is established").
    const timer = setTimeout(() => {
      s = io(socketUrl(), {
        path: '/socket.io',
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnectionDelay: 1000,
        reconnectionDelayMax: 8000,
      });

      s.on('connect', () => {
        setConnected(true);
        setSocketId(s.id);
      });
      s.on('disconnect', () => setConnected(false));
      s.on('connect_error', () => setConnected(false));
      s.on('presence:count', ({ online: n }) => setOnline(n));
      s.on('notify', ({ type, message }) => (toast[type] || toast)(message));
      s.on('config:updated', () => reloadRef.current());
      s.on('admin:pending-blog', ({ title, author }) => toast.info('New post awaiting review', { description: `"${title}" by @${author}` }));
      s.on('admin:new-user', ({ name, username }) => toast.success('New member joined', { description: `${name} (@${username})` }));
      s.on('admin:new-message', ({ name, subject }) => toast('New contact message', { description: `${name}: ${subject}` }));

      setSocket(s);
    }, 0);

    return () => {
      clearTimeout(timer);
      if (s) {
        s.removeAllListeners();
        s.disconnect();
      }
      setSocketId(null);
      setConnected(false);
    };
    // Reconnect only when the signed-in identity changes (server re-reads the session).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, user?.role]);

  return (
    <SocketContext.Provider value={{ socket, online, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);

