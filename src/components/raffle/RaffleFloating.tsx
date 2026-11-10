import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, Gift, X } from 'lucide-react';
import { raffleDeadlineText, useRaffle } from '../../context/RaffleContext';
import CatalogImage from '../CatalogImage';
import RaffleForm from './RaffleForm';

const seenKey = (id: string) => `scn-raffle-seen-${id}`;

/**
 * Botón flotante del sorteo (abajo a la derecha, en todas las páginas públicas),
 * aviso tipo notificación la primera vez y hoja para participar sin salir de la página.
 */
export default function RaffleFloating() {
  const { raffle, joined, sheetOpen, openSheet, closeSheet } = useRaffle();
  const location = useLocation();
  const [nudge, setNudge] = useState(false);
  const [sectionVisible, setSectionVisible] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  // Aviso una sola vez por sorteo (no en la home, que ya lo muestra grande)
  useEffect(() => {
    if (!raffle || joined) return undefined;
    let seen = false;
    try {
      seen = localStorage.getItem(seenKey(raffle.id)) === '1';
    } catch {
      seen = true;
    }
    if (seen) return undefined;
    const t = window.setTimeout(() => setNudge(true), location.pathname === '/' ? 6000 : 2500);
    return () => window.clearTimeout(t);
  }, [raffle, joined, location.pathname]);

  const dismissNudge = () => {
    setNudge(false);
    if (!raffle) return;
    try {
      localStorage.setItem(seenKey(raffle.id), '1');
    } catch {
      /* noop */
    }
  };

  // Hoja: Esc cierra, bloquea el scroll de fondo y devuelve el foco al cerrar
  useEffect(() => {
    if (!sheetOpen) return undefined;
    lastFocus.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSheet();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    window.setTimeout(() => closeBtnRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
      lastFocus.current?.focus?.();
    };
  }, [sheetOpen, closeSheet]);

  // En el inicio, mientras el bloque del sorteo está a la vista, el botón sobra (y taparía el formulario)
  useEffect(() => {
    setSectionVisible(false);
    if (location.pathname !== '/' || !raffle) return undefined;
    let io: IntersectionObserver | null = null;
    const attach = () => {
      const el = document.getElementById('sorteo');
      if (!el) return false;
      io = new IntersectionObserver(([entry]) => setSectionVisible(entry.isIntersecting), { threshold: 0.05 });
      io.observe(el);
      return true;
    };
    // La sección se carga aparte: reintenta unos instantes
    let tries = 0;
    const timer = window.setInterval(() => {
      if (attach() || ++tries > 20) window.clearInterval(timer);
    }, 250);
    return () => {
      window.clearInterval(timer);
      io?.disconnect();
    };
  }, [location.pathname, raffle]);

  // Al cambiar de página se cierra la hoja
  useEffect(() => {
    closeSheet();
  }, [location.pathname, closeSheet]);

  if (!raffle) return null;

  const open = () => {
    dismissNudge();
    openSheet();
  };

  const deadline = raffleDeadlineText(raffle.ends_at);

  return (
    <>
      <div
        className={`scn-raffle-fab fixed right-4 z-40 flex flex-col items-end gap-2 transition-all duration-300 sm:right-6 ${
          sectionVisible && !sheetOpen ? 'pointer-events-none translate-y-4 opacity-0' : ''
        }`}
        aria-hidden={sectionVisible && !sheetOpen ? true : undefined}
      >
        {nudge && !sheetOpen ? (
          <div
            role="status"
            className="scn-raffle-nudge relative w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-[#9468D4]/40 bg-white p-3.5 pr-9 text-left shadow-2xl shadow-[#6622CF]/25 dark:bg-[#18142a]"
          >
            <button
              type="button"
              onClick={dismissNudge}
              aria-label="Cerrar aviso del sorteo"
              className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-scn-text-secondary hover:text-scn-text-title cursor-pointer"
            >
              <X size={15} />
            </button>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6622CF] dark:text-[#c9b2e8]">
              Sorteo activo
            </p>
            <p className="mt-1 text-sm font-bold leading-snug text-scn-text-title">
              {raffle.prize ? `Participá por ${raffle.prize}` : raffle.title}
            </p>
            {deadline ? <p className="mt-0.5 text-xs text-scn-text-secondary">{deadline}</p> : null}
            <button
              type="button"
              onClick={open}
              className="mt-2.5 inline-flex h-9 items-center justify-center rounded-lg bg-[#6622CF] px-3.5 text-xs font-bold text-white cursor-pointer"
            >
              Quiero participar
            </button>
          </div>
        ) : null}

        <button
          type="button"
          onClick={open}
          aria-label={joined ? 'Sorteo: ya estás participando' : `Participá del sorteo: ${raffle.title}`}
          aria-haspopup="dialog"
          className="scn-raffle-btn group relative flex h-14 items-center gap-2 rounded-full bg-[#6622CF] pl-4 pr-5 text-sm font-bold text-white shadow-xl shadow-[#6622CF]/40 transition-transform hover:scale-[1.04] active:scale-[0.97] cursor-pointer"
        >
          {!joined ? <span className="scn-raffle-ping absolute inset-0 rounded-full" aria-hidden /> : null}
          <Gift size={20} className="relative" />
          <span className="relative">{joined ? 'Participando' : 'Sorteo'}</span>
          {joined ? (
            <span className="relative -mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#6622CF]">
              <Check size={13} strokeWidth={3} />
            </span>
          ) : null}
        </button>
      </div>

      {sheetOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="presentation">
          <button
            type="button"
            aria-label="Cerrar"
            tabIndex={-1}
            onClick={closeSheet}
            className="scn-raffle-backdrop absolute inset-0 bg-[#0b0a10]/60 backdrop-blur-[2px] cursor-default"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="raffle-sheet-title"
            className="scn-raffle-sheet relative max-h-[92svh] w-full overflow-y-auto rounded-t-3xl border border-scn-border/60 bg-scn-bg-general p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-3xl sm:p-6"
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-scn-border/80 sm:hidden" aria-hidden />
            <button
              ref={closeBtnRef}
              type="button"
              onClick={closeSheet}
              aria-label="Cerrar"
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-xl text-scn-text-secondary hover:bg-scn-bg-section hover:text-scn-text-title cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-3 pr-10">
              {raffle.image_url ? (
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-scn-border/50 bg-scn-bg-section">
                  <CatalogImage src={raffle.image_url} width={160} alt="" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#6622CF]/12 text-[#6622CF] dark:text-[#c9b2e8]">
                  <Gift size={28} />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6622CF] dark:text-[#c9b2e8]">Sorteo</p>
                <h2 id="raffle-sheet-title" className="font-display text-lg font-extrabold leading-tight text-scn-text-title">
                  {raffle.title}
                </h2>
                {raffle.prize ? <p className="mt-0.5 text-sm font-semibold text-scn-text-normal">Premio: {raffle.prize}</p> : null}
                {deadline ? <p className="mt-0.5 text-xs text-scn-text-secondary">{deadline}</p> : null}
              </div>
            </div>

            {raffle.description ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-scn-text-normal">{raffle.description}</p>
            ) : null}

            <div className="mt-4">
              <RaffleForm raffle={raffle} compact />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
