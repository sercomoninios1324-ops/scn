/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MessageSquare, Instagram, Mail, Clock, MapPin, Sparkles, PhoneCall } from 'lucide-react';
import { SiteSettings } from '../types';

interface ContactViewProps {
  settings: SiteSettings;
}

export default function ContactView({ settings }: ContactViewProps) {
  const whatsappNumber = settings.whatsapp_number || '2915224734';
  const cleanedNumber = whatsappNumber.replace(/[^\d]/g, '');
  const formattedNumber = whatsappNumber.startsWith('+') ? whatsappNumber : `+${whatsappNumber}`;

  return (
    <div id="contact-view" className="page-enter mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-20 pt-8 space-y-12">
      
      {/* Title */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="inline-flex items-center space-x-1 rounded-full bg-scn-primary/10 px-3 py-1 text-xs font-semibold text-scn-text-title">
          <Sparkles size={12} className="text-scn-primary" />
          <span>ESTAMOS PARA AYUDARTE</span>
        </span>
        <h1 id="contact-title" className="font-display text-3xl sm:text-4xl font-extrabold text-scn-text-title tracking-tight leading-none">
          Contactate con Nosotros
        </h1>
        <p className="text-sm text-scn-text-normal">
          ¿Tenés dudas sobre algún producto o querés coordinar una compra? Comunicate por cualquiera de nuestros canales oficiales.
        </p>
      </div>

      {/* Main Grid: Card Contact info & Map/Hours */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Column: Direct Contact Buttons */}
        <div className="space-y-4">
          <h2 className="font-display text-lg font-bold text-scn-text-title">
            Canales de Atención Directa
          </h2>

          {/* WhatsApp Card */}
          <a
            id="contact-whatsapp-card"
            href={`https://wa.me/${cleanedNumber}?text=Hola%20SCN!%20Quiero%20hacer%20una%20consulta%20desde%20el%20catalogo.`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-4 rounded-2xl border border-scn-border bg-scn-bg-card p-5 shadow-2xs hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
              <MessageSquare size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-scn-text-title">WhatsApp Oficial</h3>
              <p className="text-xs text-scn-text-normal mt-0.5">{formattedNumber}</p>
              <span className="text-3xs font-semibold text-emerald-500 mt-1 block">Escribinos ahora · Respuesta rápida</span>
            </div>
          </a>

          {/* Instagram Card */}
          <a
            id="contact-instagram-card"
            href={settings.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-4 rounded-2xl border border-scn-border bg-scn-bg-card p-5 shadow-2xs hover:border-scn-primary/30 hover:bg-scn-primary/5 transition-all group"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-scn-primary/15 text-scn-primary group-hover:bg-scn-primary group-hover:text-white transition-all">
              <Instagram size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-scn-text-title">Instagram</h3>
              <p className="text-xs text-scn-text-normal mt-0.5">@somos_scn</p>
              <span className="text-3xs font-semibold text-scn-primary mt-1 block">Seguinos para sorteos y novedades</span>
            </div>
          </a>

          {/* Email Card */}
          <a
            id="contact-email-card"
            href={`mailto:${settings.email}`}
            className="flex items-center space-x-4 rounded-2xl border border-scn-border bg-scn-bg-card p-5 shadow-2xs hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
              <Mail size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-scn-text-title">Correo Electrónico</h3>
              <p className="text-xs text-scn-text-normal mt-0.5 break-all">{settings.email}</p>
              <span className="text-3xs font-semibold text-blue-500 mt-1 block">Para consultas de stock mayorista o soporte</span>
            </div>
          </a>

        </div>

        {/* Right Column: Information, Location & Schedule */}
        <div className="rounded-2xl border border-scn-border bg-scn-bg-card p-6 shadow-2xs space-y-6">
          <h2 className="font-display text-lg font-bold text-scn-text-title border-b border-scn-border pb-3">
            Información Adicional
          </h2>

          {/* Hours Card */}
          <div className="flex items-start space-x-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-scn-primary/10 text-scn-primary shrink-0">
              <Clock size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-scn-text-title">Horarios de Atención</h3>
              <p className="text-xs text-scn-text-normal mt-1 leading-relaxed">
                Lunes a Sábado: <strong>09:00 a 20:00 hs</strong><br />
                Domingos y Feriados: Guardias de consulta por WhatsApp.
              </p>
            </div>
          </div>

          {/* Location Card */}
          <div className="flex items-start space-x-3.5 border-t border-scn-border/50 pt-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-scn-primary/10 text-scn-primary shrink-0">
              <MapPin size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-scn-text-title">Zona de Cobertura</h3>
              <p className="text-xs text-scn-text-normal mt-1 leading-relaxed">
                Entregas coordinadas en puntos estratégicos de <strong>Buenos Aires, Argentina</strong> y envíos garantizados a todo el país.
              </p>
            </div>
          </div>

          {/* Notice Card */}
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 space-y-1">
            <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400">Atención Personalizada</h4>
            <p className="text-2xs text-scn-text-normal leading-relaxed">
              Trabajamos con un stock rotativo constante. Si querés reservar un producto destacado del catálogo, te aconsejamos confirmarlo por WhatsApp para apartarlo de inmediato.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
