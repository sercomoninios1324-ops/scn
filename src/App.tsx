import { lazy, Suspense } from 'react';
import { LazyMotion, domAnimation } from 'motion/react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { CatalogProvider, useCatalog } from './context/CatalogContext';
import { CartProvider } from './context/CartContext';
import { RaffleProvider } from './context/RaffleContext';
import { usePageMeta } from './hooks/usePageMeta';
import PublicLayout from './components/PublicLayout';
import HomeView from './views/HomeView';

// Code-splitting por ruta: el home carga solo lo suyo; el resto se baja al navegar.
const ProductsView = lazy(() => import('./views/ProductsView'));
const ProductDetailView = lazy(() => import('./views/ProductDetailView'));
const CartView = lazy(() => import('./views/CartView'));
const GuideView = lazy(() => import('./views/GuideView'));
const ContactView = lazy(() => import('./views/ContactView'));
const AboutView = lazy(() => import('./views/AboutView'));
const LegalLayout = lazy(() => import('./components/LegalLayout'));
const WarrantyView = lazy(() => import('./views/WarrantyView'));
const PrivacyView = lazy(() => import('./views/PrivacyView'));
const TermsView = lazy(() => import('./views/TermsView'));
const NotFoundView = lazy(() => import('./views/NotFoundView'));

const AdminView = lazy(() => import('./views/AdminView'));

function AdminRoute() {
  const {
    products,
    categories,
    settings,
    isAdminLoggedIn,
    isAdminChecking,
    handleLoginSuccess,
    handleLogout,
    refresh,
  } = useCatalog();
  const navigate = useNavigate();

  usePageMeta({
    title: 'Panel | SCN',
    description: 'Acceso del personal de SCN.',
    path: '/personal',
    noIndex: true,
  });

  return (
    <div className="min-h-screen bg-scn-bg-general text-scn-text-normal">
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-scn-primary" />
          </div>
        }
      >
        <AdminView
          products={products}
          categories={categories}
          siteSettings={settings}
          isAdminLoggedIn={isAdminLoggedIn}
          isAdminChecking={isAdminChecking}
          onLogout={handleLogout}
          onLoginSuccess={() => {
            handleLoginSuccess();
            navigate('/personal', { replace: true });
          }}
          onRefreshData={refresh}
        />
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <LazyMotion features={domAnimation} strict>
    <CatalogProvider>
      <CartProvider>
        <RaffleProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<HomeView />} />
              <Route path="catalogo" element={<ProductsView />} />
              <Route path="producto/:slug" element={<ProductDetailView />} />
              <Route path="carrito" element={<CartView />} />
              <Route path="pedido/:code" element={<CartView />} />
              <Route path="como-comprar" element={<GuideView />} />
              <Route path="nosotros" element={<AboutView />} />
              <Route path="contacto" element={<ContactView />} />
              <Route element={<LegalLayout />}>
                <Route path="garantia" element={<WarrantyView />} />
                <Route path="condiciones" element={<TermsView />} />
                <Route path="privacidad" element={<PrivacyView />} />
              </Route>
              <Route path="*" element={<NotFoundView />} />
            </Route>
            <Route path="personal" element={<AdminRoute />} />
          </Routes>
        </BrowserRouter>
        </RaffleProvider>
      </CartProvider>
    </CatalogProvider>
    </LazyMotion>
  );
}
