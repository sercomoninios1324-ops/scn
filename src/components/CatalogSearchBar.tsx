import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, m as motion } from 'motion/react';
import { trackSearch } from '../lib/tracking';
import { ArrowUpDown, ChevronDown, Search, Tag, X } from 'lucide-react';
import type { Category } from '../types';
import type { CatalogProduct } from '../context/CatalogContext';
import {
  parseCatalogSort,
  searchCatalog,
  suggestCategories,
  type CatalogSort,
} from '../lib/catalogSearch';
import { formatCategoryLabel } from '../lib/formatCategory';
import { useReducedMotion } from '../hooks/useReducedMotion';

const SORT_OPTIONS: { value: CatalogSort; label: string; short: string }[] = [
  { value: 'default', label: 'Relevancia', short: 'Relevancia' },
  { value: 'price-asc', label: 'Precio: menor a mayor', short: 'Precio ↑' },
  { value: 'price-desc', label: 'Precio: mayor a menor', short: 'Precio ↓' },
  { value: 'name-asc', label: 'Nombre A–Z', short: 'A–Z' },
];

interface CatalogSearchBarProps {
  categories: Category[];
  products: CatalogProduct[];
  resultCount: number;
  isLoading?: boolean;
}

type ParamPatch = {
  q?: string;
  cat?: string;
  sort?: CatalogSort;
  offer?: boolean;
  featured?: boolean;
  stock?: boolean;
};

function buildParams(current: URLSearchParams, patch: ParamPatch): URLSearchParams {
  const next = new URLSearchParams(current);
  if (patch.q !== undefined) {
    const q = patch.q.trim();
    if (q) next.set('q', q);
    else next.delete('q');
  }
  if (patch.cat !== undefined) {
    if (patch.cat && patch.cat !== 'all') next.set('cat', patch.cat);
    else next.delete('cat');
  }
  if (patch.sort !== undefined) {
    if (patch.sort && patch.sort !== 'default') next.set('sort', patch.sort);
    else next.delete('sort');
  }
  if (patch.offer !== undefined) {
    if (patch.offer) next.set('offer', '1');
    else next.delete('offer');
  }
  if (patch.featured !== undefined) {
    if (patch.featured) next.set('featured', '1');
    else next.delete('featured');
  }
  if (patch.stock !== undefined) {
    if (patch.stock) next.set('stock', '1');
    else next.delete('stock');
  }
  // Cualquier cambio de filtro vuelve a la página 1
  next.delete('page');
  return next;
}

function flagOn(params: URLSearchParams, key: string): boolean {
  const v = params.get(key);
  return v === '1' || v === 'true';
}

