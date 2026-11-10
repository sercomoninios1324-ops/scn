import { Gift } from 'lucide-react';
import { raffleDeadlineText, useRaffle } from '../../context/RaffleContext';
import CatalogImage from '../CatalogImage';
import RaffleForm from './RaffleForm';

/** Bloque del sorteo en el inicio: premio + mini formulario, sin salir de la página. */
export default function RaffleHomeSection() {
  const { raffle } = useRaffle();
  if (!raffle) return null;
  const deadline = raffleDeadlineText(raffle.ends_at);

  return (
    <section id="sorteo" aria-labelledby="home-raffle-title" className="relative scroll-mt-20 bg-scn-bg-general px-4 pt-10 sm:px-6 md:pt-14 lg:px-8">
      <div className="scn-raffle-card mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-[#9468D4]/35 md:grid-cols-2">
        <div className="relative flex flex-col justify-center gap-3 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            {raffle.image_url ? (
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-scn-bg-section shadow-lg">
                <CatalogImage
                  src={raffle.image_url}
                  width={320}
                  srcSetWidths={[160, 320]}
                  sizes="80px"
                  alt={raffle.prize || raffle.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#6622CF] text-white shadow-lg shadow-[#6622CF]/30">
                <Gift size={26} />
              </div>
            )}
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6622CF] dark:text-[#c9b2e8]">
              Sorteo SCN
            </p>
          </div>
          <h2 id="home-raffle-title" className="font-display text-2xl font-extrabold leading-tight tracking-tight text-scn-text-title sm:text-3xl">
            {raffle.title}
          </h2>
          {raffle.prize ? (
            <p className="text-base font-semibold text-scn-text-normal">
              Premio: <span className="text-scn-text-title">{raffle.prize}</span>
            </p>
          ) : null}
          {raffle.description ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-scn-text-normal">{raffle.description}</p>
          ) : null}
          {deadline ? (
            <p className="inline-flex w-fit items-center rounded-lg bg-[#6622CF]/10 px-2.5 py-1 text-xs font-semibold text-[#6622CF] dark:bg-white/8 dark:text-[#e0c8ff]">
              {deadline}
            </p>
          ) : null}
        </div>
        <div className="border-t border-[#9468D4]/25 bg-white/60 p-6 sm:p-8 md:border-l md:border-t-0 dark:bg-white/[0.03]">
          <RaffleForm raffle={raffle} />
        </div>
      </div>
    </section>
  );
}
