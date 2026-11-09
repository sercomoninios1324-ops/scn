import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Product, Category, SiteSettings } from '../types';
import { getSupabase, hasStoredSupabaseSession, isSupabaseConfigured } from '../lib/supabase';
import { apiFetch, clearDevAdminToken, getDevAdminToken, safeJson } from '../lib/api';
import { INSTAGRAM_URL, OFFICIAL_WHATSAPP_NUMBER } from '../lib/whatsapp';

export type CatalogProduct = Product & {
  images: { id?: string; storage_path: string; is_cover: boolean; position: number }[];
  category?: { name: string };
};

export const DEFAULT_SETTINGS: SiteSettings = {
  whatsapp_number: OFFICIAL_WHATSAPP_NUMBER,
  instagram_url: INSTAGRAM_URL,
  email: 'sercomoninios1324@gmail.com',
  hero_title: 'SCN — Seamos como niños',
  hero_subtitle:
    'Tu catálogo de tecnología favorito. Los mejores dispositivos y accesorios electrónicos, listos para tu hogar o regalo, con asesoría personalizada directa por WhatsApp.',
};

interface CatalogContextValue {
  products: CatalogProduct[];
  categories: Category[];
  settings: SiteSettings;
  isLoading: boolean;
  error: string | null;
  isAdminLoggedIn: boolean;
  /** true mientras se verifica si hay una sesión de admin guardada */
  isAdminChecking: boolean;
  refresh: () => Promise<void>;
  handleLoginSuccess: () => void;
  handleLogout: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

function normalizeSettings(settingsData: SiteSettings): SiteSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...settingsData,
    whatsapp_number: settingsData.whatsapp_number || OFFICIAL_WHATSAPP_NUMBER,
    instagram_url:
      settingsData.instagram_url?.includes('seamoscomoninos')
        ? INSTAGRAM_URL
        : settingsData.instagram_url || INSTAGRAM_URL,
  };
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isAdminChecking, setIsAdminChecking] = useState(true);
  const adminRef = useRef(false);

  useEffect(() => {
    adminRef.current = isAdminLoggedIn;
  }, [isAdminLoggedIn]);

  const verifyAdminSession = useCallback(async (accessToken?: string | null) => {
    try {
      await verifyAdminSessionInner(accessToken);
    } finally {
      setIsAdminChecking(false);
    }
  }, []);

  const verifyAdminSessionInner = async (accessToken?: string | null) => {
    if (!isSupabaseConfigured) {
      setIsAdminLoggedIn(!!getDevAdminToken());
      return;
    }
    const supabase = await getSupabase();
    if (!supabase) {
      setIsAdminLoggedIn(false);
      return;
    }

    const token =
      accessToken ?? (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setIsAdminLoggedIn(false);
      return;
    }

    try {
      const meRes = await fetch('/api/admin/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsAdminLoggedIn(meRes.ok);
    } catch {
      setIsAdminLoggedIn(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      void verifyAdminSession();
      return;
    }
    // Visitantes comunes: no hay sesión guardada → no se descarga supabase-js.
    const onAdminRoute =
      typeof window !== 'undefined' && window.location.pathname.startsWith('/personal');
    if (!hasStoredSupabaseSession() && !onAdminRoute) {
      setIsAdminChecking(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    void getSupabase().then((supabase) => {
      if (!supabase || cancelled) {
        setIsAdminChecking(false);
        return;
      }
      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          setIsAdminLoggedIn(false);
          return;
        }
        if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
          void verifyAdminSession(session?.access_token);
        }
      });
      unsubscribe = () => listener.subscription.unsubscribe();
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [verifyAdminSession]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const admin = adminRef.current;
      // El admin siempre pide datos frescos (saltea la caché de 60 s del CDN).
      const fresh = admin ? `?fresh=${Date.now()}` : '';
      const get = (url: string) => (admin ? apiFetch(url + fresh) : fetch(url));
      const [settingsRes, categoriesRes, productsRes] = await Promise.all([
        get('/api/settings'),
        get('/api/categories'),
        get(admin ? '/api/admin/products' : '/api/products'),
      ]);
      if (!settingsRes.ok) throw new Error('No se pudieron cargar los ajustes del sitio');
      if (!categoriesRes.ok) throw new Error('No se pudieron cargar las categorías');
      setSettings(normalizeSettings((await safeJson(settingsRes)) as SiteSettings));
      setCategories((await safeJson(categoriesRes)) as Category[]);

      if (!productsRes.ok) {
        throw new Error(
          admin
            ? 'No se pudieron cargar los productos del panel admin'
            : 'No se pudieron cargar los productos'
        );
      }
      setProducts((await safeJson(productsRes)) as CatalogProduct[]);
    } catch (err: unknown) {
      console.error('Error fetching data:', err);
      setError(
        err instanceof Error ? err.message : 'No se pudo conectar con el servidor del catálogo.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, isAdminLoggedIn]);

  const handleLoginSuccess = useCallback(() => {
    setIsAdminLoggedIn(true);
  }, []);

  const handleLogout = useCallback(async () => {
    if (isSupabaseConfigured) {
      const supabase = await getSupabase();
      await supabase?.auth.signOut();
    }
    clearDevAdminToken();
    setIsAdminLoggedIn(false);
  }, []);

  const value = useMemo(
    () => ({
      products,
      categories,
      settings,
      isLoading,
      error,
      isAdminLoggedIn,
      isAdminChecking,
      refresh,
      handleLoginSuccess,
      handleLogout,
    }),
    [
      products,
      categories,
      settings,
      isLoading,
      error,
      isAdminLoggedIn,
      isAdminChecking,
      refresh,
      handleLoginSuccess,
      handleLogout,
    ]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog debe usarse dentro de CatalogProvider');
  return ctx;
}
