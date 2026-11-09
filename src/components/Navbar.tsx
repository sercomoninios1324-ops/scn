import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, Menu, X, Settings, Search, ShoppingCart } from 'lucide-react';
import { AnimatePresence, m as motion } from 'motion/react';
import { ScnLogo } from './ScnLogo';
import { focusCatalogSearch } from './CatalogSearchBar';
import { useCart } from '../context/CartContext';

interface NavbarProps {
  isAdminLoggedIn: boolean;
  onLogout: () => void;
}

const navLinks = [
  { name: 'Inicio', to: '/' },
  { name: 'Catálogo', to: '/catalogo' },
  { name: 'Cómo comprar', to: '/como-comprar' },
  { name: 'Nosotros', to: '/nosotros' },
  { name: 'Contacto', to: '/contacto' },
];

const easeSoft = [0.22, 1, 0.36, 1] as const;

export default function Navbar({ isAdminLoggedIn, onLogout }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { itemCount } = useCart();
  const menuId = useId();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const onCatalog = location.pathname === '/catalogo';

  useEffect(() => {
    setIsOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const q = new URLSearchParams(location.search).get('q');
    if (location.pathname === '/catalogo') {
      setSearchQuery(q ?? '');
      return;
    }
    setSearchQuery('');
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isOpen) return undefined;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!searchOpen || onCatalog) return undefined;
    const t = window.setTimeout(() => searchInputRef.current?.focus(), 180);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [searchOpen, onCatalog]);

  const closeMenu = () => setIsOpen(false);

  const toggleMenu = () => {
    setSearchOpen(false);
    setIsOpen((open) => !open);
  };

  const focusPageSearch = () => {
    setIsOpen(false);
    setSearchOpen(false);
    focusCatalogSearch();
  };

  const toggleMobileSearch = () => {
    if (onCatalog) {
      focusPageSearch();
      return;
    }
    setIsOpen(false);
    setSearchOpen((open) => !open);
  };

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    setSearchOpen(false);
    navigate(q ? `/catalogo?q=${encodeURIComponent(q)}` : '/catalogo');
  };

  const iconBtnClass =
    'flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-scn-border/70 bg-scn-bg-card/50 text-scn-text-normal transition-colors hover:bg-scn-bg-section';

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `font-sans text-sm font-medium transition-colors hover:text-scn-primary cursor-pointer ${
      isActive ? 'text-scn-primary font-semibold' : 'text-scn-text-normal'
    }`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-scn-border/60 bg-scn-bg-general/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5" onClick={closeMenu}>
          <ScnLogo size={42} />
          <div className="flex flex-col">
            <span className="font-display font-bold text-lg leading-tight tracking-tight text-scn-text-title">
              SCN
            </span>
            <span className="text-[10px] font-medium tracking-[0.14em] uppercase text-scn-text-secondary">
              Seamos como niños
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} className={linkClass}>
              {link.name}
            </NavLink>
          ))}
          {isAdminLoggedIn && (
            <button
              type="button"
              onClick={() => navigate('/personal')}
              className="flex cursor-pointer items-center gap-1.5 font-sans text-sm font-medium text-amber-500 hover:text-amber-600"
            >
              <Settings size={15} />
              <span>Panel</span>
            </button>
          )}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {onCatalog ? (
            <button
              type="button"
              onClick={focusPageSearch}
              aria-label="Buscar en el catálogo"
              className={iconBtnClass}
            >
              <Search size={18} />
            </button>
          ) : (
            <form onSubmit={submitSearch} className="relative w-[220px] xl:w-[260px]">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-scn-text-secondary"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                aria-label="Buscar productos"
                className="w-full rounded-lg border border-scn-border/70 bg-scn-bg-card/50 py-2 pl-9 pr-3 text-sm text-scn-text-title placeholder:text-scn-text-secondary outline-none transition-colors focus:border-[#6622CF]/45 focus:bg-scn-bg-card"
              />
            </form>
          )}
          <Link to="/carrito" aria-label="Carrito" className={`${iconBtnClass} relative`}>
            <ShoppingCart size={18} />
            {itemCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#6622CF] px-1 text-[10px] font-bold text-white">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
            aria-label="Cambiar tema"
            className={iconBtnClass}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          {isAdminLoggedIn && (
            <button
              type="button"
              onClick={onLogout}
              className="cursor-pointer text-xs font-semibold text-rose-500 transition-colors hover:text-rose-600"
            >
              Salir
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={toggleMobileSearch}
            aria-label={
              onCatalog
                ? 'Buscar en el catálogo'
                : searchOpen
                  ? 'Cerrar búsqueda'
                  : 'Buscar productos'
            }
            aria-expanded={onCatalog ? undefined : searchOpen}
            className={iconBtnClass}
          >
            {!onCatalog && searchOpen ? <X size={18} /> : <Search size={18} />}
          </button>
          <Link
            to="/carrito"
            aria-label="Carrito"
            onClick={closeMenu}
            className={`${iconBtnClass} relative`}
          >
            <ShoppingCart size={18} />
            {itemCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#6622CF] px-1 text-[10px] font-bold text-white">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            onClick={toggleMenu}
            aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={isOpen}
            aria-controls={menuId}
            className={`${iconBtnClass} relative`}
          >
            <span className="relative flex h-5 w-5 items-center justify-center">
              <AnimatePresence mode="wait" initial={false}>
                {isOpen ? (
                  <motion.span
                    key="close"
                    initial={{ opacity: 0, rotate: -70, scale: 0.6 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 70, scale: 0.6 }}
                    transition={{ duration: 0.22, ease: easeSoft }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <X size={20} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    initial={{ opacity: 0, rotate: 70, scale: 0.6 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: -70, scale: 0.6 }}
                    transition={{ duration: 0.22, ease: easeSoft }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Menu size={20} />
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {searchOpen && !onCatalog ? (
          <motion.div
            key="mobile-search"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: easeSoft }}
            className="overflow-hidden border-t border-scn-border/50 bg-scn-bg-general/95 backdrop-blur-xl lg:hidden"
          >
            <motion.form
              onSubmit={submitSearch}
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -6, opacity: 0 }}
              transition={{ duration: 0.28, delay: 0.04, ease: easeSoft }}
              className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:px-6"
            >
              <div className="relative min-w-0 flex-1">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-scn-text-secondary"
                />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscá en el catálogo..."
                  aria-label="Buscar productos"
                  className="w-full rounded-xl border border-scn-border/60 bg-scn-bg-card/70 py-2.5 pl-10 pr-4 text-sm text-scn-text-title placeholder:text-scn-text-secondary outline-none focus:border-[#6622CF]/50"
                />
              </div>
              <button
                type="submit"
                className="shrink-0 cursor-pointer rounded-xl bg-[#6622CF] px-4 py-2.5 text-sm font-semibold text-white"
              >
                Buscar
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Cerrar búsqueda"
                className={iconBtnClass}
              >
                <X size={18} />
              </button>
            </motion.form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.button
            key="menu-backdrop"
            type="button"
            aria-label="Cerrar menú"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: easeSoft }}
            className="fixed inset-0 top-16 z-40 bg-[#1A1228]/35 backdrop-blur-[2px] lg:hidden"
            onClick={closeMenu}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key="mobile-menu"
            id={menuId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.36, ease: easeSoft }}
            className="scn-mobile-menu relative z-50 overflow-hidden border-t border-scn-border/50 lg:hidden"
          >
            <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.to}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 + i * 0.035, duration: 0.28, ease: easeSoft }}
                >
                  <NavLink
                    to={link.to}
                    end={link.to === '/'}
                    onClick={closeMenu}
                    className={({ isActive }) =>
                      `block rounded-xl px-4 py-3 font-display text-base font-semibold tracking-wide transition-colors ${
                        isActive
                          ? 'bg-[#6622CF]/15 text-[#6622CF]'
                          : 'text-scn-text-title hover:bg-white/40 dark:hover:bg-white/8'
                      }`
                    }
                  >
                    {link.name}
                  </NavLink>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.04 + navLinks.length * 0.035,
                  duration: 0.28,
                  ease: easeSoft,
                }}
                className="mt-2 space-y-1 border-t border-scn-border/50 pt-3"
              >
                <button
                  type="button"
                  onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
                  className="flex w-full cursor-pointer items-center justify-between rounded-xl px-4 py-3 font-display text-base font-semibold text-scn-text-title hover:bg-white/40 dark:hover:bg-white/8"
                >
                  <span>Tema {theme === 'light' ? 'oscuro' : 'claro'}</span>
                  {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>

                {isAdminLoggedIn ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/personal');
                        closeMenu();
                      }}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-4 py-3 font-display text-base font-semibold text-amber-500"
                    >
                      <Settings size={18} />
                      Panel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onLogout();
                        closeMenu();
                        navigate('/');
                      }}
                      className="w-full cursor-pointer rounded-xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white"
                    >
                      Cerrar sesión
                    </button>
                  </>
                ) : null}
              </motion.div>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
