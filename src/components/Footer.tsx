/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Instagram, Mail, Phone, ShoppingBag } from 'lucide-react';
import { SiteSettings } from '../types';
import { ScnLogo } from './ScnLogo';

interface FooterProps {
  setCurrentPage: (page: string) => void;
  settings: SiteSettings;
}

export default function Footer({ setCurrentPage, settings }: FooterProps) {
  const formattedWhatsapp = settings.whatsapp_number.startsWith('+') 
    ? settings.whatsapp_number 
    : `+${settings.whatsapp_number}`;

  return (
    <footer id="footer-main" className="border-t border-scn-border bg-scn-bg-card py-12 transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center space-x-2.5">
              <ScnLogo size={32} />
              <span className="font-display font-bold text-lg text-scn-text-title tracking-tight">
                SCN — Seamos como niños
              </span>
            </div>
            <p className="text-sm text-scn-text-normal max-w-md">
              Catálogo de electrónica premium con asesoramiento humano y directo. Creemos que la tecnología tiene que encender la misma curiosidad y alegría que sentíamos de chicos.
            </p>
            <div className="flex space-x-4 pt-2">
              <a 
                id="footer-ig-link"
                href={settings.instagram_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-scn-text-secondary hover:text-scn-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
              <a 
                id="footer-email-link"
                href={`mailto:${settings.email}`} 
                className="text-scn-text-secondary hover:text-scn-primary transition-colors"
                aria-label="Email"
              >
                <Mail size={20} />
              </a>
            </div>
          </div>

          {/* Catalog / Pages */}
          <div>
            <h3 className="text-sm font-semibold text-scn-text-title tracking-wider uppercase mb-4">
              Navegación
            </h3>
            <ul className="space-y-2.5 text-sm font-medium">
              <li>
                <button 
                  id="footer-nav-home"
                  onClick={() => setCurrentPage('home')} 
                  className="text-scn-text-normal hover:text-scn-primary transition-colors cursor-pointer"
                >
                  Inicio
                </button>
              </li>
              <li>
                <button 
                  id="footer-nav-products"
                  onClick={() => setCurrentPage('products')} 
                  className="text-scn-text-normal hover:text-scn-primary transition-colors cursor-pointer"
                >
                  Catálogo Completo
                </button>
              </li>
              <li>
                <button 
                  id="footer-nav-guide"
                  onClick={() => setCurrentPage('guide')} 
                  className="text-scn-text-normal hover:text-scn-primary transition-colors cursor-pointer"
                >
                  Guía de Compra
                </button>
              </li>
              <li>
                <button 
                  id="footer-nav-contact"
                  onClick={() => setCurrentPage('contact')} 
                  className="text-scn-text-normal hover:text-scn-primary transition-colors cursor-pointer"
                >
                  Contacto
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h3 className="text-sm font-semibold text-scn-text-title tracking-wider uppercase mb-4">
              Atención al Cliente
            </h3>
            <ul className="space-y-3 text-sm text-scn-text-normal">
              <li className="flex items-start space-x-2.5">
                <Phone size={16} className="text-scn-primary shrink-0 mt-0.5" />
                <span>{formattedWhatsapp}</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <Mail size={16} className="text-scn-primary shrink-0 mt-0.5" />
                <span className="break-all">{settings.email}</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <ShoppingBag size={16} className="text-scn-primary shrink-0 mt-0.5" />
                <span>Venta por WhatsApp · Entregas seguras</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-scn-border mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-scn-text-secondary">
          <p>© {new Date().getFullYear()} SCN — Seamos como niños. Todos los derechos reservados.</p>
          <p className="mt-2 sm:mt-0">Diseñado con dedicación para Argentina 🇦🇷</p>
        </div>
      </div>
    </footer>
  );
}
