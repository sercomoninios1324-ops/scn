

import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, Check, Sparkles, ShoppingBag, ArrowRight } from 'lucide-react';
import { Product, SiteSettings } from '../types';
import { safeJson } from '../lib/api';

type ProductWithImages = Product & {
  images: { storage_path: string; is_cover: boolean }[];
  category?: { name: string };
};

interface ProductDetailViewProps {
  productSlug: string;
  products: ProductWithImages[];
  settings: SiteSettings;
  setCurrentPage: (page: string) => void;
  setSelectedProductSlug: (slug: string) => void;
}

export default function ProductDetailView({
  productSlug,
  products,
  settings,
  setCurrentPage,
  setSelectedProductSlug,
}: ProductDetailViewProps) {
  const [product, setProduct] = useState<ProductWithImages | null>(
    () => products.find((p) => p.slug === productSlug) ?? null
  );
  const [isLoading, setIsLoading] = useState(!product);
  const [activeImage, setActiveImage] = useState<string>('');

  useEffect(() => {
    const fromList = products.find((p) => p.slug === productSlug);
    if (fromList) {
      setProduct(fromList);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetch(`/api/products/${encodeURIComponent(productSlug)}`)
      .then(async (res) => {
        if (!res.ok) {
          if (!cancelled) setProduct(null);
          return;
        }
        const data = (await safeJson(res)) as ProductWithImages;
        if (!cancelled) setProduct(data);
      })
      .catch(() => {
        if (!cancelled) setProduct(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productSlug, products]);

  useEffect(() => {
    if (product) {
      const cover =
        product.images.find((img) => img.is_cover)?.storage_path ||
        product.images[0]?.storage_path ||
        '';
      setActiveImage(cover);
    }
  }, [product]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <p className="text-sm text-scn-text-normal">Cargando producto...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center space-y-4">
        <h2 className="font-display text-2xl font-bold text-scn-text-title">Producto no encontrado</h2>
        <p className="text-sm text-scn-text-normal">El producto que buscás no existe o fue desactivado.</p>
        <button
          onClick={() => setCurrentPage('products')}
          className="rounded-xl bg-scn-primary px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-scn-hover transition-colors"
        >
          Volver al Catálogo
        </button>
      </div>
    );
  }

  const relatedProducts = products
    .filter(p => p.category_id === product.category_id && p.id !== product.id)
    .slice(0, 4);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const buildWhatsappLink = () => {
    const rawNumber = settings.whatsapp_number || '2915224734';
    const cleanedNumber = rawNumber.replace(/[^\d]/g, '');
    
    const currentUrl = `${window.location.origin}/productos/${product.slug}`;
    const priceText = formatPrice(product.price);
    
    const message = `Hola SCN! Me interesa el producto *${product.name}* (${priceText}). Lo vi acá: ${currentUrl}`;
    const encodedMessage = encodeURIComponent(message);
    
    return `https://wa.me/${cleanedNumber}?text=${encodedMessage}`;
  };

  const handleRelatedProductClick = (slug: string) => {
    setSelectedProductSlug(slug);
    setActiveImage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div id="product-detail-view" className="page-enter mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-32 pt-6 space-y-12">
      
      
      <button
        id="btn-back-catalog"
        onClick={() => setCurrentPage('products')}
        className="inline-flex items-center space-x-1.5 text-xs font-bold text-scn-text-secondary hover:text-scn-primary transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} />
        <span>VOLVER AL CATÁLOGO</span>
      </button>

      
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        
        
        <div className="md:col-span-6 space-y-4">
          
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-scn-border bg-scn-bg-card shadow-sm">
            <img
              id="active-gallery-image"
              src={activeImage}
              alt={product.name}
              className="h-full w-full object-cover object-center transition-all duration-300"
            />
            {product.stock === 0 && (
              <span className="absolute top-4 left-4 rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white tracking-wide">
                Sin Stock
              </span>
            )}
          </div>

          
          {product.images.length > 1 && (
            <div id="gallery-thumbnails" className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {product.images.map((img) => (
                <button
                  key={img.storage_path}
                  onClick={() => setActiveImage(img.storage_path)}
                  className={`relative aspect-square h-16 w-16 overflow-hidden rounded-lg border-2 bg-scn-bg-card transition-all cursor-pointer ${
                    activeImage === img.storage_path
                      ? 'border-scn-primary scale-95 shadow-sm'
                      : 'border-scn-border hover:border-scn-primary/40'
                  }`}
                >
                  <img
                    src={img.storage_path}
                    alt={`${product.name} miniatura`}
                    className="h-full w-full object-cover object-center"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        
        <div className="md:col-span-6 space-y-6">
          <div className="space-y-3">
            {product.category && (
              <span id="detail-category" className="inline-block rounded-full bg-scn-primary/10 px-3 py-1 text-xs font-semibold text-scn-primary uppercase tracking-wide">
                {product.category.name}
              </span>
            )}
            <h1 id="detail-name" className="font-display text-2xl sm:text-3xl font-extrabold text-scn-text-title tracking-tight leading-tight">
              {product.name}
            </h1>
            <p className="text-xs font-mono text-scn-text-secondary">
              SKU: {product.sku || 'N/D'}
            </p>
          </div>

          
          <div id="detail-price-panel" className="bg-scn-bg-section border border-scn-border rounded-2xl p-5 flex items-center justify-between transition-colors">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-scn-text-normal leading-none">Precio final efectivo / transferencia</span>
              <span id="detail-price-tag" className="font-mono text-3xl font-extrabold text-scn-primary mt-1.5">
                {formatPrice(product.price)}
              </span>
            </div>
            <div className="flex flex-col items-end text-right">
              <span className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-500">
                <Sparkles size={12} />
                <span>100% Seguro</span>
              </span>
              <span className="text-3xs text-scn-text-secondary mt-1">Sujeto a disponibilidad</span>
            </div>
          </div>

          
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-scn-text-title">Descripción del Producto</h3>
            <p id="detail-description" className="text-sm text-scn-text-normal leading-relaxed whitespace-pre-wrap">
              {product.description || product.short_description}
            </p>
          </div>

          
          {Array.isArray(product.includes) && product.includes.length > 0 && (
            <div id="detail-includes-section" className="border-t border-scn-border pt-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-scn-text-title">¿Qué incluye la caja?</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-scn-text-normal">
                {product.includes.map((item, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 mt-0.5 shrink-0">
                      <Check size={12} />
                    </span>
                    <span className="text-xs font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          
          <div className="border-t border-scn-border pt-5 space-y-3">
            <a
              id="btn-whatsapp-order"
              href={buildWhatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center space-x-2.5 rounded-xl bg-emerald-500 px-6 py-4 font-sans text-base font-bold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 hover:shadow-xl transition-all"
            >
              <MessageSquare size={20} />
              <span>Consultar / Comprar por WhatsApp</span>
            </a>
            
            <p className="text-3xs text-center text-scn-text-secondary">
              Al hacer clic serás redirigido a WhatsApp para coordinar el pago, el método de entrega o resolver dudas de forma directa con nosotros.
            </p>
          </div>

        </div>

      </div>

      
      <div id="mobile-sticky-action" className="fixed bottom-0 left-0 right-0 z-40 bg-scn-bg-general/90 backdrop-blur-md border-t border-scn-border p-4 flex md:hidden items-center justify-between">
        <div className="flex flex-col">
          <span className="text-3xs text-scn-text-secondary leading-none">Total</span>
          <span className="font-mono text-sm font-extrabold text-scn-primary mt-1">
            {formatPrice(product.price)}
          </span>
        </div>
        <a
          id="btn-whatsapp-order-mobile"
          href={buildWhatsappLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-2 rounded-xl bg-emerald-500 px-5 py-3 font-sans text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
        >
          <MessageSquare size={14} />
          <span>Comprar Ya</span>
        </a>
      </div>

      
      {relatedProducts.length > 0 && (
        <section id="related-products-section" className="border-t border-scn-border pt-12 space-y-6">
          <div>
            <h2 className="font-display text-xl font-extrabold text-scn-text-title tracking-tight">
              Productos Relacionados
            </h2>
            <p className="text-xs text-scn-text-secondary mt-0.5">
              Más dispositivos interesantes de la misma categoría que te pueden gustar.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((p) => {
              const coverImg = p.images.find(img => img.is_cover)?.storage_path || p.images[0]?.storage_path;
              return (
                <div
                  id={`related-card-${p.id}`}
                  key={p.id}
                  onClick={() => handleRelatedProductClick(p.slug)}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-scn-border bg-scn-bg-card p-3 shadow-xs transition-all hover:-translate-y-1 hover:shadow-sm hover:border-scn-primary/20 cursor-pointer"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-scn-bg-section">
                    <img
                      src={coverImg}
                      alt={p.name}
                      loading="lazy"
                      className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex flex-1 flex-col justify-between pt-3 pb-1">
                    <h3 className="font-display text-xs font-bold text-scn-text-title line-clamp-2 leading-snug group-hover:text-scn-primary transition-colors">
                      {p.name}
                    </h3>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-scn-border/30">
                      <span className="font-mono text-sm font-bold text-scn-primary">
                        {formatPrice(p.price)}
                      </span>
                      <span className="text-3xs font-semibold text-scn-text-secondary group-hover:text-scn-primary flex items-center space-x-0.5">
                        <span>Ver más</span>
                        <ArrowRight size={10} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
}
