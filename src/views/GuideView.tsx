import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Box,
  ChevronDown,
  CreditCard,
  MessageCircle,
  Search,
  Send,
} from 'lucide-react';
import { AnimatePresence, m as motion } from 'motion/react';
import { useCatalog } from '../context/CatalogContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { buildWhatsAppUrl } from '../lib/whatsapp';
import VioletAurora from '../components/effects/VioletAurora';

interface FAQItem {
  id: string;
  q: string;
  a: string;
}

const steps = [
  {
    num: '01',
    title: 'Elegí tu producto',
    desc: 'Navegá por nuestro catálogo, filtrá por categorías o buscá tu dispositivo favorito. Cada producto tiene fotos reales, descripciones detalladas y el precio final de catálogo.',
    icon: Search,
  },
  {
    num: '02',
    title: 'Armá el carrito o escribinos',
    desc: 'Podés agregar varios productos al carrito y mandarnos todo junto por WhatsApp, o comprar directo desde la ficha de un producto. En ambos casos se abre WhatsApp con el mensaje ya armado. ¡Más fácil imposible!',
    icon: Send,
  },
  {
    num: '03',
    title: 'Coordinamos pago y entrega',
    desc: 'Aceptamos efectivo, transferencia bancaria y Mercado Pago. Para transferir usá nuestro alias: somos.scn — una vez realizado el pago, envianos el comprobante por WhatsApp para confirmar tu pedido.',
    icon: CreditCard,
  },
  {
    num: '04',
    title: '¡Lo recibís y disfrutas!',
    desc: 'Hacemos entregas ultra rápidas y seguras. Podés retirar tu producto de forma presencial o te lo mandamos directo a tu casa. Tu dispositivo llega listo para encender y usar.',
    icon: Box,
  },
];

const faqs: FAQItem[] = [
  {
    id: 'faq-1',
    q: '¿Qué medios de pago aceptan?',
    a: 'Aceptamos efectivo al momento de la entrega, transferencia bancaria y Mercado Pago (dinero en cuenta). Para transferir o pagar por Mercado Pago, usá nuestro alias: somos.scn — Una vez realizado el pago, envianos el comprobante por WhatsApp para confirmar tu pedido. Todos los precios del catálogo corresponden al pago por estos medios.',
  },
  {
    id: 'faq-2',
    q: '¿Hacen envíos a domicilio?',
    a: 'Sí, hacemos envíos a todo el país por Correo Argentino. En Bahía Blanca coordinamos entrega en moto o punto de encuentro que acordamos por WhatsApp.',
  },
  {
    id: 'faq-3',
    q: '¿Los productos tienen garantía?',
    a: '¡Por supuesto! En SCN garantizamos la calidad de todo lo que vendemos. Todos nuestros productos cuentan con una garantía de prueba de 30 días corridos ante cualquier falla de fábrica. Además, brindamos soporte posventa directo para ayudarte con la configuración inicial.',
  },
  {
    id: 'faq-4',
    q: '¿Tienen local físico para ir a ver los productos?',
    a: 'Operamos de forma 100% online y como catálogo digital. Esto nos permite ahorrar costos de estructura y ofrecerte los mejores precios del mercado en electrónica. Realizamos entregas presenciales en puntos estratégicos seguros de la ciudad, coordinando día y horario.',
  },
  {
    id: 'faq-5',
    q: '¿Se puede encargar un producto que no está en el catálogo?',
    a: '¡Sí! Si estás buscando un dispositivo, auricular, funda o accesorio específico que no ves listado, escribinos directamente por WhatsApp. Trabajamos con importadores directos y podemos traerte modelos específicos a pedido.',
  },
];

export default function GuideView() {
  const { settings } = useCatalog();
  const reducedMotion = useReducedMotion();
  const [openFaq, setOpenFaq] = useState<string | null>('faq-1');

  usePageMeta({
    title: 'Cómo comprar | SCN',
    description:
      'Guía de compra SCN: elegí en el catálogo, armá el carrito o comprá por WhatsApp, coordinamos pago y entrega.',
    path: '/como-comprar',
  });

  const waHref = buildWhatsAppUrl(
    'Hola SCN! Quiero saber cómo comprar / hacer una consulta.',
    settings.whatsapp_number
  );

  return (
    <div className="page-enter">
      <section className="relative -mt-16 overflow-hidden pt-16">
        <div className="relative min-h-[220px] sm:min-h-[260px]">
          <VioletAurora />
          <div className="relative z-10 mx-auto flex max-w-7xl flex-col justify-end px-4 pb-10 pt-20 sm:px-6 sm:pb-12 sm:pt-24 lg:px-8">
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-2xl"
            >
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#6622CF]">
                SCN · Guía
              </p>
              <h1 className="font-display text-4xl font-extrabold tracking-tight text-scn-text-title sm:text-5xl md:text-[3.25rem]">
                Cómo comprar
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-scn-text-normal sm:text-base">
                Cuatro pasos. Armás el carrito o vas producto por producto, nos escribís por
                WhatsApp y coordinamos como de palabra.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="relative bg-scn-bg-general py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ol className="grid gap-8 sm:grid-cols-2 lg:gap-10">
            {steps.map((step, i) => (
              <motion.li
                key={step.num}
                initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{
                  duration: 0.5,
                  delay: reducedMotion ? 0 : 0.06 * i,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="scn-trust-pillar group flex gap-4 sm:gap-5"
              >
                <span className="scn-trust-icon flex h-12 w-12 shrink-0 items-center justify-center">
                  <step.icon size={22} strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-xs font-bold tracking-[0.2em] text-[#6622CF]">
                    {step.num}
                  </p>
                  <h2 className="mt-1 font-display text-lg font-bold tracking-wide text-scn-text-title sm:text-xl">
                    {step.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-scn-text-normal">
                    {step.desc}
                  </p>
                </div>
              </motion.li>
            ))}
          </ol>

          <div className="mt-10 flex flex-col gap-3 sm:mt-12 sm:flex-row sm:items-center">
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
          </div>
        </div>
      </section>

      <section className="scn-trust relative overflow-hidden py-14 md:py-20">
        <div className="scn-trust-glow" aria-hidden />
        <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8 text-center md:mb-10"
          >
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#6622CF]">
              Dudas
            </p>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-scn-text-title sm:text-3xl">
              Preguntas frecuentes
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-scn-text-normal">
              ¿Tenés alguna consulta puntual? Revisá nuestras respuestas rápidas sobre envíos,
              garantías y pagos.
            </p>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq) => {
              const isOpen = openFaq === faq.id;
              return (
                <div
                  key={faq.id}
                  className="glass overflow-hidden rounded-2xl"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenFaq((prev) => (prev === faq.id ? null : faq.id))
                    }
                    aria-expanded={isOpen}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-4 text-left sm:px-5"
                  >
                    <span className="text-sm font-semibold text-scn-text-title">
                      {faq.q}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="shrink-0 text-scn-text-secondary"
                    >
                      <ChevronDown size={18} />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div
                        key="answer"
                        initial={
                          reducedMotion
                            ? { opacity: 1 }
                            : { height: 0, opacity: 0 }
                        }
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={
                          reducedMotion
                            ? { opacity: 0 }
                            : { height: 0, opacity: 0 }
                        }
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="border-t border-scn-border/50 px-4 py-4 text-sm leading-relaxed text-scn-text-normal sm:px-5">
                          {faq.a}
                        </p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
