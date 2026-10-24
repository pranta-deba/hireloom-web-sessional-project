import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { useConfig } from './ConfigContext';
import { setSocketId } from '../lib/api';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const { reload } = useConfig();
  const [socket, setSocket] = useState(null);
  const [online, setOnline] = useState(0);
  const [connected, setConnected] = useState(false);

  // reload কে ref এ রাখুন যাতে dependency তে না দিতে হয়
  const reloadRef = useRef(reload);
  useEffect(() => {
    reloadRef.current = reload;
  }, [reload]);

  useEffect(() => {
    const s = io({
      path: '/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      setConnected(true);
      setSocketId(s.id);
    });
    s.on('disconnect', () => setConnected(false));
    s.on('presence:count', ({ online: n }) => setOnline(n));
    s.on('notify', ({ type, message }) => (toast[type] || toast)(message));
    s.on('config:updated', () => reloadRef.current()); // ⬅️ ref ব্যবহার
    s.on('admin:pending-blog', ({ title, author }) =>
      toast.info('New post awaiting review', { description: `"${title}" by @${author}` })
    );
    s.on('admin:new-user', ({ name, username }) =>
      toast.success('New member joined', { description: `${name} (@${username})` })
    );
    s.on('admin:new-message', ({ name, subject }) =>
      toast('New contact message', { description: `${name}: ${subject}` })
    );

    setSocket(s);

    return () => {
      // ⬇️ শুধু disconnect, close নয় — এবং event listeners clean করুন
      s.removeAllListeners();
      s.disconnect();
      setSocketId(null);
    };
    // ⬇️ শুধু user change হলেই socket নতুন করে বানাবে
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, user?.role]);

  return (
    <SocketContext.Provider value={{ socket, online, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);


// import { createContext, useContext, useEffect, useState } from 'react';
// import { io } from 'socket.io-client';
// import { toast } from 'sonner';
// import { useAuth } from './AuthContext';
// import { useConfig } from './ConfigContext';
// import { setSocketId } from '../lib/api';

// const SocketContext = createContext(null);

// /**
//  * One WebSocket per tab. Reconnects whenever the auth state changes so the
//  * server re-reads the session (user rooms, admin room, AI permissions).
//  */
// export function SocketProvider({ children }) {
//   const { user } = useAuth();
//   const { reload } = useConfig();
//   const [socket, setSocket] = useState(null);
//   const [online, setOnline] = useState(0);
//   const [connected, setConnected] = useState(false);

//   useEffect(() => {
//     const s = io({ path: '/socket.io', withCredentials: true, transports: ['websocket', 'polling'] });
//     s.on('connect', () => {
//       setConnected(true);
//       setSocketId(s.id);
//     });
//     s.on('disconnect', () => setConnected(false));
//     s.on('presence:count', ({ online: n }) => setOnline(n));
//     s.on('notify', ({ type, message }) => (toast[type] || toast)(message));
//     s.on('config:updated', () => reload());
//     s.on('admin:pending-blog', ({ title, author }) => toast.info('New post awaiting review', { description: `“${title}” by @${author}` }));
//     s.on('admin:new-user', ({ name, username }) => toast.success('New member joined', { description: `${name} (@${username})` }));
//     s.on('admin:new-message', ({ name, subject }) => toast('New contact message', { description: `${name}: ${subject}` }));
//     setSocket(s);
//     return () => {
//       s.close();
//       setSocketId(null);
//     };
//   }, [user?._id, user?.role, reload]);

//   return <SocketContext.Provider value={{ socket, online, connected }}>{children}</SocketContext.Provider>;
// }

// export const useSocket = () => useContext(SocketContext);
