import { Link } from 'react-router-dom';
import { Instagram, Mail, MessageCircle, Phone } from 'lucide-react';
import { SiteSettings } from '../types';
import { ScnLogo } from './ScnLogo';
import {
  buildWhatsAppUrl,
  formatWhatsAppDisplay,
  INSTAGRAM_URL,
  normalizeWhatsAppNumber,
} from '../lib/whatsapp';

interface FooterProps {
  settings: SiteSettings;
}

export default function Footer({ settings }: FooterProps) {
  const formattedWhatsapp = formatWhatsAppDisplay(settings.whatsapp_number);
  const ig = settings.instagram_url || INSTAGRAM_URL;
  const waNumber = settings.whatsapp_number || '5492915224734';
  const waHref = buildWhatsAppUrl(
    'Hola SCN! Vine desde la web y quiero hacer una consulta.',
    waNumber,
  );
  const telHref = `tel:+${normalizeWhatsAppNumber(waNumber)}`;
  const mailHref = `mailto:${settings.email}`;
  const contactLinkClass =
    'text-scn-text-normal transition-colors hover:text-[#6622CF]';

  return (
    <footer className="scn-footer relative overflow-hidden">
      <div className="scn-footer-glow" aria-hidden />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 md:py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-5 space-y-5">
            <div className="flex items-center gap-3">
              <ScnLogo size={36} />
              <span className="font-display text-lg font-bold tracking-tight text-scn-text-title">
                SCN — Seamos como niños
              </span>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-scn-text-normal">
              Tecnología en Bahía Blanca con la curiosidad de cuando éramos chicos. Asesoramiento
              humano, garantía real e importación legal.
            </p>
            <div className="flex justify-center gap-2.5 pt-1 md:justify-start">
              <a
                href={ig}
                target="_blank"
                rel="noopener noreferrer"
                className="scn-trust-icon flex h-11 w-11 items-center justify-center"
                aria-label="Instagram"
              >
                <Instagram size={18} strokeWidth={1.75} />
              </a>
              <a
                href={`mailto:${settings.email}`}
                className="scn-trust-icon flex h-11 w-11 items-center justify-center"
                aria-label="Email"
              >
                <Mail size={18} strokeWidth={1.75} />
              </a>
            </div>
          </div>

          <div className="text-center md:col-span-3 md:text-left">
            <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#6622CF]">
              Navegación
            </h3>
            <ul className="space-y-0.5 text-sm font-medium md:space-y-2.5">
              {[
                ['/', 'Inicio'],
                ['/catalogo', 'Catálogo'],
                ['/como-comprar', 'Cómo comprar'],
                ['/nosotros', 'Nosotros'],
                ['/contacto', 'Contacto'],
              ].map(([to, label]) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="inline-block py-2 text-scn-text-normal transition-colors hover:text-[#6622CF] md:py-0"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4">
            <h3 className="mb-4 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-[#6622CF] md:text-left">
              Atención
            </h3>
            <ul className="space-y-3.5 text-sm">
              <li className="flex items-center gap-3">
                <a
                  href={telHref}
                  className="scn-trust-icon flex h-10 w-10 shrink-0 items-center justify-center"
                  aria-label="Llamar"
                >
                  <Phone size={18} strokeWidth={1.75} />
                </a>
                <a href={telHref} className={contactLinkClass}>
                  {formattedWhatsapp}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <a
                  href={mailHref}
                  className="scn-trust-icon flex h-10 w-10 shrink-0 items-center justify-center"
                  aria-label="Enviar email"
                >
                  <Mail size={18} strokeWidth={1.75} />
                </a>
                <a href={mailHref} className={`break-all ${contactLinkClass}`}>
                  {settings.email}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="scn-trust-icon flex h-10 w-10 shrink-0 items-center justify-center"
                  aria-label="WhatsApp"
                >
                  <MessageCircle size={18} strokeWidth={1.75} />
                </a>
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={contactLinkClass}
                >
                  WhatsApp
                </a>
              </li>
            </ul>
            <ul className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-0 text-xs text-scn-text-secondary md:justify-start md:gap-y-2">
              <li>
                <Link to="/garantia" className="inline-block py-2 transition-colors hover:text-[#6622CF] md:py-0">
                  Garantía
                </Link>
              </li>
              <li>
                <Link to="/condiciones" className="inline-block py-2 transition-colors hover:text-[#6622CF] md:py-0">
                  Condiciones de compra
                </Link>
              </li>
              <li>
                <Link to="/privacidad" className="inline-block py-2 transition-colors hover:text-[#6622CF] md:py-0">
                  Privacidad
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="scn-footer-bar mt-12 flex flex-col items-center justify-between gap-3 pt-6 text-center text-xs text-scn-text-secondary sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} SCN — Seamos como niños.</p>
          <p>
            Página web desarrollada por{' '}
            <a
              href="https://enlacesur.com.ar"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#6622CF] transition-colors hover:text-[#7A39D7]"
            >
              Enlace Sur
            </a>
          </p>
          <p className="inline-flex items-center gap-1.5">
            Bahía Blanca, Argentina
            <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden className="rounded-[1px]">
              <rect width="16" height="4" y="0" fill="#74ACDF" />
              <rect width="16" height="4" y="4" fill="#FFFFFF" />
              <rect width="16" height="4" y="8" fill="#74ACDF" />
              <circle cx="8" cy="6" r="1.35" fill="#F6B40E" />
            </svg>
          </p>
        </div>
      </div>
    </footer>
  );
}
