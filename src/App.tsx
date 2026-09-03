

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomeView from './views/HomeView';
import ProductsView from './views/ProductsView';
import ProductDetailView from './views/ProductDetailView';
import GuideView from './views/GuideView';
import ContactView from './views/ContactView';
import AdminView from './views/AdminView';
import { Product, Category, SiteSettings } from './types';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { apiFetch, clearDevAdminToken, getDevAdminToken, safeJson } from './lib/api';

const DEFAULT_SETTINGS: SiteSettings = {
  whatsapp_number: '2915224734',
  instagram_url: 'https://instagram.com/seamoscomoninos',
  email: 'contacto@seamoscomoninos.com',
  hero_title: 'SCN — Seamos como niños',
  hero_subtitle:
    'Catálogo de tecnología en Bahía Blanca. Celulares, notebooks y accesorios con asesoría personalizada por WhatsApp.',
};

function isPersonalPath(pathname: string = window.location.pathname) {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return normalized === '/personal';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<string>(() =>
    typeof window !== 'undefined' && isPersonalPath() ? 'admin' : 'home'
  );
  const [selectedProductSlug, setSelectedProductSlug] = useState<string>('');

  const [products, setProducts] = useState<
    (Product & {
      images: { id?: string; storage_path: string; is_cover: boolean; position: number }[];
      category?: { name: string };
    })[]
  >([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);

  const verifyAdminSession = useCallback(async (accessToken?: string | null) => {
    if (!isSupabaseConfigured || !supabase) {
      setIsAdminLoggedIn(!!getDevAdminToken());
      return;
    }

    const token = accessToken ?? (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setIsAdminLoggedIn(false);
      return;
    }

    const meRes = await fetch('/api/admin/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    setIsAdminLoggedIn(meRes.ok);
  }, []);

  const checkAdminSession = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.auth.getSession();
      await verifyAdminSession(data.session?.access_token);
      return;
    }

    setIsAdminLoggedIn(!!getDevAdminToken());
  }, [verifyAdminSession]);

  useEffect(() => {
    checkAdminSession();

    if (isSupabaseConfigured && supabase) {
      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          setIsAdminLoggedIn(false);
          return;
        }
        if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
          verifyAdminSession(session?.access_token);
        }
      });
      return () => listener.subscription.unsubscribe();
    }
  }, [checkAdminSession, verifyAdminSession]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const settingsData = (await safeJson(settingsRes)) as SiteSettings;
        setSiteSettings(settingsData);
      } else {
        throw new Error('No se pudieron cargar los ajustes del sitio');
      }

      const categoriesRes = await fetch('/api/categories');
      if (categoriesRes.ok) {
        const categoriesData = (await safeJson(categoriesRes)) as Category[];
        setCategories(categoriesData);
      } else {
        throw new Error('No se pudieron cargar las categorías');
      }

      const productsUrl = isAdminLoggedIn ? '/api/admin/products' : '/api/products';
      const productsRes = isAdminLoggedIn
        ? await apiFetch(productsUrl)
        : await fetch(productsUrl);

      if (productsRes.ok) {
        const productsData = (await safeJson(productsRes)) as Product[];
        setProducts(productsData);
      } else if (isAdminLoggedIn) {
        throw new Error('No se pudieron cargar los productos del panel admin');
      } else {
        throw new Error('No se pudieron cargar los productos');
      }
    } catch (err: unknown) {
      console.error('Error fetching data:', err);
      const message =
        err instanceof Error ? err.message : 'No se pudo conectar con el servidor del catálogo.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAdminLoggedIn]);

  const handleLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    setCurrentPage('admin');
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    clearDevAdminToken();
    setIsAdminLoggedIn(false);
    setCurrentPage('home');
  };

  useEffect(() => {
    if (currentPage === 'admin') {
      if (!isPersonalPath()) {
        window.history.pushState({ page: 'admin' }, '', '/personal');
      }
    } else if (isPersonalPath()) {
      window.history.pushState({ page: currentPage }, '', '/');
    }
  }, [currentPage]);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPage(isPersonalPath() ? 'admin' : 'home');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [currentPage]);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-scn-bg-general text-scn-text-normal transition-colors">
      <Navbar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isAdminLoggedIn={isAdminLoggedIn}
        onLogout={handleLogout}
      />

      <main className="flex-grow">
        {error && (
          <div className="mx-auto max-w-7xl px-4 pt-6">
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-500 font-semibold text-center flex items-center justify-center space-x-3">
              <span>{error}</span>
              <button
                onClick={fetchData}
                className="underline hover:text-rose-600 transition-colors font-bold cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {currentPage === 'home' && (
          <HomeView
            products={products}
            settings={siteSettings}
            setCurrentPage={setCurrentPage}
            setSelectedProductSlug={setSelectedProductSlug}
          />
        )}

        {currentPage === 'products' && (
          <ProductsView
            products={products}
            categories={categories}
            isLoading={isLoading}
            onRefresh={fetchData}
            setCurrentPage={setCurrentPage}
            setSelectedProductSlug={setSelectedProductSlug}
          />
        )}

        {currentPage === 'product_detail' && (
          <ProductDetailView
            productSlug={selectedProductSlug}
            products={products}
            settings={siteSettings}
            setCurrentPage={setCurrentPage}
            setSelectedProductSlug={setSelectedProductSlug}
          />
        )}

        {currentPage === 'guide' && <GuideView />}

        {currentPage === 'contact' && <ContactView settings={siteSettings} />}

        {currentPage === 'admin' && (
          <AdminView
            products={products}
            categories={categories}
            siteSettings={siteSettings}
            isAdminLoggedIn={isAdminLoggedIn}
            onLoginSuccess={handleLoginSuccess}
            onRefreshData={fetchData}
          />
        )}
      </main>

      <Footer setCurrentPage={setCurrentPage} settings={siteSettings} />
    </div>
  );
}
