/**
 * Métricas propias, anónimas y sin cookies de terceros.
 * - Un identificador aleatorio por navegador (no contiene datos personales).
 * - Una visita por día y un "visto" por producto por día: se filtra acá y además
 *   la base tiene clave única, así que nunca se cuenta dos veces.
 * - "No contar este dispositivo" (switch del panel) apaga todo en este navegador.
 */
const VID_KEY = 'scn-vid';
const OPTOUT_KEY = 'scn-analytics-optout';
const VISIT_DAY_KEY = 'scn-visit-day';
const PRODUCT_SEEN_KEY = 'scn-product-seen';

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* modo privado / almacenamiento bloqueado */
  }
}

function safeRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

/** Día en Argentina (coincide con cómo agrupa el servidor). */
function today(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function getVisitorId(): string {
  let vid = safeGet(VID_KEY);
  if (!vid || !/^[a-z0-9-]{16,64}$/.test(vid)) {
    vid =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`;
    safeSet(VID_KEY, vid);
  }
  return vid;
}

export function isTrackingOptedOut(): boolean {
  return safeGet(OPTOUT_KEY) === '1';
}

export function setTrackingOptOut(optOut: boolean) {
  if (optOut) safeSet(OPTOUT_KEY, '1');
  else safeRemove(OPTOUT_KEY);
}

function isBotLike(): boolean {
  if (typeof navigator === 'undefined') return true;
  return Boolean((navigator as Navigator & { webdriver?: boolean }).webdriver);
}

function send(payload: Record<string, unknown>) {
  try {
    void fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* noop */
  }
}

function shouldSkip(adminSession: boolean): boolean {
  return adminSession || isTrackingOptedOut() || isBotLike() || window.location.pathname.startsWith('/personal');
}

/** Visita del sitio: como mucho una por día por navegador. */
export function trackVisit(path: string, adminSession = false) {
  if (typeof window === 'undefined' || shouldSkip(adminSession)) return;
  const day = today();
  if (safeGet(VISIT_DAY_KEY) === day) return;
  safeSet(VISIT_DAY_KEY, day);
  send({ type: 'visit', vid: getVisitorId(), path });
}

/** Ficha de producto vista: como mucho una vez por producto por día por navegador. */
export function trackProductView(productId: string, adminSession = false) {
  if (typeof window === 'undefined' || !productId || shouldSkip(adminSession)) return;
  const day = today();
  let seen: { day: string; ids: string[] } = { day, ids: [] };
  try {
    const raw = JSON.parse(safeGet(PRODUCT_SEEN_KEY) || 'null');
    if (raw && raw.day === day && Array.isArray(raw.ids)) seen = raw;
  } catch {
    /* reinicia */
  }
  if (seen.ids.includes(productId)) return;
  seen.ids.push(productId);
  safeSet(PRODUCT_SEEN_KEY, JSON.stringify(seen));
  send({ type: 'product', vid: getVisitorId(), productId });
}