export default function CatalogSearchBar({
  categories,
  products,
  resultCount,
  isLoading = false,
}: CatalogSearchBarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const reducedMotion = useReducedMotion();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);
  const focusedRef = useRef(false);

  const urlQ = searchParams.get('q') ?? '';
  const urlCat = searchParams.get('cat') ?? 'all';
  const urlSort = parseCatalogSort(searchParams.get('sort'));
  const urlOffer = flagOn(searchParams, 'offer');
  const urlFeatured = flagOn(searchParams, 'featured');
  const urlStock = flagOn(searchParams, 'stock');

  const [draftQ, setDraftQ] = useState(urlQ);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);

  useEffect(() => {
    if (focusedRef.current) return;
    setDraftQ(urlQ);
  }, [urlQ]);

  const commitQ = useCallback(
    (value: string) => {
      setSearchParams((prev) => buildParams(prev, { q: value }), { replace: true });
      trackSearch(value);
    },
    [setSearchParams]
  );

  const scheduleCommitQ = useCallback(
    (value: string) => {
      if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        commitQ(value);
        debounceRef.current = null;
      }, 200);
    },
    [commitQ]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const setCategory = (catId: string) => {
    setSearchParams((prev) => buildParams(prev, { cat: catId }), { replace: true });
    setTypeOpen(false);
  };

  const setSort = (sort: CatalogSort) => {
    setSearchParams((prev) => buildParams(prev, { sort }), { replace: true });
    setSortOpen(false);
  };

  const toggleFlag = (key: 'offer' | 'featured' | 'stock', current: boolean) => {
    setSearchParams(
      (prev) => buildParams(prev, { [key]: !current }),
      { replace: true }
    );
  };

  const clearQuery = () => {
    if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    setDraftQ('');
    commitQ('');
    setSuggestionsOpen(false);
    inputRef.current?.focus();
  };

  const suggestionQuery = draftQ.trim();
  const showSuggestions = suggestionsOpen && suggestionQuery.length >= 2;

  const productSuggestions = useMemo(() => {
    if (!showSuggestions) return [];
    return searchCatalog(products, suggestionQuery, { sort: 'default' })
      .slice(0, 6)
      .map((r) => r.product);
  }, [products, suggestionQuery, showSuggestions]);

  const categorySuggestions = useMemo(() => {
    if (!showSuggestions) return [];
    return suggestCategories(categories, suggestionQuery, 4);
  }, [categories, suggestionQuery, showSuggestions]);

  const hasSuggestions =
    productSuggestions.length > 0 || categorySuggestions.length > 0;

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((a, b) =>
        formatCategoryLabel(a.name).localeCompare(formatCategoryLabel(b.name), 'es')
      ),
    [categories]
  );

  const activeCategoryLabel =
    urlCat === 'all'
      ? 'Tipo'
      : formatCategoryLabel(
          categories.find((c) => c.id === urlCat)?.name ?? 'Tipo'
        );

  useEffect(() => {
    if (!suggestionsOpen && !sortOpen && !typeOpen) return undefined;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setSuggestionsOpen(false);
        setSortOpen(false);
        setTypeOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [suggestionsOpen, sortOpen, typeOpen]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    commitQ(draftQ);
    setSuggestionsOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (draftQ) {
        e.preventDefault();
        clearQuery();
      } else {
        setSuggestionsOpen(false);
        inputRef.current?.blur();
      }
    }
  };

  const activeSortLabel =
    SORT_OPTIONS.find((o) => o.value === urlSort)?.short ?? 'Relevancia';

  const menuBtnClass =
    'inline-flex h-[42px] min-w-0 cursor-pointer items-center gap-1.5 rounded-xl border border-scn-border/60 bg-white/55 px-3 text-xs font-semibold text-scn-text-title backdrop-blur-sm dark:bg-white/8';

  const chipClass = (active: boolean) =>
    `shrink-0 cursor-pointer inline-flex min-h-9 items-center rounded-lg px-3 py-1 text-xs font-semibold sm:min-h-0 sm:px-2.5 sm:text-[11px] transition-all ${
      active
        ? 'bg-[#6622CF] text-white shadow-sm shadow-[#6622CF]/25'
        : 'border border-scn-border/60 bg-white/40 text-scn-text-normal dark:bg-white/6'
    }`;

  return (
    <div
      ref={rootRef}
      className="glass sticky top-16 z-30 space-y-2.5 rounded-2xl p-3 sm:p-4"
    >
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <div className="relative min-w-0 flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-scn-text-secondary"
          />
          <input
            id="catalog-search"
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={showSuggestions && hasSuggestions}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-label="Buscá por nombre, categoría o SKU"
            placeholder="Buscar producto, categoría o SKU"
            value={draftQ}
            onChange={(e) => {
              const value = e.target.value;
              setDraftQ(value);
              scheduleCommitQ(value);
              setSuggestionsOpen(true);
            }}
            onFocus={() => {
              focusedRef.current = true;
              setSuggestionsOpen(true);
            }}
            onBlur={() => {
              focusedRef.current = false;
            }}
            onKeyDown={onKeyDown}
            autoComplete="off"
            enterKeyHint="search"
            className="scn-catalog-search-input w-full rounded-xl border border-scn-border/60 bg-white/55 py-2.5 pl-10 pr-11 sm:pr-20 text-sm text-scn-text-title placeholder-scn-text-secondary backdrop-blur-sm outline-none transition-colors focus:border-[#6622CF]/45 dark:bg-white/8"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {!isLoading && (
              <span className="hidden rounded-lg px-1.5 text-[11px] font-semibold tabular-nums text-scn-text-secondary sm:inline">
                {resultCount}
              </span>
            )}
            {draftQ ? (
              <button
                type="button"
                onClick={clearQuery}
                aria-label="Limpiar búsqueda"
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-scn-text-secondary transition-colors hover:bg-scn-bg-section hover:text-scn-text-title"
              >
                <X size={15} />
              </button>
            ) : null}
          </div>

          <AnimatePresence>
            {showSuggestions && hasSuggestions ? (
              <motion.div
                id={listboxId}
                role="listbox"
                initial={reducedMotion ? false : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="scn-catalog-suggestions absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-2xl border border-scn-border/60 bg-scn-bg-general/95 shadow-xl backdrop-blur-xl"
              >
                <div className="max-h-[min(50vh,320px)] overflow-y-auto overscroll-contain p-1.5">
                  {categorySuggestions.length > 0 ? (
                    <div className="mb-1 px-2 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-scn-text-secondary">
                      Tipos
                    </div>
                  ) : null}
                  {categorySuggestions.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      role="option"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setCategory(cat.id);
                        setSuggestionsOpen(false);
                      }}
                      className="flex w-full cursor-pointer items-center rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-scn-text-title transition-colors hover:bg-[#6622CF]/12"
                    >
                      {formatCategoryLabel(cat.name)}
                    </button>
                  ))}
                  {productSuggestions.length > 0 ? (
                    <div className="mb-1 px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-scn-text-secondary">
                      Productos
                    </div>
                  ) : null}
                  {productSuggestions.map((p) => (
                    <Link
                      key={p.id}
                      role="option"
                      to={`/producto/${p.slug}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setSuggestionsOpen(false)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#6622CF]/12"
                    >
                      <span className="min-w-0 truncate text-sm font-semibold text-scn-text-title">
                        {p.name}
                      </span>
                      {p.category?.name ? (
                        <span className="shrink-0 text-[11px] font-medium text-scn-text-secondary">
                          {formatCategoryLabel(p.category.name)}
                        </span>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <button
              type="button"
              onClick={() => {
                setTypeOpen((o) => !o);
                setSortOpen(false);
              }}
              aria-expanded={typeOpen}
              aria-haspopup="listbox"
              aria-label="Tipo de producto"
              className={`${menuBtnClass} w-full sm:w-auto ${
                urlCat !== 'all' ? 'border-[#6622CF]/45 text-[#6622CF]' : ''
              }`}
            >
              <Tag size={14} className="shrink-0 text-scn-text-secondary" />
              <span className="max-w-[9rem] truncate">{activeCategoryLabel}</span>
              <ChevronDown size={14} className="shrink-0 text-scn-text-secondary" />
            </button>
            <AnimatePresence>
              {typeOpen ? (
                <motion.ul
                  role="listbox"
                  initial={reducedMotion ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute left-0 top-[calc(100%+6px)] z-40 max-h-[min(50vh,280px)] min-w-[12rem] overflow-y-auto overscroll-contain rounded-xl border border-scn-border/60 bg-scn-bg-general/95 py-1 shadow-xl backdrop-blur-xl sm:left-auto sm:right-0"
                >
                  <li>
                    <button
                      type="button"
                      role="option"
                      aria-selected={urlCat === 'all'}
                      onClick={() => setCategory('all')}
                      className={`flex w-full cursor-pointer px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                        urlCat === 'all'
                          ? 'bg-[#6622CF]/15 text-[#6622CF]'
                          : 'text-scn-text-title hover:bg-white/40 dark:hover:bg-white/8'
                      }`}
                    >
                      Todos los tipos
                    </button>
                  </li>
                  {sortedCategories.map((cat) => (
                    <li key={cat.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={urlCat === cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`flex w-full cursor-pointer px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                          urlCat === cat.id
                            ? 'bg-[#6622CF]/15 text-[#6622CF]'
                            : 'text-scn-text-title hover:bg-white/40 dark:hover:bg-white/8'
                        }`}
                      >
                        {formatCategoryLabel(cat.name)}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setSortOpen((o) => !o);
                setTypeOpen(false);
              }}
              aria-expanded={sortOpen}
              aria-haspopup="listbox"
              aria-label="Ordenar"
              className={menuBtnClass}
            >
              <ArrowUpDown size={14} className="text-scn-text-secondary" />
              <span className="max-w-[5.5rem] truncate sm:max-w-none">{activeSortLabel}</span>
            </button>
            <AnimatePresence>
              {sortOpen ? (
                <motion.ul
                  role="listbox"
                  initial={reducedMotion ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 top-[calc(100%+6px)] z-40 min-w-[11rem] overflow-hidden rounded-xl border border-scn-border/60 bg-scn-bg-general/95 py-1 shadow-xl backdrop-blur-xl"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <li key={opt.value}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={urlSort === opt.value}
                        onClick={() => setSort(opt.value)}
                        className={`flex w-full cursor-pointer px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                          urlSort === opt.value
                            ? 'bg-[#6622CF]/15 text-[#6622CF]'
                            : 'text-scn-text-title hover:bg-white/40 dark:hover:bg-white/8'
                        }`}
                      >
                        {opt.label}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => toggleFlag('offer', urlOffer)}
          aria-pressed={urlOffer}
          className={chipClass(urlOffer)}
        >
          Oferta
        </button>
        <button
          type="button"
          onClick={() => toggleFlag('featured', urlFeatured)}
          aria-pressed={urlFeatured}
          className={chipClass(urlFeatured)}
        >
          Destacados
        </button>
        <button
          type="button"
          onClick={() => toggleFlag('stock', urlStock)}
          aria-pressed={urlStock}
          className={chipClass(urlStock)}
        >
          Con stock
        </button>
        {!isLoading ? (
          <span className="ml-auto text-[11px] font-medium tabular-nums text-scn-text-secondary sm:hidden">
            {resultCount} {resultCount === 1 ? 'resultado' : 'resultados'}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function focusCatalogSearch() {
  const el = document.getElementById('catalog-search') as HTMLInputElement | null;
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  window.setTimeout(() => {
    el.focus();
    el.select?.();
  }, 280);
}
