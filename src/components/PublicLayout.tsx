import { Outlet, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, useRef } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { useCatalog } from '../context/CatalogContext';
import { useRaffle } from '../context/RaffleContext';
import { trackVisit } from '../lib/analytics';
import { startTagManager, trackPageView } from '../lib/tracking';

// Solo se descarga si hay un sorteo activo
const RaffleFloating = lazy(() => import('./raffle/RaffleFloating'));

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#6622CF] border-t-transparent" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}

const LEGAL_PATHS = new Set(['/garantia', '/condiciones', '/privacidad']);

export default function PublicLayout() {
  const { settings, isAdminLoggedIn, isAdminChecking, handleLogout, error, refresh } = useCatalog();
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  const { raffle } = useRaffle();

  // Google Tag Manager: arranca cuando ya se sabe si es el admin (al admin no se lo mide)
  useEffect(() => {
    if (!isAdminChecking) startTagManager(isAdminLoggedIn);
  }, [isAdminChecking, isAdminLoggedIn]);

  // Página vista para GA4 (SPA): después de que la página nueva puso su título
  useEffect(() => {
    if (isAdminChecking) return undefined;
    const t = window.setTimeout(() => trackPageView(location.pathname), 400);
    return () => window.clearTimeout(t);
  }, [location.pathname, isAdminChecking]);

  // Visitas: una por día por navegador (el servidor además descarta duplicados y países ≠ AR)
  useEffect(() => {
    const t = window.setTimeout(() => trackVisit(location.pathname, isAdminLoggedIn), 1200);
    return () => window.clearTimeout(t);
  }, [location.pathname, isAdminLoggedIn]);

  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = location.pathname;
    // Entre políticas hermanas no forzamos scroll: evita que el footer “corra”.
    if (LEGAL_PATHS.has(prev) && LEGAL_PATHS.has(location.pathname)) return;
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-scn-bg-general text-scn-text-normal transition-colors">
      <Navbar isAdminLoggedIn={isAdminLoggedIn} onLogout={handleLogout} />

      <main className="flex-grow relative">
        {error && (
          <div className="mx-auto max-w-7xl px-4 pt-6 relative z-10">
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-500 font-semibold text-center flex items-center justify-center gap-3">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => refresh()}
                className="underline hover:text-rose-600 transition-colors font-bold cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>

      <Footer settings={settings} />

      {raffle ? (
        <Suspense fallback={null}>
          <RaffleFloating />
        </Suspense>
      ) : null}
    </div>
  );
}
