import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from './api';
import type { Bootstrap, Category, Settings } from './types';

interface SiteValue {
  ready: boolean;
  error: string | null;
  settings: Settings;
  categories: Category[];
  stats: Bootstrap['stats'];
  /** Read a setting with a fallback, so a blanked field never renders empty. */
  text: (key: string, fallback?: string) => string;
  /** Settings stored as '1' / '0'. */
  flag: (key: string, fallback?: boolean) => boolean;
  num: (key: string, fallback?: number) => number;
  refresh: () => Promise<void>;
}

const EMPTY: Bootstrap = { settings: {}, categories: [], stats: { projects: 0, categories: 0 } };

const SiteContext = createContext<SiteValue | null>(null);

export function SiteProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Bootstrap>(EMPTY);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.bootstrap());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'بارگذاری سایت ناموفق بود.');
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<SiteValue>(
    () => ({
      ready,
      error,
      settings: data.settings,
      categories: data.categories,
      stats: data.stats,
      text: (key, fallback = '') => data.settings[key]?.trim() || fallback,
      flag: (key, fallback = true) => {
        const raw = data.settings[key];
        return raw === undefined ? fallback : raw === '1';
      },
      num: (key, fallback = 0) => {
        const parsed = Number.parseInt(data.settings[key] ?? '', 10);
        return Number.isFinite(parsed) ? parsed : fallback;
      },
      refresh: load,
    }),
    [data, ready, error, load],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used inside <SiteProvider>');
  return ctx;
}
