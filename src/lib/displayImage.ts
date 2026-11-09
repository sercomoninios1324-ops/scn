const WIDTHS = [160, 320, 384, 480, 640, 960, 1280] as const;

function snapWidth(width: number): number {
  return WIDTHS.find((n) => n >= width) ?? WIDTHS[WIDTHS.length - 1];
}

/** URL de visualización. El original sigue en storage; el servidor entrega un WebP al tamaño pedido. */
export function displayImage(url: string | null | undefined, width: number): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/api/img?')) return url;
  const w = snapWidth(width);
  return `/api/img?w=${w}&u=${encodeURIComponent(url)}`;
}
