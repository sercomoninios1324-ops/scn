/**
 * Google Tag Manager + eventos para GA4 (nombres recomendados por Google).
 * - El ID va en la variable de entorno VITE_GTM_ID (Vercel). Sin ID no se carga nada.
 * - GA4 se configura DENTRO de Tag Manager (etiqueta "Google tag" con el ID G-XXXX).
 * - Se carga después de que la página terminó de cargar: no afecta la velocidad inicial.
 * - No se carga si el dispositivo tiene "No contar este dispositivo" o hay sesión de admin.
 * - Página vista: se manda "page_view" en cada cambio de ruta (la web es una SPA).
 */
import { isTrackingOptedOut } from './analytics';

const GTM_ID = String(import.meta.env.VITE_GTM_ID || '').trim();
const VALID_ID = /^GTM-[A-Z0-9]{4,12}$/.test(GTM_ID);

type DataLayerEvent = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
  }
}

let started = false;
let disabled = false;

function dataLayer(): DataLayerEvent[] {
  window.dataLayer = window.dataLayer || [];
  return window.dataLayer;
}

export function isTagManagerEnabled(): boolean {
  return VALID_ID && !disabled;
}

/** Inyecta gtm.js una sola vez, con la página ya cargada. */
export function startTagManager(adminSession: boolean) {
  if (typeof window === 'undefined' || !VALID_ID || started) return;
  if (adminSession || isTrackingOptedOut() || window.location.pathname.startsWith('/personal')) {
    disabled = true;
    return;
  }
  started = true;
  dataLayer().push({ 'gtm.start': Date.now(), event: 'gtm.js' });

  const inject = () => {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`;
    document.head.appendChild(script);
  };
  const afterLoad = () => {
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
      .requestIdleCallback;
    if (ric) ric(inject, { timeout: 2500 });
    else window.setTimeout(inject, 500);
  };
  if (document.readyState === 'complete') afterLoad();
  else window.addEventListener('load', afterLoad, { once: true });
}

/** Evento para GTM/GA4. Si GTM no está activo no hace nada. */
export function trackEvent(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined' || !VALID_ID || disabled) return;
  // GA4 recomienda limpiar el objeto ecommerce antes de cada evento de ecommerce
  if ('ecommerce' in params) dataLayer().push({ ecommerce: null });
  dataLayer().push({ event, ...params });
}

let lastPath = '';
/** Página vista (SPA). Se llama al cambiar de ruta, con el título ya actualizado. */
export function trackPageView(path: string) {
  if (path === lastPath) return;
  lastPath = path;
  trackEvent('page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

type ItemLike = { id: string; name: string; price: number; category?: string | null };

function item(p: ItemLike, quantity = 1) {
  return {
    item_id: p.id,
    item_name: p.name,
    item_category: p.category || undefined,
    price: Number(p.price) || 0,
    quantity,
  };
}

let lastViewed = { id: '', at: 0 };
export function trackViewItem(p: ItemLike) {
  // El mismo producto no se reporta dos veces seguidas (re-render / modo estricto)
  const now = Date.now();
  if (lastViewed.id === p.id && now - lastViewed.at < 3000) return;
  lastViewed = { id: p.id, at: now };
  trackEvent('view_item', { ecommerce: { currency: 'ARS', value: Number(p.price) || 0, items: [item(p)] } });
}

export function trackAddToCart(p: ItemLike, quantity: number) {
  trackEvent('add_to_cart', {
    ecommerce: { currency: 'ARS', value: (Number(p.price) || 0) * quantity, items: [item(p, quantity)] },
  });
}

/** Clic en "Comprar por WhatsApp" (producto suelto o carrito): es la conversión del sitio. */
export function trackWhatsAppCheckout(items: (ItemLike & { quantity?: number })[], source: 'producto' | 'carrito', orderCode?: string) {
  const value = items.reduce((s, i) => s + (Number(i.price) || 0) * (i.quantity || 1), 0);
  trackEvent('begin_checkout', {
    checkout_channel: 'whatsapp',
    checkout_source: source,
    order_code: orderCode,
    ecommerce: { currency: 'ARS', value, items: items.map((i) => item(i, i.quantity || 1)) },
  });
}

let searchTimer: number | undefined;
let lastSearch = '';
/** Búsqueda en el catálogo (se manda cuando la persona deja de escribir). */
export function trackSearch(term: string) {
  const t = term.trim().toLowerCase();
  if (typeof window === 'undefined' || t.length < 3) return;
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    if (t === lastSearch) return;
    lastSearch = t;
    trackEvent('search', { search_term: t });
  }, 1500);
}

/** Participación en un sorteo (lead). No se mandan datos personales. */
export function trackRaffleEntry(raffleTitle: string) {
  trackEvent('generate_lead', { lead_source: 'sorteo', raffle_title: raffleTitle });
}
