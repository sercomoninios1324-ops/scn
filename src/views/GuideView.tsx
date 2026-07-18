/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, ShoppingBag, Send, CreditCard, Box, ChevronDown, ChevronUp, Sparkles, HelpCircle } from 'lucide-react';

interface FAQItem {
  id: string;
  q: string;
  a: string;
}

export default function GuideView() {
  const steps = [
    {
      num: '1',
      title: 'Elegí tu producto',
      desc: 'Navegá por nuestro catálogo web interactivo, filtrá por categorías o buscá tu dispositivo favorito. Cada producto tiene fotos reales, descripciones detalladas y el precio final de catálogo.',
      icon: <ShoppingBag size={24} className="text-scn-primary" />,
      color: 'bg-scn-primary/10 text-scn-primary'
    },
    {
      num: '2',
      title: 'Tocá el botón de WhatsApp',
      desc: 'En la ficha de cada producto tenés un botón de compra directa. Al tocarlo se abrirá WhatsApp con un mensaje pre-armado indicándonos qué producto querés. ¡Más fácil imposible!',
      icon: <Send size={24} className="text-emerald-500" />,
      color: 'bg-emerald-500/10 text-emerald-500'
    },
    {
      num: '3',
      title: 'Coordinamos pago y entrega',
      desc: 'Aceptamos efectivo, transferencia bancaria y Mercado Pago. Para transferir usá nuestro alias: ventas.pago.jg — una vez realizado el pago, envianos el comprobante por WhatsApp para confirmar tu pedido.',
      icon: <CreditCard size={24} className="text-amber-500" />,
      color: 'bg-amber-500/10 text-amber-500'
    },
    {
      num: '4',
      title: '¡Lo recibís y disfrutas!',
      desc: 'Hacemos entregas ultra rápidas y seguras. Podés retirar tu producto de forma presencial o te lo mandamos directo a tu casa. Tu dispositivo llega listo para encender y usar.',
      icon: <Box size={24} className="text-rose-500" />,
      color: 'bg-rose-500/10 text-rose-500'
    }
  ];

  const faqs: FAQItem[] = [
    {
      id: 'faq-1',
      q: '¿Qué medios de pago aceptan?',
      a: 'Aceptamos efectivo al momento de la entrega, transferencia bancaria y Mercado Pago (dinero en cuenta). Para transferir o pagar por Mercado Pago, usá nuestro alias: ventas.pago.jg — Una vez realizado el pago, envianos el comprobante por WhatsApp para confirmar tu pedido. Todos los precios del catálogo corresponden al pago por estos medios.'
    },
    {
      id: 'faq-2',
      q: '¿Hacen envíos a domicilio?',
      a: 'Sí, realizamos envíos a todo el país mediante Correo Argentino. Para entregas locales en nuestra zona, coordinamos envíos personalizados en moto en el día o podés retirar en un punto de encuentro seguro y gratuito que acordamos por WhatsApp.'
    },
    {
      id: 'faq-3',
      q: '¿Los productos tienen garantía?',
      a: '¡Por supuesto! En SCN garantizamos la calidad de todo lo que vendemos. Todos nuestros productos cuentan con una garantía de prueba de 30 días corridos ante cualquier falla de fábrica. Además, brindamos soporte posventa directo para ayudarte con la configuración inicial.'
    },
    {
      id: 'faq-4',
      q: '¿Tienen local físico para ir a ver los productos?',
      a: 'Operamos de forma 100% online y como catálogo digital. Esto nos permite ahorrar costos de estructura y ofrecerte los mejores precios del mercado en electrónica. Realizamos entregas presenciales en puntos estratégicos seguros de la ciudad, coordinando día y horario.'
    },
    {
      id: 'faq-5',
      q: '¿Se puede encargar un producto que no está en el catálogo?',
      a: '¡Sí! Si estás buscando un dispositivo, auricular, funda o accesorio específico que no ves listado, escribinos directamente por WhatsApp. Trabajamos con importadores directos y podemos traerte modelos específicos a pedido.'
    }
  ];

  // Active FAQ state
  const [openFaq, setOpenFaq] = useState<string | null>('faq-1');

  const toggleFaq = (id: string) => {
    setOpenFaq(prev => (prev === id ? null : id));
  };

  return (
    <div id="guide-view" className="page-enter mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-20 pt-8 space-y-20">
      
      {/* Title */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="inline-flex items-center space-x-1 rounded-full bg-scn-primary/10 px-3 py-1 text-xs font-semibold text-scn-primary">
          <Sparkles size={12} />
          <span>FÁCIL Y TRANSPARENTE</span>
        </span>
        <h1 id="guide-title" className="font-display text-3xl sm:text-4xl font-extrabold text-scn-text-title tracking-tight leading-none">
          Guía de Compra
        </h1>
        <p className="text-sm text-scn-text-normal">
          Comprar en SCN es tan sencillo como hablar de palabra. Te explicamos los 4 pasos simples para tener tu nuevo dispositivo tecnológico.
        </p>
      </div>

      {/* Steps Diagram */}
      <section id="guide-steps-grid" className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
        {steps.map((step, idx) => (
          <div
            id={`step-card-${step.num}`}
            key={step.num}
            className="group relative flex items-start space-x-5 rounded-2xl border border-scn-border bg-scn-bg-card p-6 shadow-2xs transition-all hover:border-scn-primary/20 hover:shadow-xs"
          >
            {/* Step number badge & icon */}
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${step.color} shadow-inner`}>
              {step.icon}
            </div>

            <div className="space-y-2">
              <span className="font-display text-4xl font-black text-scn-text-secondary/20 leading-none block">
                {`0${step.num}`}
              </span>
              <h3 className="font-display text-base font-bold text-scn-text-title group-hover:text-scn-primary transition-colors">
                {step.title}
              </h3>
              <p className="text-xs text-scn-text-normal leading-relaxed">
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* FAQ Section */}
      <section id="faq-section" className="space-y-8 border-t border-scn-border pt-16">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 id="faq-title" className="font-display text-2xl font-extrabold text-scn-text-title tracking-tight">
            Preguntas Frecuentes
          </h2>
          <p className="text-sm text-scn-text-normal">
            ¿Tenés alguna consulta puntual? Revisá nuestras respuestas rápidas sobre envíos, garantías y pagos.
          </p>
        </div>

        {/* FAQs Accordion */}
        <div id="faq-accordion-list" className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq) => {
            const isOpen = openFaq === faq.id;
            return (
              <div
                id={faq.id}
                key={faq.id}
                className="overflow-hidden rounded-xl border border-scn-border bg-scn-bg-card transition-all"
              >
                <button
                  onClick={() => toggleFaq(faq.id)}
                  className="flex w-full items-center justify-between p-5 text-left font-sans text-sm font-bold text-scn-text-title hover:bg-scn-bg-section transition-colors cursor-pointer"
                >
                  <span className="flex items-center space-x-2.5">
                    <HelpCircle size={16} className="text-scn-primary shrink-0" />
                    <span>{faq.q}</span>
                  </span>
                  {isOpen ? <ChevronUp size={16} className="text-scn-text-secondary shrink-0" /> : <ChevronDown size={16} className="text-scn-text-secondary shrink-0" />}
                </button>
                
                {isOpen && (
                  <div className="border-t border-scn-border bg-scn-bg-section/40 p-5 text-xs text-scn-text-normal leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
