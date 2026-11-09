import { useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Home, MessageCircle, Search } from 'lucide-react';
import VioletAurora from '../components/effects/VioletAurora';
import ProductCard from '../components/ProductCard';
import { useCatalog } from '../context/CatalogContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { buildWhatsAppUrl } from '../lib/whatsapp';

/** Sugerencias estables durante la visita (sin re-sortear en cada render). */
function pickSuggestions<T extends { id: string; is_featured: boolean }>(list: T[], n: number): T[] {
  const pool = list.filter((p) => p.is_featured);
  const source = pool.length >= n ? pool : list;
  const copy = [...source];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export default function NotFoundView() {
  const { products, settings } = useCatalog();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  usePageMeta({
    title: 'Página no encontrada | SCN',
    description: 'La página que buscás no existe. Seguí explorando el catálogo de SCN.',
    path: location.pathname,
    noIndex: true,
  });

  const suggestions = useMemo(
    () => pickSuggestions(products.filter((p) => p.is_active), 4),
    [products.length]
  );

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/catalogo?q=${encodeURIComponent(q)}` : '/catalogo');
  };

  const waHref = buildWhatsAppUrl(
    `Hola SCN! Estaba buscando algo en la web y no lo encontré (${location.pathname}). ¿Me ayudan?`,
    settings.whatsapp_number
  );

  return (
    <div className="page-enter">
      <section className="relative -mt-16 overflow-hidden pt-16">
        <VioletAurora />
        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-4 pb-14 pt-12 text-center sm:pb-20 sm:pt-20">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-[#6622CF] dark:text-[#c9b2e8]">
            Error 404 · Se cortó el cable
          </p>

          <h1 className="scn-404 font-display text-[7.5rem] font-extrabold leading-none tracking-tight sm:text-[11rem]" aria-label="404">
            <span aria-hidden className="scn-404-digit">4</span>
            <span aria-hidden className="scn-404-digit scn-404-zero">0</span>
            <span aria-hidden className="scn-404-digit">4</span>
          </h1>

          <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-scn-text-title sm:text-3xl">
            Esta página se fue a jugar a otro lado
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-scn-text-normal sm:text-base">
            El link está roto o el producto ya no está publicado. Buscá lo que querías o mirá lo que
            tenemos hoy.
          </p>

          <form onSubmit={onSearch} role="search" className="mt-8 flex w-full max-w-md gap-2">
            <label htmlFor="nf-search" className="sr-only">
              Buscar en el catálogo
            </label>
            <div className="relative flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-scn-text-secondary"
              />
              <input
                id="nf-search"
                type="search"
                enterKeyHint="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="¿Qué buscás?"
                className="h-12 w-full rounded-xl border border-scn-border/60 bg-white/70 pl-10 pr-3 text-sm text-scn-text-title placeholder-scn-text-secondary backdrop-blur-sm dark:bg-white/8"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#6622CF] px-5 text-sm font-semibold text-white shadow-lg shadow-[#6622CF]/30 transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              Buscar
            </button>
          </form>

          <div className="mt-4 flex w-full max-w-md flex-col gap-2 sm:flex-row">
            <Link
              to="/"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-scn-border/70 bg-white/55 px-4 text-sm font-semibold text-scn-text-title backdrop-blur-sm transition-colors hover:bg-white/80 dark:border-white/20 dark:bg-white/8 dark:text-white/95 dark:hover:bg-white/14"
            >
              <Home size={16} /> Volver al inicio
            </Link>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-scn-border/70 bg-white/55 px-4 text-sm font-semibold text-scn-text-title backdrop-blur-sm transition-colors hover:bg-white/80 dark:border-white/20 dark:bg-white/8 dark:text-white/95 dark:hover:bg-white/14"
            >
              <MessageCircle size={16} /> Preguntar por WhatsApp
            </a>
          </div>
        </div>
      </section>

      {suggestions.length > 0 ? (
        <section className="relative bg-scn-bg-general py-12 md:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[#6622CF]">
                  Mientras tanto
                </p>
                <h2 className="font-display text-2xl font-extrabold tracking-tight text-scn-text-title sm:text-3xl">
                  Esto sí existe
                </h2>
              </div>
              <Link
                to="/catalogo"
                className="group inline-flex shrink-0 items-center gap-1 py-2 text-sm font-semibold text-[#6622CF] hover:text-[#7d3ae6] dark:text-[#b794f6] dark:hover:text-white"
              >
                Ver catálogo
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4 lg:gap-6">
              {suggestions.map((p) => (
                <ProductCard key={p.id} product={p} layout="grid" />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
