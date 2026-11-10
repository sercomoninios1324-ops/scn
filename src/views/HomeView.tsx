import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, ShieldCheck, Truck, MessageCircle } from 'lucide-react';
import { m as motion } from 'motion/react';
import ProductCarousel from '../components/ProductCarousel';
import VioletAurora from '../components/effects/VioletAurora';

import HeroPushCard from '../components/HeroPushCard';
import { useRaffle } from '../context/RaffleContext';

const RaffleHomeSection = lazy(() => import('../components/raffle/RaffleHomeSection'));
import { useCatalog, type CatalogProduct } from '../context/CatalogContext';
import { useIsDark } from '../hooks/useIsDark';
import { usePageMeta } from '../hooks/usePageMeta';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useEffectsReady } from '../lib/effects';
import { productCover, resolvePushProduct } from '../lib/dailyPush';
import { localBusinessJsonLd } from '../lib/seo';
import logoSrc from '../assets/scn-logo-192.webp';
// Textura detallada para el rayo (se baja recién cuando arrancan los efectos)
import logoTexture from '../assets/scn-logo-alpha.png';

// WebGL (ogl): se baja aparte para no frenar el primer render.
const ElectricLogo = lazy(() => import('../components/ElectricLogo'));

export default function HomeView() {
  const { products, settings, isLoading } = useCatalog();
  const { raffle } = useRaffle();
  const reducedMotion = useReducedMotion();
  const effectsReady = useEffectsReady();
  const isDark = useIsDark();
  const [pushProduct, setPushProduct] = useState<CatalogProduct | null>(null);
  const [wideHero, setWideHero] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 480px)').matches
  );

  const heroTitle = 'SEAMOS COMO NIÑOS';
  const heroClaim =
    settings.hero_subtitle ||
    'Tu catálogo de tecnología favorito. Los mejores dispositivos y accesorios electrónicos, listos para tu hogar o regalo, con asesoría personalizada directa por WhatsApp.';

  const scrollToDestacados = () => {
    document.getElementById('destacados')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  usePageMeta({
    title: 'SCN — Seamos como niños | Tecnología en Bahía Blanca',
    description:
      'Catálogo de tecnología y electrónica en Bahía Blanca. Celulares, notebooks, auriculares y accesorios con asesoramiento por WhatsApp.',
    path: '/',
    jsonLd: localBusinessJsonLd(),
  });

  useEffect(() => {
    if (!products.length) {
      setPushProduct(null);
      return;
    }
    setPushProduct(resolvePushProduct(products));
  }, [products]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 480px)');
    const sync = () => setWideHero(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const featured = products.filter((p) => p.is_featured && p.is_active);
  const pushCover = productCover(pushProduct);
  const showProduct = !!pushProduct && !!pushCover;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);

  return (
    <div>
      <section className="relative min-h-[100svh] overflow-hidden -mt-16 pt-16 min-[480px]:h-[100svh] min-[480px]:min-h-[560px] min-[480px]:max-h-[1100px]">
        <VioletAurora />

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-7xl flex-col px-4 pt-4 pb-10 sm:px-6 min-[480px]:min-h-0 min-[480px]:h-full min-[480px]:flex-row min-[480px]:items-center min-[480px]:pt-0 min-[480px]:pb-0 lg:px-8">
          <div
            className={`relative z-10 flex w-full flex-col items-center text-center min-[480px]:items-start min-[480px]:text-left ${
              showProduct
                ? 'min-[480px]:max-w-[min(36rem,calc(100%-min(42vw,380px)-2rem))]'
                : 'max-w-xl'
            }`}
          >
            <div className="flex flex-col items-center gap-2 text-center min-[480px]:items-start min-[480px]:text-left sm:gap-4">
              <div
                className="relative h-[88px] w-[88px] sm:h-[150px] sm:w-[150px] min-[480px]:-ml-3 scn-electric-logo"
                role="img"
                aria-label="SCN"
              >
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt=""
                    width={150}
                    height={150}
                    className="absolute inset-0 m-auto h-[48%] w-[48%] object-contain select-none opacity-100"
                    draggable={false}
                  />
                ) : null}
                {logoSrc && effectsReady ? (
                  <Suspense fallback={null}>
                  <ElectricLogo
                    src={logoTexture}
                    color={isDark ? '#e0c8ff' : '#6622CF'}
                    glowColor={isDark ? '#8b5cf6' : '#9468D4'}
                    scale={0.48}
                    intensity={1.05}
                    glow={0.7}
                    thickness={1.35}
                    strands={3}
                    bend={0.55}
                    crackle={1.4}
                    arcs={0.95}
                    flicker={0.5}
                    fill={0}
                    speed={2.4}
                    interactive
                    theme={isDark ? 'dark' : 'light'}
                    className="absolute inset-0 h-full w-full"
                  />
                  </Suspense>
                ) : null}
              </div>
              <h1 className="font-display text-[1.35rem] sm:text-3xl lg:text-[2.35rem] font-bold uppercase tracking-[0.1em] sm:tracking-[0.12em] leading-tight whitespace-nowrap text-scn-text-title dark:text-white">
                {heroTitle}
              </h1>
            </div>

            <div className="mt-2.5 flex w-full flex-col items-center gap-3 text-center min-[480px]:items-start min-[480px]:text-left sm:mt-6 sm:gap-5">
              <p className="max-w-xl text-sm sm:text-base leading-relaxed tracking-wide text-scn-text-normal dark:text-white/85">
                {heroClaim}
              </p>

              <div className="flex w-full max-w-sm flex-col gap-2 min-[480px]:max-w-none sm:flex-row sm:items-start sm:gap-3">
                <Link
                  to="/catalogo"
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#6622CF] px-5 py-2.5 text-sm sm:px-6 sm:py-3.5 sm:text-base font-semibold text-white shadow-lg shadow-[#6622CF]/30 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Explorar catálogo
                  <ArrowRight size={18} />
                </Link>
                <Link
                  to="/como-comprar"
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-scn-border/70 bg-white/55 px-5 py-2.5 text-sm sm:px-6 sm:py-3.5 sm:text-base font-semibold text-scn-text-title backdrop-blur-sm transition-colors hover:bg-white/80 dark:border-white/20 dark:bg-white/8 dark:text-white/95 dark:hover:bg-white/14"
                >
                  Cómo comprar
                </Link>
              </div>
            </div>
          </div>

          {showProduct && pushProduct && pushCover && !wideHero ? (
            <div className="flex flex-1 items-center justify-center pt-5 pb-2">
              <div className="w-full max-w-[340px]">
                <HeroPushCard
                  product={pushProduct}
                  cover={pushCover}
                  formatPrice={formatPrice}
                  compact
                />
              </div>
            </div>
          ) : !wideHero ? (
            <div className="flex-1" aria-hidden />
          ) : null}

          {showProduct && pushProduct && pushCover && wideHero ? (
            <div className="pointer-events-auto absolute right-3 sm:right-6 lg:right-10 top-1/2 z-20 w-[min(44vw,360px)] -translate-y-1/2">
              <HeroPushCard product={pushProduct} cover={pushCover} formatPrice={formatPrice} />
            </div>
          ) : null}

          <button
            type="button"
            onClick={scrollToDestacados}
            className="relative z-30 mt-2 flex flex-col items-center gap-1 self-center py-1 text-center text-scn-text-secondary transition-colors hover:text-scn-text-title cursor-pointer dark:text-white/75 dark:hover:text-white min-[480px]:absolute min-[480px]:bottom-5 min-[480px]:left-1/2 min-[480px]:mt-0 min-[480px]:-translate-x-1/2"
            aria-label="Seguí descubriendo más productos"
          >
            <span className="text-[10px] font-semibold tracking-[0.16em] uppercase sm:text-[11px]">
              Seguí descubriendo
            </span>
            <ChevronDown size={18} className="scn-explore-more" strokeWidth={2.25} />
          </button>
        </div>
      </section>

      {raffle ? (
        <Suspense fallback={null}>
          <RaffleHomeSection />
        </Suspense>
      ) : null}

      <section id="destacados" className="relative py-10 md:py-14 bg-scn-bg-general scroll-mt-20">
        <ProductCarousel products={featured} isLoading={isLoading} />
      </section>

      <section className="scn-trust relative overflow-hidden py-16 pb-20 md:py-24 md:pb-28">
        <div className="scn-trust-glow" aria-hidden />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-2xl text-center"
          >
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#6622CF]">
              Cómo trabajamos
            </p>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-scn-text-title sm:text-4xl md:text-[2.75rem]">
              Tecnología con trato humano
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-scn-text-normal sm:text-base">
              En SCN no vendemos cajas: te asesoramos por WhatsApp, chequeamos lo que llega y
              coordinamos entrega en Bahía Blanca.
            </p>
          </motion.div>

          <ul className="mt-12 grid gap-8 sm:mt-16 sm:grid-cols-3 sm:gap-6 lg:gap-10">
            {[
              {
                icon: ShieldCheck,
                title: 'Garantía real',
                text: 'Productos chequeados e importados de forma legal. Si falla, lo resolvemos.',
              },
              {
                icon: Truck,
                title: 'Envíos coordinados',
                text: 'A domicilio o punto de encuentro en la zona.',
              },
              {
                icon: MessageCircle,
                title: 'WhatsApp directo',
                text: 'Hablás con nosotros. Elegís, consultás y pagás como te quede cómodo.',
              },
            ].map((item, i) => (
              <motion.li
                key={item.title}
                initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: reducedMotion ? 0 : 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
                className="scn-trust-pillar group text-center sm:text-left"
              >
                <span className="scn-trust-icon mx-auto mb-4 flex h-12 w-12 items-center justify-center sm:mx-0">
                  <item.icon size={22} strokeWidth={1.75} />
                </span>
                <h3 className="font-display text-lg font-bold tracking-wide text-scn-text-title sm:text-xl">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-scn-text-normal">{item.text}</p>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

    </div>
  );
}
