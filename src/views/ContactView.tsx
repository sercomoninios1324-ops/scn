import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Clock,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
} from 'lucide-react';
import { m as motion } from 'motion/react';
import VioletAurora from '../components/effects/VioletAurora';
import { useCatalog } from '../context/CatalogContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { useReducedMotion } from '../hooks/useReducedMotion';
import {
  buildWhatsAppUrl,
  formatWhatsAppDisplay,
  INSTAGRAM_URL,
  normalizeWhatsAppNumber,
} from '../lib/whatsapp';

export default function ContactView() {
  const { settings } = useCatalog();
  const reducedMotion = useReducedMotion();
  const number = normalizeWhatsAppNumber(settings.whatsapp_number);
  const display = formatWhatsAppDisplay(settings.whatsapp_number);
  const ig = settings.instagram_url || INSTAGRAM_URL;
  const wa = buildWhatsAppUrl(
    'Hola SCN! Quiero hacer una consulta desde el catálogo.',
    number
  );
  const telHref = `tel:+${number}`;
  const mailHref = `mailto:${settings.email}`;

  usePageMeta({
    title: 'Contacto | SCN — Bahía Blanca',
    description:
      'WhatsApp +54 9 291 522-4734, Instagram @somos_scn. Atención lunes a sábado 9 a 20, Bahía Blanca.',
    path: '/contacto',
  });

  const channels = [
    {
      key: 'wa',
      href: wa,
      external: true,
      icon: MessageCircle,
      title: 'WhatsApp',
      detail: display,
    },
    {
      key: 'phone',
      href: telHref,
      external: false,
      icon: Phone,
      title: 'Teléfono',
      detail: display,
    },
    {
      key: 'ig',
      href: ig,
      external: true,
      icon: Instagram,
      title: 'Instagram',
      detail: '@somos_scn',
    },
    {
      key: 'mail',
      href: mailHref,
      external: false,
      icon: Mail,
      title: 'Correo',
      detail: settings.email,
    },
  ];

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
                SCN · Bahía Blanca
              </p>
              <h1 className="font-display text-4xl font-extrabold tracking-tight text-scn-text-title sm:text-5xl md:text-[3.25rem]">
                Contacto
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-scn-text-normal sm:text-base">
                Dudas, stock o una compra: escribinos por los canales oficiales.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="relative bg-scn-bg-general py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="space-y-3 lg:col-span-7">
              {channels.map((ch, i) => (
                <motion.a
                  key={ch.key}
                  href={ch.href}
                  target={ch.external ? '_blank' : undefined}
                  rel={ch.external ? 'noopener noreferrer' : undefined}
                  initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.45,
                    delay: reducedMotion ? 0 : 0.05 * i,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="glass group flex items-center gap-4 rounded-2xl p-4 transition-transform hover:scale-[1.01] sm:p-5"
                >
                  <span className="scn-trust-icon flex h-12 w-12 shrink-0 items-center justify-center">
                    <ch.icon size={22} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-scn-text-title">{ch.title}</h2>
                    <p className="mt-0.5 break-all text-xs text-scn-text-normal sm:text-sm">
                      {ch.detail}
                    </p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="ml-auto shrink-0 text-scn-text-secondary transition-transform group-hover:translate-x-0.5 group-hover:text-[#6622CF]"
                  />
                </motion.a>
              ))}

              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#6622CF] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#6622CF]/30 transition-transform hover:scale-[1.02] sm:w-auto"
              >
                <MessageCircle size={18} />
                Escribinos por WhatsApp
              </a>
            </div>

            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: reducedMotion ? 0 : 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="space-y-8 lg:col-span-5"
            >
              <div className="scn-trust-pillar flex gap-4">
                <span className="scn-trust-icon flex h-12 w-12 shrink-0 items-center justify-center">
                  <Clock size={22} strokeWidth={1.75} />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-scn-text-title">Horarios</h2>
                  <p className="mt-2 text-sm leading-relaxed text-scn-text-normal">
                    Lunes a sábado: <strong className="text-scn-text-title">09:00 a 20:00</strong>
                    <br />
                    Domingos y Feriados: Guardias de consulta por WhatsApp.
                  </p>
                </div>
              </div>

              <div className="scn-trust-pillar flex gap-4">
                <span className="scn-trust-icon flex h-12 w-12 shrink-0 items-center justify-center">
                  <MapPin size={22} strokeWidth={1.75} />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-scn-text-title">Zona</h2>
                  <p className="mt-2 text-sm leading-relaxed text-scn-text-normal">
                    Bahía Blanca y envíos a todo el país.
                  </p>
                </div>
              </div>

              <div className="scn-trust-pillar flex gap-4">
                <span className="scn-trust-icon flex h-12 w-12 shrink-0 items-center justify-center">
                  <Sparkles size={22} strokeWidth={1.75} />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-scn-text-title">
                    Atención Personalizada
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-scn-text-normal">
                    Trabajamos con un stock rotativo constante. Si querés reservar un producto
                    destacado del catálogo, te aconsejamos confirmarlo por WhatsApp para apartarlo
                    de inmediato.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-scn-border/40 pt-6 text-xs font-semibold">
                <Link
                  to="/garantia"
                  className="text-scn-text-normal transition-colors hover:text-[#6622CF]"
                >
                  Garantía
                </Link>
                <Link
                  to="/condiciones"
                  className="text-scn-text-normal transition-colors hover:text-[#6622CF]"
                >
                  Condiciones
                </Link>
                <Link
                  to="/privacidad"
                  className="text-scn-text-normal transition-colors hover:text-[#6622CF]"
                >
                  Privacidad
                </Link>
                <Link
                  to="/nosotros"
                  className="text-scn-text-normal transition-colors hover:text-[#6622CF]"
                >
                  Nosotros
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
