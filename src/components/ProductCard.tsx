import { memo, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import type { Product } from '../types';
import { formatCategoryLabel } from '../lib/formatCategory';
import CatalogImage from './CatalogImage';

export type ProductCardProduct = Product & {
  images: { storage_path: string; is_cover: boolean }[];
  category?: { name: string };
};

interface ProductCardProps {
  product: ProductCardProduct;
  className?: string;
  layout?: 'carousel' | 'grid';
  /** Tratamiento visual fuerte para la sección Destacados */
  featured?: boolean;
  onClickCapture?: (e: MouseEvent) => void;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);

export function isOnOffer(product: Pick<Product, 'price' | 'compare_at_price'>): boolean {
  const compare = product.compare_at_price;
  return typeof compare === 'number' && Number.isFinite(compare) && compare > product.price;
}

function ProductCard({
  product,
  className = '',
  layout = 'grid',
  featured = false,
  onClickCapture,
}: ProductCardProps) {
  const coverImg =
    product.images.find((img) => img.is_cover)?.storage_path || product.images[0]?.storage_path;
  const onOffer = isOnOffer(product);

  const widthClass =
    layout === 'carousel'
      ? 'h-full w-[270px] sm:w-[310px] md:w-[330px] flex-none'
      : 'h-full w-full';

  return (
    <Link
      to={`/producto/${product.slug}`}
      onClickCapture={onClickCapture}
      className={`group scn-product-card flex flex-col rounded-2xl p-3 sm:rounded-[1.75rem] sm:p-4 transition-all duration-300 hover:-translate-y-1.5 ${
        featured ? 'scn-product-card--featured' : 'hover:border-scn-primary/40'
      } ${widthClass} ${className}`}
    >
      <div
        className={`relative aspect-square w-full overflow-hidden rounded-xl sm:rounded-2xl ${
          featured
            ? 'border border-scn-primary/30 bg-scn-bg-section/40 ring-1 ring-scn-primary/15'
            : 'border border-scn-border/35 bg-scn-bg-section/70'
        }`}
      >
        {coverImg ? (
          <CatalogImage
            src={coverImg}
            width={480}
            srcSetWidths={[320, 384, 480, 640, 960]}
            sizes={
              layout === 'carousel'
                ? '(min-width: 768px) 330px, 310px'
                : '(min-width: 1280px) 300px, (min-width: 1024px) 23vw, (min-width: 768px) 31vw, 46vw'
            }
            alt={product.name}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-scn-text-secondary">
            Sin imagen
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />

        {product.category && (
          <span className="absolute top-2 left-2 z-20 max-w-[70%] truncate rounded-md border border-white/20 bg-black/55 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white shadow-sm backdrop-blur-md sm:top-3 sm:left-3 sm:rounded-lg sm:px-2.5 sm:py-1 sm:text-[11px]">
            {formatCategoryLabel(product.category.name)}
          </span>
        )}

        {onOffer && (
          <span className="absolute top-2 right-2 z-20 rounded-md border border-white/20 bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#6622CF] shadow-md sm:top-3 sm:right-3 sm:rounded-lg sm:px-2.5 sm:py-1 sm:text-[11px]">
            Oferta
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-3 sm:pt-4">
        <div className="flex-1 space-y-1">
          <h3 className="font-display min-h-[2.25rem] text-sm font-bold leading-tight text-scn-text-title line-clamp-2 transition-colors group-hover:text-scn-primary sm:min-h-[2.5rem] sm:text-base">
            {product.name}
          </h3>
          <p className="hidden min-h-[2.25rem] text-xs leading-relaxed text-scn-text-normal/95 line-clamp-2 sm:block">
            {product.short_description || '\u00A0'}
          </p>
        </div>

        <div
          className={`mt-auto flex items-center justify-between gap-4 pt-3 sm:gap-5 sm:pt-4 ${
            featured ? 'border-t border-scn-primary/25' : 'border-t border-scn-border/40'
          }`}
        >
          <div className="min-w-0 flex-1 flex flex-col justify-center pr-1">
            {onOffer && product.compare_at_price != null ? (
              <span className="font-sans text-[10px] text-scn-text-secondary line-through opacity-70 sm:text-xs">
                {formatPrice(product.compare_at_price)}
              </span>
            ) : null}
            {/* Violeta marca fijo (#6622CF): legible en light y dark */}
            <span className="font-sans truncate text-sm font-semibold tracking-tight text-[#6622CF] sm:text-[0.95rem]">
              {formatPrice(product.price)}
            </span>
          </div>
          {featured ? (
            <span
              className="inline-flex shrink-0 items-center justify-center gap-1 rounded-md bg-[#6622CF] p-1.5 text-white shadow-md shadow-[#6622CF]/40 sm:rounded-lg sm:px-2.5 sm:py-1 sm:text-[11px] sm:font-bold sm:uppercase sm:tracking-[0.1em]"
              title="Destacado"
              aria-label="Destacado"
            >
              <Star size={12} className="fill-white sm:hidden" />
              <Star size={10} className="fill-white hidden sm:block" />
              <span className="hidden sm:inline">Destacado</span>
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export default memo(ProductCard);
