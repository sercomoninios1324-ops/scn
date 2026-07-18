/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomeView from './views/HomeView';
import ProductsView from './views/ProductsView';
import ProductDetailView from './views/ProductDetailView';
import GuideView from './views/GuideView';
import ContactView from './views/ContactView';
import AdminView from './views/AdminView';
import { Product, Category, SiteSettings } from './types';

export default function App() {
  // Navigation Routing State
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [selectedProductSlug, setSelectedProductSlug] = useState<string>('');

  // App Data States
  const [products, setProducts] = useState<(Product & { images: { id?: string; storage_path: string; is_cover: boolean; position: number }[]; category?: { name: string } })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    whatsapp_number: '2915224734',
    instagram_url: 'https://instagram.com/somos_scn',
    email: 'contacto@seamoscomoninos.com',
    hero_title: 'SCN — Seamos como niños',
    hero_subtitle: 'Tu catálogo de tecnología favorito. Los mejores dispositivos y accesorios electrónicos, listos para tu hogar o regalo, con asesoría personalizada directa por WhatsApp.'
  });

  // Loading and Error states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Simulated Admin auth state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isAdminLoggedIn') === 'true';
    }
    return false;
  });

  // Fetch all basic information
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch site settings
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSiteSettings(settingsData);
      }

      // 2. Fetch categories
      const categoriesRes = await fetch('/api/categories');
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }

      // 3. Fetch products (Admin view or standard active view)
      const productsUrl = isAdminLoggedIn ? '/api/admin/products' : '/api/products';
      const productsRes = await fetch(productsUrl);
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError('No se pudo conectar con el servidor del catálogo. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAdminLoggedIn]);

  // Handle Login and Logout
  const handleLoginSuccess = (token: string, user: { email: string; name: string }) => {
    setIsAdminLoggedIn(true);
    localStorage.setItem('isAdminLoggedIn', 'true');
    localStorage.setItem('adminUser', JSON.stringify(user));
    setCurrentPage('admin');
  };

  const handleLogout = () => {
    setIsAdminLoggedIn(false);
    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('adminUser');
    setCurrentPage('home');
  };

  // Scroll to top on page navigation
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as any });
  }, [currentPage]);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-scn-bg-general text-scn-text-normal transition-colors">
      
      {/* Dynamic Navigation Header */}
      <Navbar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        isAdminLoggedIn={isAdminLoggedIn}
        onLogout={handleLogout}
      />

      {/* Main Content Router */}
      <main className="flex-grow">
        
        {/* Error Notification */}
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

        {/* Dynamic Views Rendering */}
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

        {currentPage === 'guide' && (
          <GuideView />
        )}

        {currentPage === 'contact' && (
          <ContactView 
            settings={siteSettings}
          />
        )}

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

      {/* Footer component */}
      <Footer 
        setCurrentPage={setCurrentPage}
        settings={siteSettings}
      />

    </div>
  );
}
