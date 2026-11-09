const SITE_NAME = 'SCN — Seamos como niños';
const CANONICAL_ORIGIN = (
  (typeof import.meta !== 'undefined' &&
    (import.meta as ImportMeta & { env?: { VITE_SITE_URL?: string } }).env?.VITE_SITE_URL) ||
  'https://somos-scn.com.ar'
).replace(/\/$/, '');

/** Origen canónico fijo: canonical/og:url/JSON-LD siempre apuntan al dominio oficial (no a www ni *.vercel.app). */
export const SITE_ORIGIN = CANONICAL_ORIGIN;
const DEFAULT_ORIGIN = CANONICAL_ORIGIN;

function clampDescription(text: string, max = 160): string {
  const clean = (text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:]+$/, '')}…`;
}

export interface PageMeta {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noIndex?: boolean;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertJsonLd(data: Record<string, unknown> | Record<string, unknown>[] | undefined) {
  const id = 'scn-page-jsonld';
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  if (!data) return;
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = id;
  script.text = JSON.stringify(data);
  document.head.appendChild(script);
}

export function setPageMeta(meta: PageMeta) {
  if (typeof document === 'undefined') return;

  const origin = DEFAULT_ORIGIN;
  const url = `${origin}${meta.path.startsWith('/') ? meta.path : `/${meta.path}`}`;
  const title = meta.title.includes('SCN') ? meta.title : `${meta.title} | ${SITE_NAME}`;
  const image = meta.ogImage || `${origin}/og.jpg?v=3`;

  const description = clampDescription(meta.description);

  document.title = title;
  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', meta.noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
  upsertLink('canonical', url);

  upsertMeta('property', 'og:type', meta.path.startsWith('/producto/') ? 'product' : 'website');
  upsertMeta('property', 'og:site_name', SITE_NAME);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', url);
  upsertMeta('property', 'og:image', image);

  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', image);

  upsertJsonLd(meta.jsonLd);
}

export function localBusinessJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: SITE_NAME,
    alternateName: 'SCN',
    description:
      'Catálogo de tecnología y electrónica en Bahía Blanca con venta y asesoramiento por WhatsApp.',
    url: DEFAULT_ORIGIN,
    image: `${DEFAULT_ORIGIN}/og.jpg?v=3`,
    logo: `${DEFAULT_ORIGIN}/logo.png`,
    telephone: '+5492915224734',
    email: 'sercomoninios1324@gmail.com',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Bahía Blanca',
      addressRegion: 'Buenos Aires',
      addressCountry: 'AR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: -38.7183,
      longitude: -62.2663,
    },
    areaServed: { '@type': 'City', name: 'Bahía Blanca' },
    sameAs: ['https://instagram.com/somos_scn'],
    priceRange: '$$',
  };
}

export function productJsonLd(product: {
  name: string;
  description: string;
  slug: string;
  price: number;
  currency?: string;
  image?: string;
  sku?: string;
  inStock?: boolean;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: clampDescription(product.description, 500),
    sku: product.sku,
    image: product.image,
    url: `${DEFAULT_ORIGIN}/producto/${product.slug}`,
    brand: { '@type': 'Brand', name: 'SCN' },
    offers: {
      '@type': 'Offer',
      priceCurrency: product.currency || 'ARS',
      price: product.price,
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${DEFAULT_ORIGIN}/producto/${product.slug}`,
    },
  };
}
