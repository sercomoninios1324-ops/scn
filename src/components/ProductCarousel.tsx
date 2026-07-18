import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight, ShoppingBag } from 'lucide-react';
import { Product } from '../types';

interface ProductCarouselProps {
  products: (Product & { images: { storage_path: string; is_cover: boolean }[]; category?: { name: string } })[];
  onProductClick: (slug: string) => void;
}

export default function ProductCarousel({ products, onProductClick }: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [activeDot, setActiveDot] = useState(0);

  // We only show active and featured products in the carousel
  const carouselProducts = products.filter(p => p.is_active).slice(0, 8);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const checkScrollPosition = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);

      // Determine active dot based on scroll progress
      const scrollPercentage = scrollLeft / (scrollWidth - clientWidth || 1);
      const dotIndex = Math.min(
        Math.round(scrollPercentage * (Math.min(carouselProducts.length, 5) - 1)),
        Math.min(carouselProducts.length, 5) - 1
      );
      setActiveDot(isNaN(dotIndex) ? 0 : dotIndex);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScrollPosition);
      // Run once on load/mount
      checkScrollPosition();
      window.addEventListener('resize', checkScrollPosition);
    }
    return () => {
      if (el) el.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [products]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      // Scroll by 80% of the visible container width
      const scrollAmount = direction === 'left' ? -clientWidth * 0.8 : clientWidth * 0.8;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollToDot = (dotIndex: number) => {
    if (scrollRef.current) {
      const { scrollWidth, clientWidth } = scrollRef.current;
      const targetPercent = dotIndex / (Math.min(carouselProducts.length, 5) - 1);
      const targetScroll = targetPercent * (scrollWidth - clientWidth);
      scrollRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  };

  if (carouselProducts.length === 0) {
    return (
      <div className="w-full glass rounded-3xl p-12 text-center flex flex-col items-center justify-center border border-scn-border/30">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-scn-primary"></div>
        <p className="mt-4 text-scn-text-normal font-medium">Cargando productos destacados...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full py-6 md:py-10 select-none overflow-visible">
      
      {/* Background ambient light (glow effect similar to the reference site) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[300px] bg-scn-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Header of the Carousel */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between mb-6 md:mb-8">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-1.5 rounded-full bg-scn-primary/10 px-2.5 py-0.5 text-2xs font-bold tracking-wider text-scn-primary uppercase">
            <Sparkles size={11} className="animate-pulse" />
            <span>Novedades & Destacados</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-scn-text-title tracking-tight">
            Descubrí lo Último en Tecnología
          </h2>
        </div>

        {/* Desktop Carousel Navigation Controls */}
        <div className="hidden sm:flex items-center space-x-3">
          <button
            onClick={() => scroll('left')}
            disabled={!showLeftArrow}
            className={`flex h-10 w-10 items-center justify-center rounded-full glass border transition-all cursor-pointer ${
              showLeftArrow 
                ? 'border-scn-border text-scn-text-title hover:scale-105 hover:bg-scn-primary/15 hover:border-scn-primary/45 active:scale-95' 
                : 'opacity-30 text-scn-text-secondary cursor-not-allowed'
            }`}
            aria-label="Anterior producto"
          >
            <ChevronLeft size={20} />
          </button>
          
          <button
            onClick={() => scroll('right')}
            disabled={!showRightArrow}
            className={`flex h-10 w-10 items-center justify-center rounded-full glass border transition-all cursor-pointer ${
              showRightArrow 
                ? 'border-scn-border text-scn-text-title hover:scale-105 hover:bg-scn-primary/15 hover:border-scn-primary/45 active:scale-95' 
                : 'opacity-30 text-scn-text-secondary cursor-not-allowed'
            }`}
            aria-label="Siguiente producto"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Slider Viewport Container */}
      <div className="relative w-full overflow-visible px-4 sm:px-6 lg:px-8">
        
        {/* Scroll Container (no scrollbar) */}
        <div
          ref={scrollRef}
          className="flex gap-5 sm:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-8 pt-2 scrollbar-none"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {carouselProducts.map((product) => {
            const coverImg = product.images.find(img => img.is_cover)?.storage_path || product.images[0]?.storage_path;
            
            return (
              <div
                key={product.id}
                onClick={() => onProductClick(product.slug)}
                className="group flex-none w-[270px] sm:w-[310px] md:w-[330px] snap-start rounded-[2rem] border border-scn-border/40 bg-scn-bg-card/45 backdrop-blur-md p-4 shadow-xs transition-all duration-300 hover:-translate-y-2 hover:shadow-lg hover:shadow-scn-primary/5 hover:border-scn-primary/30 glow-primary-hover cursor-pointer"
              >
                {/* Visual Glass Wrapper inside card */}
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-scn-bg-section/60 border border-scn-border/30">
                  
                  {/* Subtle hover gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />

                  {/* Image zoom effect */}
                  <img
                    src={coverImg}
                    alt={product.name}
                    loading="lazy"
                    className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-108"
                  />
                  
                  {/* Badges on top of Image */}
                  {product.category && (
                    <span className="absolute top-3 left-3 z-20 rounded-full bg-scn-bg-card/90 backdrop-blur-md px-2.5 py-0.5 text-2xs font-bold text-scn-primary uppercase tracking-wider border border-scn-primary/10">
                      {product.category.name}
                    </span>
                  )}
                  {product.stock <= 3 && product.stock > 0 && (
                    <span className="absolute top-3 right-3 z-20 rounded-full bg-amber-500 px-2 py-0.5 text-2xs font-bold text-white tracking-wide shadow-md">
                      ¡Últimos {product.stock}!
                    </span>
                  )}
                </div>

                {/* Card description details */}
                <div className="flex flex-col justify-between pt-4 pb-1">
                  <div className="space-y-1.5">
                    <h3 className="font-display text-base font-bold text-scn-text-title line-clamp-2 leading-tight group-hover:text-scn-primary transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-xs text-scn-text-normal line-clamp-2 leading-relaxed">
                      {product.short_description}
                    </p>
                  </div>

                  {/* Pricing and Action quick detail button */}
                  <div className="flex items-center justify-between pt-4 mt-3 border-t border-scn-border/40">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-scn-text-secondary uppercase tracking-wider">Precio catálogo</span>
                      <span className="font-mono text-base md:text-lg font-extrabold text-scn-primary mt-0.5">
                        {formatPrice(product.price)}
                      </span>
                    </div>
                    
                    {/* View Button with active states resembling references */}
                    <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-scn-primary/10 text-scn-primary group-hover:bg-scn-primary group-hover:text-white group-hover:scale-105 active:scale-95 transition-all duration-300">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination dots */}
      {carouselProducts.length > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-2">
          {Array.from({ length: Math.min(carouselProducts.length, 5) }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => scrollToDot(idx)}
              className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                activeDot === idx 
                  ? 'w-6 bg-scn-primary shadow-sm shadow-scn-primary/30' 
                  : 'w-2.5 bg-scn-border hover:bg-scn-primary/30'
              }`}
              aria-label={`Ir al producto ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
