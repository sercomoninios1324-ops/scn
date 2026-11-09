import path from 'path';
import sharp from 'sharp';

const ALLOWED_INPUT_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_EDGE = 1600;
const WEBP_QUALITY = 74;

export function isAllowedUploadMime(mime: string): boolean {
  return ALLOWED_INPUT_MIME.has(mime.toLowerCase().split(';')[0].trim());
}

/** Re-encodea a WebP seguro: rota, limita píxeles, saca EXIF, tope de lado. */
export async function encodeProductWebp(input: Buffer): Promise<Buffer> {
  if (!input.length || input.length > MAX_UPLOAD_BYTES) {
    throw new Error('La imagen supera el tamaño máximo (8 MB)');
  }

  const pipeline = sharp(input, {
    animated: false,
    limitInputPixels: 40_000_000,
    failOn: 'error',
  });

  const meta = await pipeline.metadata();
  if (!meta.format || !['jpeg', 'png', 'webp', 'gif', 'jpg'].includes(meta.format)) {
    throw new Error('Formato de imagen no permitido');
  }

  return sharp(input, { animated: false, limitInputPixels: 40_000_000 })
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();
}

export function newProductImageName(): string {
  return `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}.webp`;
}

/** Solo URLs de bucket product-images o /uploads/<archivo seguro>. */
export function isAllowedStoragePath(raw: unknown): boolean {
  if (typeof raw !== 'string' || !raw.trim()) return false;
  const value = raw.trim();

  if (value.startsWith('/uploads/')) {
    const name = value.slice('/uploads/'.length);
    return !!name && !name.includes('..') && !name.includes('/') && !name.includes('\\') && !name.includes('\0');
  }

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    if (!url.hostname.endsWith('.supabase.co')) return false;
    if (!url.pathname.includes('/storage/') || !url.pathname.includes('/product-images/')) return false;
    if (url.pathname.includes('..')) return false;
    return true;
  } catch {
    return false;
  }
}

export function sanitizeProductImages(
  images: unknown
): Array<{ storage_path: string; is_cover?: boolean; position?: number; id?: string }> {
  if (!Array.isArray(images)) return [];
  return images
    .map((row) => {
      const img = row as Record<string, unknown>;
      const storage_path = String(img.storage_path || '').trim();
      if (!isAllowedStoragePath(storage_path)) return null;
      return {
        id: img.id != null ? String(img.id) : undefined,
        storage_path,
        is_cover: !!img.is_cover,
        position: img.position !== undefined ? Number(img.position) : undefined,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
}

export function uploadsFileNameFromPath(storagePath: string): string | null {
  if (!storagePath.startsWith('/uploads/')) return null;
  return path.basename(storagePath);
}
