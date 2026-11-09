import { Link } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { m as motion } from 'motion/react';

import VioletAurora from '../components/effects/VioletAurora';
import { useCatalog } from '../context/CatalogContext';
import { useIsDark } from '../hooks/useIsDark';
import { usePageMeta } from '../hooks/usePageMeta';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useEffectsReady } from '../lib/effects';
import { buildWhatsAppUrl } from '../lib/whatsapp';
import logoSrc from '../assets/scn-logo-192.webp';
// Textura detallada para el rayo (se baja recién cuando arrancan los efectos)
import logoTexture from '../assets/scn-logo-alpha.png';

// WebGL (ogl): se baja aparte para no frenar el primer render.
const ElectricLogo = lazy(() => import('../components/ElectricLogo'));

export default function AboutView() {
  const { settings } = useCatalog();
  const reducedMotion = useReducedMotion();
  const effectsReady = useEffectsReady();
  const isDark = useIsDark();

  usePageMeta({
    title: 'Nosotros | SCN — Seamos como niños',
    description:
      'SCN es tecnología en Bahía Blanca con asesoramiento humano, garantía real e importación legal. Seamos como niños.',
    path: '/nosotros',
  });

  const waHref = buildWhatsAppUrl(
    'Hola SCN! Quiero hacer una consulta.',
    settings.whatsapp_number
  );

  return (
    <div className="page-enter">
      <section className="relative -mt-16 overflow-hidden pt-16">
        <div className="relative min-h-[320px] sm:min-h-[380px]">
          <VioletAurora />
          <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-4 pb-12 pt-16 text-center sm:px-6 sm:pb-14 sm:pt-20 lg:px-8">
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center"
            >
              <div
                className="scn-electric-logo relative mb-4 h-[100px] w-[100px] sm:mb-5 sm:h-[140px] sm:w-[140px]"
                role="img"
                aria-label="SCN"
              >
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt=""
                    width={140}
                    height={140}
                    className="absolute inset-0 m-auto h-[48%] w-[48%] select-none object-contain opacity-100"
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

              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#6622CF]">
                SCN · Bahía Blanca
              </p>
              <h1 className="font-display text-4xl font-extrabold tracking-tight text-scn-text-title sm:text-5xl md:text-[3.25rem]">
                Seamos como niños
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-scn-text-normal sm:text-base">
                Creemos que la tecnología tiene que encender la misma curiosidad y alegría que
                sentíamos de chicos. Por eso SCN no es un marketplace anónimo: es un catálogo de
                Bahía Blanca donde te atendemos nosotros por WhatsApp.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="relative bg-scn-bg-general py-12 md:py-16">
        <div className="mx-auto max-w-3xl space-y-6 px-4 text-scn-text-normal sm:px-6 lg:px-8">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6 text-sm leading-relaxed sm:text-base"
          >
            <p>
              Elegís el producto, abrís la ficha y nos escribís. Coordinamos pago (efectivo,
              transferencia o Mercado Pago) y entrega. Sin formularios eternos, sin bots, con
              garantía e importación legal.
            </p>
            <p>
              Operamos online para mantener precios honestos. Las entregas en la ciudad las
              acordamos punto a punto; al resto del país enviamos por correo.
            </p>
          </motion.div>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center">
            <Link
              to="/catalogo"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6622CF] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#6622CF]/30 transition-transform hover:scale-[1.02]"
            >
              Ver todo el catálogo
              <ArrowRight size={16} strokeWidth={2.25} />
            </Link>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-scn-border/70 bg-white/55 px-6 py-3.5 text-sm font-semibold text-scn-text-title backdrop-blur-sm transition-transform hover:scale-[1.02] dark:bg-white/8"
            >
              <MessageCircle size={18} />
              Escribinos por WhatsApp
            </a>
            <Link
              to="/contacto"
              className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-scn-text-secondary transition-colors hover:text-[#6622CF] sm:ml-1"
            >
              Contacto
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
