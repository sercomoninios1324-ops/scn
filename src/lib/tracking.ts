/**
 * Google Analytics 4 + Google Tag Manager.
 * - GA4 recibe los eventos directo (gtag) con el ID de medición: no hace falta configurar
 *   etiquetas de GA4 dentro de Tag Manager (si se agregan, se contaría doble).
 * - Tag Manager queda cargado para sumar otras etiquetas (Meta, TikTok, etc.) sin tocar código.
 * - Se cargan después de que la página terminó de cargar (no afectan la velocidad inicial),
 *   solo en el sitio publicado (en localhost se registran en dataLayer pero no se envían).
 * - No se cargan con "No contar este dispositivo" ni con sesión de admin.
 * - IDs públicos; se pueden cambiar con VITE_GTM_ID / VITE_GA_ID en Vercel.
 */
import { isTrackingOptedOut } from './analytics';

const GTM_ID = String(import.meta.env.VITE_GTM_ID || 'GTM-MS6SJLZ9').trim();
const GA_ID = String(import.meta.env.VITE_GA_ID || 'G-1JWW3HCJKH').trim();
const GTM_OK = /^GTM-[A-Z0-9]{4,12}$/.test(GTM_ID);
const GA_OK = /^G-[A-Z0-9]{6,14}$/.test(GA_ID);

type DataLayerEvent = Record<string, unknown>;
type Params = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** null = todavía no se sabe si se mide este navegador (se espera el chequeo de admin). */
let enabled: boolean | null = null;
const pending: Array<[string, Params]> = [];

function dataLayer(): unknown[] {
  window.dataLayer = window.dataLayer || [];
  return window.dataLayer;
}

function isLocalHost(): boolean {
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.local');
}

function injectScript(src: string) {
  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

/** Decide si se mide este navegador e inyecta GA4 + GTM una sola vez, con la página ya cargada. */
export function startTagManager(adminSession: boolean) {
  if (typeof window === 'undefined' || enabled !== null) return;
  if (adminSession || isTrackingOptedOut() || window.location.pathname.startsWith('/personal')) {
    enabled = false;
    pending.length = 0;
    return;
  }
  enabled = true;

  // gtag estándar: encola en dataLayer hasta que carga gtag.js
  window.gtag = function gtag() {
    dataLayer().push(arguments);
  };
  if (GA_OK) {
    window.gtag('js', new Date());
    // page_view lo manda el sitio en cada cambio de página (SPA)
    window.gtag('config', GA_ID, { send_page_view: false });
  }
  if (GTM_OK) dataLayer().push({ 'gtm.start': Date.now(), event: 'gtm.js' });

  for (const [name, params] of pending.splice(0)) send(name, params);

  if (isLocalHost()) return;
  const inject = () => {
    if (GA_OK) injectScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`);
    if (GTM_OK) injectScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`);
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

function send(event: string, params: Params) {
  // Tag Manager: formato dataLayer (ecommerce anidado; se limpia antes de cada evento)
  if (GTM_OK) {
    if ('ecommerce' in params) dataLayer().push({ ecommerce: null });
    dataLayer().push({ event, ...params } as DataLayerEvent);
  }
  // GA4 directo: items/value/currency van en el primer nivel
  if (GA_OK && window.gtag) {
    const { ecommerce, ...rest } = params as Params & { ecommerce?: Params };
    window.gtag('event', event, { ...rest, ...(ecommerce || {}) });
  }
}

/** Evento para GA4/GTM. Antes de decidir si se mide, queda en cola. */
export function trackEvent(event: string, params: Params = {}) {
  if (typeof window === 'undefined' || enabled === false) return;
  if (enabled === null) {
    if (pending.length < 30) pending.push([event, params]);
    return;
  }
  send(event, params);
}

let lastPath = '';
/** Página vista (SPA). Una por ruta: los filtros/búsquedas del catálogo no suman páginas. */
export function trackPageView(pathname: string) {
  if (typeof window === 'undefined' || pathname === lastPath) return;
  lastPath = pathname;
  trackEvent('page_view', {
    page_path: pathname,
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
