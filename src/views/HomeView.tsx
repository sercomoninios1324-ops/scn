

import React from 'react';
import { ArrowRight, HelpCircle, ShieldCheck, Sparkles, Truck, Zap } from 'lucide-react';
import { Product, SiteSettings } from '../types';
import ProductCarousel from '../components/ProductCarousel';

interface HomeViewProps {
  products: (Product & { images: { storage_path: string; is_cover: boolean }[]; category?: { name: string } })[];
  settings: SiteSettings;
  setCurrentPage: (page: string) => void;
  setSelectedProductSlug: (slug: string) => void;
}

export default function HomeView({ products, settings, setCurrentPage, setSelectedProductSlug }: HomeViewProps) {
  
  const handleProductClick = (slug: string) => {
    setSelectedProductSlug(slug);
    setCurrentPage('product_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div id="home-view" className="page-enter space-y-16 md:space-y-24 pb-16">
      
      
      <section id="top-carousel-section" className="reveal-item">
        <ProductCarousel 
          products={products} 
          onProductClick={handleProductClick} 
        />
      </section>

      
      <section id="hero-section" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative overflow-visible reveal-item [animation-delay:200ms]">
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[250px] bg-scn-primary/5 rounded-full blur-[100px] pointer-events-none -z-10 animate-glow-pulse" />
        
        <div className="relative glass p-8 sm:p-12 md:p-16 rounded-[2.5rem] border border-scn-border/40 overflow-hidden flex flex-col items-center justify-center text-center glow-primary">
          
          <div className="absolute inset-0 bg-gradient-to-br from-scn-primary/5 to-transparent pointer-events-none" />
          
          <div className="relative z-10 text-center space-y-6 max-w-3xl mx-auto">
            
            <div id="badge-hero" className="inline-flex items-center space-x-1.5 rounded-full bg-scn-primary/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-scn-primary">
              <Sparkles size={13} className="animate-pulse" />
              <span>TECNOLOGÍA CON ALMA</span>
            </div>

            
            <h1 id="hero-title" className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold text-scn-text-title tracking-tight leading-none">
              {settings.hero_title || "SCN — Seamos como niños"}
            </h1>
            <p id="hero-subtitle" className="text-base sm:text-lg md:text-xl text-scn-text-normal leading-relaxed max-w-2xl mx-auto">
              {settings.hero_subtitle || "Catálogo de tecnología en Bahía Blanca. Celulares, notebooks y accesorios con asesoría personalizada por WhatsApp."}
            </p>

            
            <div id="hero-ctas" className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                id="hero-cta-catalog"
                onClick={() => setCurrentPage('products')}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-xl bg-scn-primary px-6 py-3.5 font-sans text-base font-semibold text-white shadow-lg shadow-scn-primary/25 transition-all hover:bg-scn-hover hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>Explorar Catálogo</span>
                <ArrowRight size={18} />
              </button>
              
              <button
                id="hero-cta-guide"
                onClick={() => setCurrentPage('guide')}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-xl border border-scn-border/40 bg-scn-bg-card/45 backdrop-blur-md px-6 py-3.5 font-sans text-base font-semibold text-scn-text-title transition-all hover:bg-scn-bg-section/60 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <HelpCircle size={18} className="text-scn-primary" />
                <span>¿Cómo comprar?</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      
      <section id="why-choose-us" className="relative py-8 overflow-visible reveal-item [animation-delay:400ms]">
        
        <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-scn-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-12">
          
          <div className="space-y-2 max-w-2xl mx-auto">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-scn-text-title tracking-tight">
              ¿Por qué elegir SCN?
            </h2>
            <p className="text-sm text-scn-text-normal">
              Nos enfocamos en brindar una experiencia de compra transparente, sin complicaciones y con trato 100% humano.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 text-left">
            
            
            <div className="group rounded-[2rem] border border-scn-border/45 bg-scn-bg-card/45 backdrop-blur-md p-6 shadow-xs space-y-4 hover:-translate-y-1.5 hover:border-scn-primary/30 transition-all duration-300 glow-primary-hover">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-scn-primary/15 text-scn-primary transition-transform group-hover:scale-110 duration-300">
                <ShieldCheck size={24} />
              </div>
              <h3 className="font-display text-base font-bold text-scn-text-title">
                Garantía y Confianza
              </h3>
              <p className="text-xs text-scn-text-normal leading-relaxed">
                Todos nuestros productos son rigurosamente chequeados e importados de forma legal. Te brindamos garantía real por cualquier falla.
              </p>
            </div>

            
            <div className="group rounded-[2rem] border border-scn-border/45 bg-scn-bg-card/45 backdrop-blur-md p-6 shadow-xs space-y-4 hover:-translate-y-1.5 hover:border-amber-500/30 transition-all duration-300">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 transition-transform group-hover:scale-110 duration-300">
                <Truck size={24} />
              </div>
              <h3 className="font-display text-base font-bold text-scn-text-title">
                Envíos Coordinados
              </h3>
              <p className="text-xs text-scn-text-normal leading-relaxed">
                Coordinamos el envío directo a tu domicilio o un punto de encuentro seguro que te quede súper cómodo en toda la zona.
              </p>
            </div>

            
            <div className="group rounded-[2rem] border border-scn-border/45 bg-scn-bg-card/45 backdrop-blur-md p-6 shadow-xs space-y-4 hover:-translate-y-1.5 hover:border-emerald-500/30 transition-all duration-300">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500 transition-transform group-hover:scale-110 duration-300">
                <Zap size={24} />
              </div>
              <h3 className="font-display text-base font-bold text-scn-text-title">
                Asesoramiento Humano
              </h3>
              <p className="text-xs text-scn-text-normal leading-relaxed">
                No hablás con un bot genérico. Te atendemos nosotros mismos por WhatsApp para sacarte cualquier duda y recomendarte lo mejor.
              </p>
            </div>

            
            <div className="group rounded-[2rem] border border-scn-border/45 bg-scn-bg-card/45 backdrop-blur-md p-6 shadow-xs space-y-4 hover:-translate-y-1.5 hover:border-rose-500/30 transition-all duration-300">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500 transition-transform group-hover:scale-110 duration-300">
                <HelpCircle size={24} />
              </div>
              <h3 className="font-display text-base font-bold text-scn-text-title">
                Sencillo y Seguro
              </h3>
              <p className="text-xs text-scn-text-normal leading-relaxed">
                Elegís lo que querés, tocás un botón para enviarnos un WhatsApp y coordinamos todo de palabra. Sin formularios infinitos ni sorpresas.
              </p>
            </div>

          </div>

        </div>
      </section>

      
      <section id="cta-bottom" className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative overflow-visible reveal-item [animation-delay:500ms]">
        
        <div className="absolute top-1/2 right-1/4 w-[250px] h-[250px] bg-scn-primary/5 rounded-full blur-[90px] pointer-events-none -z-10" />

        <div className="rounded-[2.5rem] border border-scn-border/45 bg-gradient-to-r from-scn-primary/10 via-scn-primary/5 to-transparent p-8 sm:p-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8 backdrop-blur-sm glow-primary">
          <div className="space-y-3 max-w-xl">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-scn-text-title tracking-tight leading-none">
              ¿Listo para renovar tu tecnología?
            </h2>
            <p className="text-sm text-scn-text-normal">
              Explorá todos los productos disponibles en nuestro catálogo. Recordá que podés consultarnos sin compromiso.
            </p>
          </div>
          <button
            id="bottom-cta-catalog"
            onClick={() => setCurrentPage('products')}
            className="w-full md:w-auto flex items-center justify-center space-x-2 rounded-xl bg-scn-primary px-6 py-3.5 font-sans text-sm font-semibold text-white shadow-lg shadow-scn-primary/20 hover:bg-scn-hover hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer shrink-0"
          >
            <span>Ver Catálogo Completo</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

    </div>
  );
}
