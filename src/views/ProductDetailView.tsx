import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  MessageCircle,
  Minus,
  Plus,
  ShoppingCart,
} from 'lucide-react';
import { m as motion } from 'motion/react';
import { Product } from '../types';
import { safeJson } from '../lib/api';
import CatalogImage from '../components/CatalogImage';
import { useCatalog } from '../context/CatalogContext';
import { useCart } from '../context/CartContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { productJsonLd } from '../lib/seo';
import { trackProductView } from '../lib/analytics';
import { buildWhatsAppUrl, productWhatsAppMessage } from '../lib/whatsapp';
import {
  formatCategoryLabel,
  formatIncludeLabel,
  isRedundantInclude,
} from '../lib/formatCategory';
import VioletAurora from '../components/effects/VioletAurora';
import ProductCard, { isOnOffer } from '../components/ProductCard';

type ProductWithImages = Product & {
  images: { storage_path: string; is_cover: boolean }[];
  category?: { name: string };
};

export default function ProductDetailView() {
  const { slug = '' } = useParams();
  const { products, settings, isAdminLoggedIn } = useCatalog();
  const { items, addItem, setQty } = useCart();
  const reducedMotion = useReducedMotion();
  const [product, setProduct] = useState<ProductWithImages | null>(
    () => products.find((p) => p.slug === slug) ?? null
  );
  const [isLoading, setIsLoading] = useState(!product);
  const [activeImage, setActiveImage] = useState('');
  const [qtyDraft, setQtyDraft] = useState(1);
  const purchaseRef = useRef<HTMLDivElement>(null);
  const [showBuyBar, setShowBuyBar] = useState(false);

  // Barra fija (solo celular): aparece cuando el bloque de compra quedó arriba.
  useEffect(() => {
    const target = purchaseRef.current;
    if (!target) return undefined;
    const io = new IntersectionObserver(([entry]) => {
      setShowBuyBar(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    io.observe(target);
    return () => io.disconnect();
  }, [product?.id, isLoading]);

  // Mientras la barra está visible, reservamos su alto al final de la página para no tapar el footer.
  useEffect(() => {
    if (!showBuyBar || window.matchMedia('(min-width: 1024px)').matches) return undefined;
    const prev = document.body.style.paddingBottom;
    document.body.style.paddingBottom = 'calc(4.75rem + env(safe-area-inset-bottom, 0px))';
    document.body.classList.add('scn-buybar-on');
    return () => {
      document.body.style.paddingBottom = prev;
      document.body.classList.remove('scn-buybar-on');
    };
  }, [showBuyBar]);

  // Métrica: una vista por producto por día por navegador
  useEffect(() => {
    if (product?.id) trackProductView(product.id, isAdminLoggedIn);
  }, [product?.id, isAdminLoggedIn]);

  useEffect(() => {
    const fromList = products.find((p) => p.slug === slug);
    if (fromList) {
      setProduct(fromList);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetch(`/api/products/${encodeURIComponent(slug)}`)
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
  }, [slug, products]);

  useEffect(() => {
    if (!product) return;
    const cover =
      product.images.find((img) => img.is_cover)?.storage_path ||
      product.images[0]?.storage_path ||
      '';
    setActiveImage(cover);
  }, [product]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);

  const coverForMeta =
    product?.images.find((i) => i.is_cover)?.storage_path ||
    product?.images[0]?.storage_path;

  usePageMeta({
    title: product ? `${product.name} | SCN` : 'Producto | SCN',
    description: product
      ? product.short_description || product.description
      : 'Ficha de producto SCN',
    path: `/producto/${slug}`,
    ogImage: coverForMeta,
    noIndex: !isLoading && !product,
    jsonLd: product
      ? productJsonLd({
          name: product.name,
          description: product.short_description || product.description,
          slug: product.slug,
          price: product.price,
          currency: product.currency,
          image: coverForMeta,
          sku: product.sku,
          inStock: product.stock > 0,
        })
      : undefined,
  });

  const cartItem = product
    ? items.find((i) => i.productId === product.id)
    : undefined;
  const inCart = Boolean(cartItem);
  const displayQty = inCart && cartItem ? cartItem.qty : qtyDraft;

  useEffect(() => {
    if (!cartItem) setQtyDraft(1);
  }, [cartItem, product?.id]);

  if (isLoading) {
    return (
      <div className="page-enter mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center px-4">
        <div className="glass rounded-3xl px-10 py-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#6622CF] border-t-transparent" />
          <p className="mt-4 text-sm font-medium text-scn-text-normal">Cargando producto…</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="page-enter mx-auto max-w-7xl px-4 py-20 text-center">
        <div className="glass mx-auto max-w-md space-y-4 rounded-3xl p-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#6622CF]">
            SCN
          </p>
          <h2 className="font-display text-2xl font-extrabold text-scn-text-title">
            Producto no encontrado
          </h2>
          <p className="text-sm text-scn-text-normal">
            El producto no existe o ya no está disponible.
          </p>
          <Link
            to="/catalogo"
            className="inline-flex rounded-xl bg-[#6622CF] px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-[#6622CF]/30 transition-transform hover:scale-[1.02]"
          >
            Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  const relatedProducts = products
    .filter((p) => p.category_id === product.category_id && p.id !== product.id)
    .slice(0, 4);

  const waHref = buildWhatsAppUrl(
    productWhatsAppMessage({
      name: product.name,
      priceText: formatPrice(product.price),
      slug: product.slug,
    }),
    settings.whatsapp_number
  );

  const onOffer = isOnOffer(product);
  const shortDesc = product.short_description?.trim() || '';
  const longDesc = product.description?.trim() || '';
  const descriptionText =
    longDesc && shortDesc && longDesc !== shortDesc
      ? longDesc
      : longDesc || shortDesc || '';

  const includeItems = (Array.isArray(product.includes) ? product.includes : []).filter(
    (item) => !isRedundantInclude(item, product)
  );

  const bumpQty = (delta: number) => {
    if (inCart && cartItem) {
      setQty(product.id, cartItem.qty + delta);
      return;
    }
    setQtyDraft((q) => Math.max(1, q + delta));
  };

  const handleAddToCart = () => {
    if (inCart) return;
    const cover =
      product.images.find((img) => img.is_cover)?.storage_path ||
      product.images[0]?.storage_path;
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        cover,
      },
      qtyDraft
    );
  };

  const qtyStepper = (
    <div className="inline-flex items-center rounded-xl border border-scn-border/60 bg-white/55 dark:bg-white/8">
      <button
        type="button"
        aria-label="Menos cantidad"
        disabled={displayQty <= 1}
        onClick={() => bumpQty(-1)}
        className="flex h-11 w-11 cursor-pointer items-center justify-center text-scn-text-title disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Minus size={16} />
      </button>
      <span className="min-w-[2.25rem] text-center text-sm font-bold tabular-nums text-scn-text-title">
        {displayQty}
      </span>
      <button
        type="button"
        aria-label="Más cantidad"
        onClick={() => bumpQty(1)}
        className="flex h-11 w-11 cursor-pointer items-center justify-center text-scn-text-title"
      >
        <Plus size={16} />
      </button>
    </div>
  );

  const purchaseBlock = (
    <div className="space-y-3">
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-[#6622CF] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#6622CF]/30 transition-transform hover:scale-[1.01]"
      >
        <MessageCircle size={18} />
        Comprar por WhatsApp
      </a>
      <div className="flex flex-wrap items-center gap-2">
        {qtyStepper}
        {inCart ? (
          <Link
            to="/carrito"
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-scn-border/70 bg-white/55 px-4 py-2.5 text-xs font-semibold text-scn-text-title backdrop-blur-sm dark:bg-white/8 sm:text-sm"
          >
            <ShoppingCart size={16} />
            Ver carrito ({displayQty})
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleAddToCart}
            className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-scn-border/70 bg-white/55 px-4 py-2.5 text-xs font-semibold text-scn-text-title backdrop-blur-sm dark:bg-white/8 sm:text-sm"
          >
            <ShoppingCart size={16} />
            Agregar al carrito
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="page-enter pb-10 md:pb-16">
      <section className="relative -mt-16 overflow-hidden pt-16">
        <div className="relative">
          <VioletAurora />
          <div className="relative z-10 mx-auto max-w-7xl px-4 pb-3 pt-5 sm:px-6 sm:pb-8 sm:pt-16 lg:px-8">
            <Link
              to="/catalogo"
              className="-my-2 inline-flex items-center gap-1.5 py-2 text-xs font-semibold text-scn-text-secondary transition-colors hover:text-[#6622CF]"
            >
              <ArrowLeft size={14} />
              Volver al catálogo
            </Link>
          </div>
        </div>
      </section>

      <section className="relative bg-scn-bg-general pb-12 pt-2 md:pb-16 md:pt-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-10 lg:gap-y-8">
            <div className="space-y-3 lg:col-span-6 lg:row-span-2">
              <div className="glass relative aspect-square max-h-[min(70vw,420px)] w-full overflow-hidden rounded-2xl lg:max-h-none">
                {activeImage ? (
                  <CatalogImage
                    src={activeImage}
                    width={960}
                    srcSetWidths={[480, 640, 960, 1280]}
                    sizes="(min-width: 1280px) 600px, (min-width: 1024px) 48vw, 100vw"
                    alt={product.name}
                    decoding="async"
                    fetchPriority="high"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-scn-text-secondary">
                    Sin imagen
                  </div>
                )}
                {product.stock === 0 ? (
                  <span className="absolute top-3 left-3 rounded-lg bg-rose-500 px-3 py-1 text-xs font-semibold text-white shadow-md">
                    Sin stock
                  </span>
                ) : null}
                {onOffer ? (
                  <span className="absolute top-3 right-3 rounded-lg bg-[#6622CF] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md shadow-[#6622CF]/30">
                    Oferta
                  </span>
                ) : null}
              </div>

              {product.images.length > 1 ? (
                <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                  {product.images.map((img) => (
                    <button
                      type="button"
                      key={img.storage_path}
                      onClick={() => setActiveImage(img.storage_path)}
                      aria-label={`Ver foto ${product.images.indexOf(img) + 1} de ${product.images.length}`}
                      aria-pressed={activeImage === img.storage_path}
                      className={`relative aspect-square h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 transition-colors sm:h-16 sm:w-16 ${
                        activeImage === img.storage_path
                          ? 'border-[#6622CF]'
                          : 'border-scn-border/50 hover:border-[#6622CF]/40'
                      }`}
                    >
                      <CatalogImage
                        src={img.storage_path}
                        width={160}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-5 lg:col-span-6">
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                {product.category ? (
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#6622CF]">
                    {formatCategoryLabel(product.category.name)}
                  </p>
                ) : (
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#6622CF]">
                    SCN · Producto
                  </p>
                )}
                <h1 className="font-display text-2xl font-extrabold tracking-tight text-scn-text-title sm:text-3xl lg:text-4xl">
                  {product.name}
                </h1>
                <p className="mt-2 text-xs font-medium text-scn-text-secondary">
                  SKU: <span className="font-mono">{product.sku || 'N/D'}</span>
                </p>
              </motion.div>

              {descriptionText ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-scn-text-normal sm:text-[15px]">
                  {descriptionText}
                </p>
              ) : null}

              <div className="glass rounded-2xl p-4 sm:p-5">
                <p className="text-[11px] font-medium text-scn-text-secondary">
                  Precio final · efectivo / transferencia
                </p>
                {onOffer && product.compare_at_price != null ? (
                  <p className="mt-1.5 font-sans text-sm text-scn-text-secondary line-through opacity-70">
                    {formatPrice(product.compare_at_price)}
                  </p>
                ) : null}
                <p className="mt-0.5 font-display text-3xl font-extrabold tracking-tight text-[#6622CF] sm:text-4xl">
                  {formatPrice(product.price)}
                </p>
              </div>

              <div ref={purchaseRef} className="border-t border-scn-border/40 pt-4">
                {purchaseBlock}
              </div>

              {includeItems.length > 0 ? (
                <div className="space-y-3">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6622CF]">
                    ¿Qué incluye?
                  </h2>
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {includeItems.map((item, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-scn-text-normal"
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                          <Check size={12} strokeWidth={2.5} />
                        </span>
                        <span className="text-xs font-medium leading-snug">
                          {formatIncludeLabel(item)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 ? (
        <section className="scn-trust relative overflow-hidden py-12 md:py-16">
          <div className="scn-trust-glow" aria-hidden />
          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#6622CF]">
              Seguí mirando
            </p>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-scn-text-title sm:text-3xl">
              {product.category
                ? `Más de ${formatCategoryLabel(product.category.name)}`
                : 'También te puede gustar'}
            </h2>
            <p className="mt-1 text-sm text-scn-text-normal">
              Otras piezas que combinan con lo que estás viendo.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} layout="grid" />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div
        className={`scn-buybar fixed inset-x-0 bottom-0 z-40 px-4 pt-3 transition-transform duration-300 lg:hidden ${
          showBuyBar ? 'translate-y-0' : 'pointer-events-none translate-y-full'
        }`}
        aria-hidden={!showBuyBar}
      >
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-scn-text-title">{product.name}</p>
            <p className="font-display text-lg font-extrabold leading-tight text-[#6622CF] dark:text-[#b794f6]">
              {formatPrice(product.price)}
            </p>
          </div>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={showBuyBar ? 0 : -1}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#6622CF] px-4 text-sm font-semibold text-white shadow-lg shadow-[#6622CF]/30 active:scale-[0.98]"
          >
            <MessageCircle size={17} />
            Comprar
          </a>
        </div>
      </div>
    </div>
  );
}
