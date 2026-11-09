import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ProductCard, { type ProductCardProduct } from './ProductCard';

interface ProductCarouselProps {
  products: ProductCardProduct[];
  isLoading?: boolean;
}

function CatalogGlassCta({ className = '' }: { className?: string }) {
  return (
    <Link
      to="/catalogo"
      className={`scn-catalog-cta group inline-flex items-center justify-center gap-2 ${className}`}
    >
      <span className="relative z-[1]">Ver todo el catálogo</span>
      <ArrowRight size={16} strokeWidth={2.25} className="relative z-[1] transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

/** Destacados en grilla responsive. */
export default function ProductCarousel({ products, isLoading = false }: ProductCarouselProps) {
  const gridProducts = products.filter((p) => p.is_active).slice(0, 8);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="glass rounded-3xl p-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-scn-primary" />
          <p className="mt-4 text-sm font-medium text-scn-text-normal">Cargando destacados...</p>
        </div>
      </div>
    );
  }

  if (gridProducts.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="glass space-y-4 rounded-3xl p-10 text-center">
          <p className="font-display text-lg font-bold text-scn-text-title">Todavía no hay destacados</p>
          <p className="text-sm text-scn-text-normal">
            Miralo el catálogo completo mientras cargamos novedades.
          </p>
          <div className="flex justify-center pt-1">
            <CatalogGlassCta />
          </div>
        </div>
      </div>
    );
  }

  const total = products.filter((p) => p.is_active).length;

  return (
    <div className="relative w-full py-6 md:py-10">
      <div className="mx-auto mb-5 flex max-w-7xl items-end justify-between gap-4 px-4 sm:mb-8 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-scn-text-title sm:text-3xl">
            Destacados
          </h2>
          <p className="mt-1 text-sm text-scn-text-normal">Lo que más se está mirando ahora.</p>
        </div>
        <Link
          to="/catalogo?featured=1"
          className="group inline-flex shrink-0 items-center gap-1 rounded-lg py-2 text-sm font-semibold text-[#6622CF] transition-colors hover:text-[#7d3ae6] dark:text-[#b794f6] dark:hover:text-white"
        >
          Ver todos{total > gridProducts.length ? ` (${total})` : ''}
          <ArrowRight size={16} strokeWidth={2.25} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
          {gridProducts.map((product, index) =>
            // Celular/tablet: 6 tarjetas. PC: 8 (dos filas de 4).
            index >= 6 ? (
              <div key={product.id} className="hidden lg:block">
                <ProductCard product={product} layout="grid" featured />
              </div>
            ) : (
              <ProductCard key={product.id} product={product} layout="grid" featured />
            )
          )}
        </div>

        <div className="mt-8 flex justify-center sm:mt-10">
          <CatalogGlassCta className="w-full sm:w-auto sm:min-w-[260px]" />
        </div>
      </div>
    </div>
  );
}
