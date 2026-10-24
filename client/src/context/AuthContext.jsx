import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { api, errMsg } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateReason, setGateReason] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setSession(data.session || null);
      return data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // A 401 anywhere means the session expired — reflect it in the UI.
  useEffect(() => {
    const id = api.interceptors.response.use(
      (r) => r,
      (err) => {
        if (err?.response?.status === 401 && user) {
          setUser(null);
          toast.error('Your session has expired. Please sign in again.');
        }
        return Promise.reject(err);
      }
    );
    return () => api.interceptors.response.eject(id);
  }, [user]);

  const applyLogin = (data, verb = 'Welcome back') => {
    setUser(data.user);
    setSession(data.session || null);
    setGateOpen(false);
    toast.success(`${verb}, ${data.user.name.split(' ')[0]}!`);
  };

  const login = async (identifier, password) => {
    const { data } = await api.post('/auth/login', { identifier, password });
    applyLogin(data);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    applyLogin(data, 'Welcome aboard');
    return data.user;
  };

  const loginWithFirebaseToken = async (idToken) => {
    const { data } = await api.post('/auth/firebase', { idToken });
    applyLogin(data, data.created ? 'Welcome aboard' : 'Welcome back');
    return data.user;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      toast.error(errMsg(e));
    }
    setUser(null);
    setSession(null);
    toast('Signed out', { description: 'Your session has been closed securely.' });
    navigate('/');
  };

  /** Wrap any action that needs a signed-in user — opens the sign-in prompt otherwise. */
  const requireAuth = useCallback(
    (fn, reason = 'Sign in to continue') =>
      (...args) => {
        if (!user) {
          setGateReason(reason);
          setGateOpen(true);
          return undefined;
        }
        return fn?.(...args);
      },
    [user]
  );

  const goToLogin = () => navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);

  return (
    <AuthContext.Provider
      value={{ user, setUser, session, loading, isAdmin: user?.role === 'admin', login, register, logout, loginWithFirebaseToken, refresh, requireAuth, gateOpen, setGateOpen, gateReason, goToLogin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
