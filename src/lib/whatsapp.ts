import { SITE_ORIGIN } from './seo';

/** En producción los links compartidos usan siempre el dominio oficial; en local, el origen actual. */
export function linkOrigin(): string {
  if (typeof window === 'undefined') return SITE_ORIGIN;
  const { hostname, origin } = window.location;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');
  return isLocal ? origin : SITE_ORIGIN;
}

const OFFICIAL_WHATSAPP = '5492915224734';

/** Normaliza cualquier formato al número oficial SCN para wa.me */
export function normalizeWhatsAppNumber(raw?: string | null): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return OFFICIAL_WHATSAPP;

  if (digits === OFFICIAL_WHATSAPP || digits === '2915224734') {
    return OFFICIAL_WHATSAPP;
  }

  if (digits.startsWith('549') && digits.length >= 12) return digits;
  if (digits.startsWith('54') && digits.length >= 11) {
    const rest = digits.slice(2);
    return rest.startsWith('9') ? `54${rest}` : `549${rest}`;
  }
  if (digits.length === 10) return `549${digits}`;

  return OFFICIAL_WHATSAPP;
}

export function formatWhatsAppDisplay(raw?: string | null): string {
  const digits = normalizeWhatsAppNumber(raw);
  const local = digits.startsWith('549') ? digits.slice(3) : digits;
  if (local.length === 10) {
    return `+54 9 ${local.slice(0, 3)} ${local.slice(3, 6)}-${local.slice(6)}`;
  }
  return `+${digits}`;
}

export function buildWhatsAppUrl(message: string, rawNumber?: string | null): string {
  const number = normalizeWhatsAppNumber(rawNumber);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function productWhatsAppMessage(opts: {
  name: string;
  priceText: string;
  slug: string;
  origin?: string;
}): string {
  const origin = opts.origin || linkOrigin();
  const url = `${origin}/producto/${opts.slug}`;
  return `Hola SCN! Me interesa el producto *${opts.name}* (${opts.priceText}). Lo vi acá: ${url}`;
}

export const INSTAGRAM_URL = 'https://instagram.com/somos_scn';
export const OFFICIAL_WHATSAPP_NUMBER = OFFICIAL_WHATSAPP;
