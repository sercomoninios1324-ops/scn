import { useCallback, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Layers, MessageCircle } from 'lucide-react';
import { m as motion } from 'motion/react';
import { useCatalog } from '../context/CatalogContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { useReducedMotion } from '../hooks/useReducedMotion';
import ProductCard from '../components/ProductCard';
import CatalogSearchBar from '../components/CatalogSearchBar';
import VioletAurora from '../components/effects/VioletAurora';
import { buildWhatsAppUrl } from '../lib/whatsapp';
import { parseCatalogSort, searchCatalog } from '../lib/catalogSearch';

const ITEMS_PER_PAGE = 8;

function flagOn(params: URLSearchParams, key: string): boolean {
  const v = params.get(key);
  return v === '1' || v === 'true';
}

function parsePage(value: string | null): number {
  const n = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export default function ProductsView() {
  const { products, categories, settings, isLoading } = useCatalog();
  const reducedMotion = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get('q') ?? '';
  const categoryId = searchParams.get('cat') ?? 'all';
  const sortBy = parseCatalogSort(searchParams.get('sort'));
  const onOffer = flagOn(searchParams, 'offer');
  const featuredOnly = flagOn(searchParams, 'featured');
  const inStock = flagOn(searchParams, 'stock');
  const pageFromUrl = parsePage(searchParams.get('page'));

  usePageMeta({
    title: 'Catálogo | SCN — Tecnología en Bahía Blanca',
    description:
      'Explorá el catálogo SCN: smartphones, audio, auriculares, cargadores y más. Filtrá por categoría y consultá por WhatsApp.',
    path: '/catalogo',
  });

  const filteredAndSortedProducts = useMemo(
    () =>
      searchCatalog(products, query, {
        categoryId,
        sort: sortBy,
        onOffer,
        featured: featuredOnly,
        inStock,
      }).map((r) => r.product),
    [products, query, categoryId, sortBy, onOffer, featuredOnly, inStock]
  );

  const totalPages = Math.ceil(filteredAndSortedProducts.length / ITEMS_PER_PAGE) || 1;
  const currentPageNum = Math.min(pageFromUrl, totalPages);
  const resultCount = filteredAndSortedProducts.length;

  const paginatedProducts = useMemo(() => {
    const start = (currentPageNum - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSortedProducts, currentPageNum]);

  const scrollToResults = useCallback(() => {
    const el = document.getElementById('catalogo-productos');
    if (!el) return;
    el.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }, [reducedMotion]);

  const goToPage = useCallback(
    (page: number) => {
      const nextPage = Math.min(Math.max(page, 1), totalPages);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (nextPage <= 1) next.delete('page');
          else next.set('page', String(nextPage));
          return next;
        },
        { replace: false }
      );
      // Esperar un frame para que la URL/DOM actualicen antes del scroll
      requestAnimationFrame(() => scrollToResults());
    },
    [setSearchParams, totalPages, scrollToResults]
  );

  // Si la URL pide una página fuera de rango, corregirla
  useEffect(() => {
    if (pageFromUrl === currentPageNum) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (currentPageNum <= 1) next.delete('page');
        else next.set('page', String(currentPageNum));
        return next;
      },
      { replace: true }
    );
  }, [pageFromUrl, currentPageNum, setSearchParams]);

  const hasActiveFilters =
    Boolean(query.trim()) ||
    categoryId !== 'all' ||
    onOffer ||
    featuredOnly ||
    inStock ||
    sortBy !== 'default';

  const clearFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const waHref = buildWhatsAppUrl(
    'Hola SCN! Estoy mirando el catálogo y quiero una consulta.',
    settings.whatsapp_number || '5492915224734'
  );

  const pageButtons = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = new Set<number>([1, totalPages, currentPageNum]);
    if (currentPageNum > 1) pages.add(currentPageNum - 1);
    if (currentPageNum < totalPages) pages.add(currentPageNum + 1);
    if (currentPageNum <= 3) {
      pages.add(2);
      pages.add(3);
      pages.add(4);
    }
    if (currentPageNum >= totalPages - 2) {
      pages.add(totalPages - 1);
      pages.add(totalPages - 2);
      pages.add(totalPages - 3);
    }
    return [...pages].sort((a, b) => a - b);
  }, [totalPages, currentPageNum]);

  return (
    <div className="page-enter">
      <section className="relative -mt-16 overflow-hidden pt-16">
        <div className="relative min-h-[220px] sm:min-h-[260px]">
          <VioletAurora />
          <div className="relative z-10 mx-auto flex max-w-7xl flex-col justify-end px-4 pb-10 pt-20 sm:px-6 sm:pb-12 sm:pt-24 lg:px-8">
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-2xl"
            >
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#6622CF]">
                SCN · Bahía Blanca
              </p>
              <h1 className="font-display text-4xl font-extrabold tracking-tight text-scn-text-title sm:text-5xl md:text-[3.25rem]">
                Catálogo
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-scn-text-normal sm:text-base">
                Buscá, filtrá y abrí la ficha. El WhatsApp ya sale armado para consultarnos.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="relative bg-scn-bg-general pb-16 pt-6 md:pb-24 md:pt-8">
        <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.45,
              delay: reducedMotion ? 0 : 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <CatalogSearchBar
              categories={categories}
              products={products}
              resultCount={resultCount}
              isLoading={isLoading}
            />
          </motion.div>

          <div
            id="catalogo-productos"
            className="scroll-mt-36 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-scn-text-title sm:text-3xl">
                {query.trim()
                  ? `Resultados para “${query.trim()}”`
                  : 'Productos'}
              </h2>
              <p className="mt-1 text-sm text-scn-text-normal">
                {isLoading
                  ? 'Cargando el catálogo…'
                  : resultCount === 0
                    ? 'Sin resultados con estos filtros.'
                    : `${resultCount} ${resultCount === 1 ? 'producto' : 'productos'}`}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="scn-product-card animate-pulse space-y-4 rounded-2xl p-3"
                >
                  <div className="aspect-square w-full rounded-xl bg-scn-bg-section" />
                  <div className="h-4 w-3/4 rounded bg-scn-bg-section" />
                  <div className="h-3 w-1/2 rounded bg-scn-bg-section" />
                </div>
              ))}
            </div>
          ) : resultCount === 0 ? (
            <div className="glass mx-auto max-w-xl space-y-5 rounded-3xl border border-dashed border-scn-border/70 p-10 text-center sm:p-14">
              <div className="scn-trust-icon mx-auto inline-flex h-14 w-14 items-center justify-center">
                <Layers size={28} strokeWidth={1.75} />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-display text-lg font-bold text-scn-text-title">
                  {hasActiveFilters
                    ? 'No hay productos con estos filtros'
                    : 'No hay productos por ahora'}
                </h3>
                <p className="text-sm text-scn-text-normal">
                  {hasActiveFilters
                    ? 'Probá limpiar los filtros para ver todo el catálogo.'
                    : 'Volvé más tarde o escribinos por WhatsApp.'}
                </p>
              </div>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex cursor-pointer rounded-xl bg-[#6622CF] px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-[#6622CF]/30 transition-transform hover:scale-[1.02]"
                >
                  Limpiar filtros
                </button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-10">
              <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
                {paginatedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} layout="grid" />
                ))}
              </div>

              {totalPages > 1 && (
                <>
                  <div className="flex items-center justify-center gap-3 sm:hidden">
                    <button
                      type="button"
                      onClick={() => goToPage(currentPageNum - 1)}
                      disabled={currentPageNum === 1}
                      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-scn-border/60 bg-white/55 backdrop-blur-sm disabled:opacity-40 dark:bg-white/8"
                      aria-label="Página anterior"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="text-xs font-semibold tabular-nums text-scn-text-normal">
                      {currentPageNum} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => goToPage(currentPageNum + 1)}
                      disabled={currentPageNum === totalPages}
                      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-scn-border/60 bg-white/55 backdrop-blur-sm disabled:opacity-40 dark:bg-white/8"
                      aria-label="Página siguiente"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <div className="hidden items-center justify-center gap-2 pt-2 sm:flex">
                    <button
                      type="button"
                      onClick={() => goToPage(currentPageNum - 1)}
                      disabled={currentPageNum === 1}
                      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-scn-border/60 bg-white/55 backdrop-blur-sm disabled:opacity-40 dark:bg-white/8"
                      aria-label="Página anterior"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    {pageButtons.map((pageNum, idx) => {
                      const prev = pageButtons[idx - 1];
                      const showEllipsis = prev != null && pageNum - prev > 1;
                      return (
                        <span key={pageNum} className="flex items-center gap-2">
                          {showEllipsis ? (
                            <span className="px-1 text-xs text-scn-text-secondary">…</span>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => goToPage(pageNum)}
                            className={`h-10 min-w-10 cursor-pointer rounded-xl px-3 text-xs font-semibold ${
                              currentPageNum === pageNum
                                ? 'bg-[#6622CF] text-white shadow-md shadow-[#6622CF]/25'
                                : 'border border-scn-border/60 bg-white/55 backdrop-blur-sm dark:bg-white/8'
                            }`}
                          >
                            {pageNum}
                          </button>
                        </span>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => goToPage(currentPageNum + 1)}
                      disabled={currentPageNum === totalPages}
                      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-scn-border/60 bg-white/55 backdrop-blur-sm disabled:opacity-40 dark:bg-white/8"
                      aria-label="Página siguiente"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="scn-trust relative overflow-hidden py-14 md:py-20">
        <div className="scn-trust-glow" aria-hidden />
        <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-xl"
          >
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#6622CF]">
              ¿Dudas?
            </p>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-scn-text-title sm:text-3xl">
              Te asesoramos por WhatsApp
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-scn-text-normal">
              Elegí en el catálogo y escribinos: te ayudamos a cerrar la compra con trato humano.
            </p>
            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6622CF] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#6622CF]/30 transition-transform hover:scale-[1.02]"
              >
                <MessageCircle size={18} strokeWidth={2} />
                Consultar por WhatsApp
              </a>
              <Link
                to="/como-comprar"
                className="inline-flex items-center justify-center rounded-xl border border-scn-border/70 bg-white/55 px-6 py-3 text-sm font-semibold text-scn-text-title backdrop-blur-sm transition-transform hover:scale-[1.02] dark:bg-white/8"
              >
                Cómo comprar
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
