import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import CatalogImage from './CatalogImage';
import type { CatalogProduct } from '../context/CatalogContext';
import { useIsDark } from '../hooks/useIsDark';

// WebGL/canvas: se baja aparte para no frenar el primer render.
const ElectricBorder = lazy(() => import('./ElectricBorder'));

type Props = {
  product: CatalogProduct;
  cover: string;
  formatPrice: (price: number) => string;
  compact?: boolean;
};

function plainDescription(product: CatalogProduct): string {
  const short = product.short_description?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (short) return short;
  const long = product.description?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return long || '';
}

export default function HeroPushCard({ product, cover, formatPrice, compact = false }: Props) {
  const isDark = useIsDark();
  const description = plainDescription(product);

  const card = (
    <Link
      to={`/producto/${product.slug}`}
      className="group relative block overflow-hidden rounded-[22px] border border-scn-border/50 bg-scn-bg-card/90 backdrop-blur-md"
    >
      <div className="absolute top-2.5 left-2.5 z-10 inline-flex items-center gap-1.5 rounded-md bg-[#6622CF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-[#6622CF]/35">
        <Sparkles size={11} className="opacity-90" />
        Hoy en SCN
      </div>
      <div
        className={`w-full overflow-hidden bg-scn-bg-section ${compact ? 'aspect-[16/10] max-h-[160px]' : 'aspect-[5/4]'}`}
      >
        <CatalogImage
          src={cover}
          width={640}
          srcSetWidths={[480, 640, 960]}
          sizes={compact ? '340px' : '360px'}
          alt={product.name}
          decoding="async"
          fetchPriority="high"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
      </div>
      <div className={`space-y-2 px-3.5 ${compact ? 'py-2.5' : 'py-3.5'}`}>
        <h2
          className={`font-display font-bold leading-snug tracking-wide text-scn-text-title ${
            compact ? 'line-clamp-1 text-sm' : 'line-clamp-2 text-base'
          }`}
        >
          {product.name}
        </h2>
        {description ? (
          <p
            className={`text-scn-text-normal/90 ${
              compact
                ? 'line-clamp-2 text-[11px] leading-snug'
                : 'line-clamp-3 text-xs leading-relaxed sm:text-[13px]'
            }`}
          >
            {description}
          </p>
        ) : null}
        <div className="flex items-end justify-between gap-3 pt-0.5">
          <p className={`font-sans font-semibold text-[#6622CF] ${compact ? 'text-base' : 'text-lg'}`}>
            {formatPrice(product.price)}
          </p>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-scn-text-secondary transition-colors group-hover:text-[#6622CF]">
            Ver <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );

  const plainFrame = (
    <div className="w-full rounded-[26px] ring-1 ring-[#9468D4]/50" style={{ padding: 3 }}>
      {card}
    </div>
  );

  return (
    <div className="scn-hero-push w-full rounded-[26px] shadow-[0_20px_50px_-18px_rgba(102,34,207,0.35)] dark:shadow-[0_24px_70px_-18px_rgba(102,34,207,0.65)]">
      <Suspense fallback={plainFrame}>
      <ElectricBorder
        color={isDark ? '#C9B2E8' : '#9468D4'}
        glowColor="#6622CF"
        speed={1.05}
        chaos={0.55}
        thickness={1.7}
        strands={3}
        glow={1.1}
        intensity={1.15}
        arcs={2}
        borderRadius={26}
        intro={false}
        theme={isDark ? 'dark' : 'light'}
        className="w-full"
        style={{ padding: 3 }}
      >
        {card}
      </ElectricBorder>
      </Suspense>
    </div>
  );
}
