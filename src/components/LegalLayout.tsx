import { Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { m as motion } from 'motion/react';
import VioletAurora from './effects/VioletAurora';
import { useReducedMotion } from '../hooks/useReducedMotion';

const tabs = [
  { to: '/garantia', label: 'Garantía' },
  { to: '/condiciones', label: 'Condiciones de compra' },
  { to: '/privacidad', label: 'Privacidad' },
] as const;

const copy: Record<string, { title: string; lead: string }> = {
  '/garantia': {
    title: 'Garantía',
    lead: 'Prueba de 30 días ante falla de fábrica y soporte posventa por WhatsApp.',
  },
  '/condiciones': {
    title: 'Condiciones de compra',
    lead: 'Precios, pagos, stock, envíos y cómo se cierra un pedido con SCN.',
  },
  '/privacidad': {
    title: 'Privacidad',
    lead: 'Qué datos usamos cuando nos escribís por WhatsApp o correo, y para qué los usamos.',
  },
};

export default function LegalLayout() {
  const { pathname } = useLocation();
  const reducedMotion = useReducedMotion();
  const meta = copy[pathname] ?? copy['/garantia'];

  return (
    <div className="page-enter">
      <section className="relative -mt-16 overflow-hidden pt-16">
        <div className="relative min-h-[200px] sm:min-h-[240px]">
          <VioletAurora />
          <div className="relative z-10 mx-auto flex max-w-7xl flex-col justify-end px-4 pb-8 pt-20 sm:px-6 sm:pb-10 sm:pt-24 lg:px-8">
            <motion.div
              key={pathname}
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-2xl"
            >
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#6622CF]">
                SCN · Políticas
              </p>
              <h1 className="font-display text-4xl font-extrabold tracking-tight text-scn-text-title sm:text-5xl md:text-[3.25rem]">
                {meta.title}
              </h1>
              <p className="mt-3 min-h-[2.75rem] max-w-lg text-sm leading-relaxed text-scn-text-normal sm:min-h-[3.25rem] sm:text-base">
                {meta.lead}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <nav
          aria-label="Políticas SCN"
          className="flex gap-1 overflow-x-auto border-b border-scn-border/50 pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                [
                  'shrink-0 px-3 py-3 text-sm font-semibold transition-colors sm:px-4',
                  isActive
                    ? 'border-b-2 border-[#6622CF] text-[#6622CF]'
                    : 'border-b-2 border-transparent text-scn-text-normal hover:text-scn-text-title',
                ].join(' ')
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Altura mínima compartida: el footer no salta al cambiar de pestaña */}
      <div className="mx-auto min-h-[32rem] max-w-3xl px-4 pb-20 pt-10 sm:min-h-[36rem] sm:px-6 lg:px-8">
        <Suspense fallback={<div className="min-h-[40vh]" aria-busy="true" />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}
