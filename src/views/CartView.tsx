import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  MessageCircle,
} from 'lucide-react';
import { AnimatePresence, m as motion } from 'motion/react';
import { useCart, type CartItem } from '../context/CartContext';
import { useCatalog } from '../context/CatalogContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { useReducedMotion } from '../hooks/useReducedMotion';
import {
  buildCartCodeWhatsAppMessage,
  createCartShare,
  fetchCartShare,
} from '../lib/cartShare';
import { buildWhatsAppUrl } from '../lib/whatsapp';
import CatalogImage from '../components/CatalogImage';
import { trackWhatsAppCheckout } from '../lib/tracking';
import VioletAurora from '../components/effects/VioletAurora';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);

export default function CartView() {
  const { code: routeCode } = useParams<{ code?: string }>();
  const { items, itemCount, subtotal, setQty, removeItem, clear, replaceCart } =
    useCart();
  const { products, settings, isLoading } = useCatalog();
  const reducedMotion = useReducedMotion();
  const [confirmClear, setConfirmClear] = useState(false);
  const [sharedCode, setSharedCode] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [sendingWa, setSendingWa] = useState(false);
  const [loadingPedido, setLoadingPedido] = useState(Boolean(routeCode));
  const hydratedCode = useRef<string | null>(null);

  usePageMeta({
    title: routeCode ? `Pedido ${routeCode.toUpperCase()} | SCN` : 'Carrito | SCN',
    description: 'Revisá tu selección y consultá por WhatsApp.',
    path: routeCode ? `/pedido/${routeCode}` : '/carrito',
    noIndex: true,
  });

  // Abrir /pedido/CODIGO — carga el carrito guardado
  useEffect(() => {
    const code = routeCode?.trim().toUpperCase();
    if (!code) {
      setLoadingPedido(false);
      return;
    }
    if (isLoading || !products.length) return;
    if (hydratedCode.current === code) {
      setLoadingPedido(false);
      return;
    }

    let cancelled = false;
    setLoadingPedido(true);
    setShareError(null);

    void (async () => {
      try {
        const share = await fetchCartShare(code);
        if (cancelled) return;
        const next: CartItem[] = [];
        for (const row of share.items) {
          const product = products.find(
            (p) => p.slug === row.slug && p.is_active !== false
          );
          if (!product) continue;
          const cover =
            product.images?.find((img) => img.is_cover)?.storage_path ||
            product.images?.[0]?.storage_path;
          next.push({
            productId: product.id,
            slug: product.slug,
            name: product.name,
            price: product.price,
            cover,
            qty: row.qty,
          });
        }
        if (!next.length) {
          setShareError('No se pudieron cargar los productos de este pedido.');
          return;
        }
        hydratedCode.current = code;
        replaceCart(next);
        setSharedCode(code);
      } catch (err) {
        if (!cancelled) {
          setShareError(
            err instanceof Error ? err.message : 'Pedido no encontrado'
          );
        }
      } finally {
        if (!cancelled) setLoadingPedido(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [routeCode, products, isLoading, replaceCart]);

  const sendCartByWhatsApp = async () => {
    if (!items.length || sendingWa) return;
    setSendingWa(true);
    setShareError(null);
    try {
      const share = await createCartShare(items);
      const href = buildWhatsAppUrl(
        buildCartCodeWhatsAppMessage(share.code),
        settings.whatsapp_number
      );
      setSharedCode(share.code);
      trackWhatsAppCheckout(
        items.map((i) => ({ id: i.productId, name: i.name, price: i.price, quantity: i.qty })),
        'carrito',
        share.code
      );
      window.open(href, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setShareError(
        err instanceof Error ? err.message : 'No se pudo generar el pedido'
      );
    } finally {
      setSendingWa(false);
    }
  };

  const handleClear = () => {
    clear();
    setConfirmClear(false);
    setSharedCode(null);
  };

  return (
    <div className="page-enter">
      <section className="relative -mt-16 overflow-hidden pt-16">
        <div className="relative min-h-[180px] sm:min-h-[200px]">
          <VioletAurora />
          <div className="relative z-10 mx-auto flex max-w-3xl flex-col justify-end px-4 pb-8 pt-16 sm:px-6 sm:pb-10 sm:pt-20">
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#6622CF]">
                SCN · Pedido
              </p>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="font-display text-4xl font-extrabold tracking-tight text-scn-text-title sm:text-5xl">
                    Carrito
                  </h1>
                  <p className="mt-2 text-sm text-scn-text-normal">
                    {items.length === 0
                      ? 'Todavía no agregaste nada.'
                      : `${itemCount} ${itemCount === 1 ? 'producto' : 'productos'} listos para consultar.`}
                  </p>
                </div>
                {items.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setConfirmClear(true)}
                    className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-scn-border/70 bg-white/55 px-3.5 py-2 text-xs font-semibold text-scn-text-title backdrop-blur-sm transition-colors hover:border-rose-500/40 hover:text-rose-500 dark:bg-white/8"
                  >
                    Vaciar Carrito
                  </button>
                ) : null}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="relative bg-scn-bg-general pb-20 pt-6 md:pt-8">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          {loadingPedido ? (
            <div className="glass mx-auto max-w-md space-y-3 rounded-3xl p-10 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#6622CF] border-t-transparent" />
              <p className="text-sm text-scn-text-normal">Cargando pedido…</p>
            </div>
          ) : shareError && routeCode && items.length === 0 ? (
            <div className="glass mx-auto max-w-md space-y-4 rounded-3xl p-10 text-center">
              <h2 className="font-display text-xl font-extrabold text-scn-text-title">
                Pedido no encontrado
              </h2>
              <p className="text-sm text-scn-text-normal">{shareError}</p>
              <Link
                to="/catalogo"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6622CF] px-6 py-3 text-sm font-semibold text-white"
              >
                Ver catálogo
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : items.length === 0 ? (
            <div className="glass mx-auto max-w-md space-y-5 rounded-3xl p-10 text-center">
              <span className="scn-trust-icon mx-auto flex h-14 w-14 items-center justify-center">
                <ShoppingCart size={26} strokeWidth={1.75} />
              </span>
              <div className="space-y-1.5">
                <h2 className="font-display text-xl font-extrabold text-scn-text-title">
                  Tu carrito está vacío
                </h2>
                <p className="text-sm text-scn-text-normal">
                  Explorá el catálogo y armá tu lista sin compromiso.
                </p>
              </div>
              <Link
                to="/catalogo"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6622CF] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#6622CF]/30 transition-transform hover:scale-[1.02]"
              >
                Ver todo el catálogo
                <ArrowRight size={16} strokeWidth={2.25} />
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <AnimatePresence initial={false}>
                {sharedCode ? (
                  <motion.div
                    key="shared-banner"
                    initial={reducedMotion ? false : { opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="glass rounded-2xl border border-[#6622CF]/25 px-4 py-3 text-sm text-scn-text-normal"
                  >
                    Pedido{' '}
                    <span className="font-mono font-bold tracking-wide text-[#6622CF]">
                      {sharedCode}
                    </span>
                    {routeCode
                      ? ' — cargado desde el link. Revisá cantidades y confirmá con el cliente.'
                      : ' — listo para enviar por WhatsApp.'}
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {shareError && !routeCode ? (
                <p className="text-sm font-medium text-rose-500">{shareError}</p>
              ) : null}

              <AnimatePresence initial={false}>
                {confirmClear ? (
                  <motion.div
                    key="clear-confirm"
                    initial={
                      reducedMotion
                        ? { opacity: 1 }
                        : { opacity: 0, y: -8, height: 0 }
                    }
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={
                      reducedMotion
                        ? { opacity: 0 }
                        : { opacity: 0, y: -6, height: 0 }
                    }
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="glass flex flex-col gap-3 rounded-2xl border border-rose-500/25 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-scn-text-normal">
                        ¿Vaciar el carrito? Se borran todos los productos.
                      </p>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmClear(false)}
                          className="cursor-pointer rounded-xl border border-scn-border/60 bg-white/55 px-4 py-2 text-xs font-semibold text-scn-text-title backdrop-blur-sm dark:bg-white/8"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleClear}
                          className="cursor-pointer rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white"
                        >
                          Sí, vaciar
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <ul className="space-y-3">
                {items.map((item) => (
                  <li
                    key={item.productId}
                    className="glass flex gap-3 rounded-2xl p-3 sm:gap-4 sm:p-4"
                  >
                    <Link
                      to={`/producto/${item.slug}`}
                      className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-scn-bg-section sm:h-24 sm:w-24"
                    >
                      {item.cover ? (
                        <CatalogImage
                          src={item.cover}
                          width={320}
                          alt=""
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/producto/${item.slug}`}
                          className="font-display text-sm font-bold leading-snug text-scn-text-title line-clamp-2 transition-colors hover:text-[#6622CF] sm:text-base"
                        >
                          {item.name}
                        </Link>
                        <button
                          type="button"
                          aria-label="Quitar del carrito"
                          onClick={() => removeItem(item.productId)}
                          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-scn-text-secondary transition-colors hover:bg-rose-500/10 hover:text-rose-500"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex items-center rounded-xl border border-scn-border/60 bg-white/55 dark:bg-white/8">
                          <button
                            type="button"
                            aria-label="Menos"
                            onClick={() => setQty(item.productId, item.qty - 1)}
                            className="flex h-9 w-9 cursor-pointer items-center justify-center text-scn-text-title"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="min-w-[1.75rem] text-center text-sm font-bold tabular-nums text-scn-text-title">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            aria-label="Más"
                            onClick={() => setQty(item.productId, item.qty + 1)}
                            className="flex h-9 w-9 cursor-pointer items-center justify-center text-scn-text-title"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <p className="font-display text-base font-extrabold text-[#6622CF]">
                          {formatPrice(item.price * item.qty)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="glass space-y-5 rounded-2xl p-5 sm:p-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6622CF]">
                      Resumen
                    </p>
                    <p className="mt-1 text-sm text-scn-text-secondary">
                      Precio estimado · efectivo / transferencia
                    </p>
                  </div>
                  <p className="font-display text-2xl font-extrabold tracking-tight text-scn-text-title sm:text-3xl">
                    {formatPrice(subtotal)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void sendCartByWhatsApp()}
                  disabled={sendingWa}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#6622CF] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#6622CF]/30 transition-transform hover:scale-[1.01] disabled:cursor-wait disabled:opacity-70"
                >
                  <MessageCircle size={18} />
                  {sendingWa ? 'Generando pedido…' : 'Comprar por WhatsApp'}
                </button>

                <Link
                  to="/catalogo"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-scn-border/70 bg-white/55 px-5 py-3 text-sm font-semibold text-scn-text-title backdrop-blur-sm transition-transform hover:scale-[1.01] dark:bg-white/8"
                >
                  Seguir mirando el catálogo
                  <ArrowRight size={16} strokeWidth={2.25} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
