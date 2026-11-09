type PushCandidate = {
  id: string;
  is_active: boolean;
  is_push?: boolean;
  short_description?: string;
  description?: string;
  images: { storage_path: string; is_cover: boolean }[];
};

function hasDescription(product: PushCandidate): boolean {
  return Boolean(
    product.short_description?.replace(/<[^>]+>/g, ' ').trim() ||
      product.description?.replace(/<[^>]+>/g, ' ').trim()
  );
}

const STORAGE_KEY = 'scn_daily_push_v1';
const DAY_MS = 24 * 60 * 60 * 1000;

type StoredPush = {
  productId: string;
  expiresAt: number;
};

function readStored(): StoredPush | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPush;
    if (!parsed?.productId || typeof parsed.expiresAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(value: StoredPush) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
}

function pickRandom<T>(products: T[]): T {
  const index = Math.floor(Math.random() * products.length);
  return products[index] ?? products[0];
}

/** Producto de empuje: `is_push` gana; si no hay, uno al azar estable ~24h en este browser. */
export function resolvePushProduct<T extends PushCandidate>(products: T[]): T | null {
  const active = products.filter((p) => p.is_active && p.images?.length > 0);
  if (!active.length) return null;

  const pushed = active.find((p) => p.is_push);
  if (pushed) return pushed;

  const now = Date.now();
  const stored = typeof window !== 'undefined' ? readStored() : null;
  if (stored && stored.expiresAt > now) {
    const stillThere = active.find((p) => p.id === stored.productId);
    if (stillThere) return stillThere;
  }

  const withCopy = active.filter(hasDescription);
  const next = pickRandom(withCopy.length ? withCopy : active);
  if (typeof window !== 'undefined') {
    writeStored({ productId: next.id, expiresAt: now + DAY_MS });
  }
  return next;
}

export function productCover(product: PushCandidate | null): string | null {
  if (!product?.images?.length) return null;
  return (
    product.images.find((img) => img.is_cover)?.storage_path ||
    product.images[0]?.storage_path ||
    null
  );
}
