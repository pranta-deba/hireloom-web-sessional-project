import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';

const ConfigContext = createContext(null);

const FALLBACK = {
  site: { name: 'HireLoom', tagline: '', heroTitle: 'Craft the résumé that gets the call.', heroSubtitle: '', social: {} },
  features: {},
  auth: {},
  chatbot: { enabled: false },
  ai: { provider: 'local', ready: false, model: '' },
  media: { videos: [], audios: [] },
  ml: {},
};

/** Public site configuration managed from the admin dashboard (no secrets). */
export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const { data } = await api.get('/config/public');
      setConfig(data);
      document.title = `${data.site.name} — ${data.site.tagline || 'Career workspace'}`;
    } catch {
      /* keep fallback */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return <ConfigContext.Provider value={{ config, loading, reload, siteName: config.site.name }}>{children}</ConfigContext.Provider>;
}

export const useConfig = () => useContext(ConfigContext);
