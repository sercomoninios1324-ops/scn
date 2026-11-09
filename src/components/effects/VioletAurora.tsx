import { useEffect, useRef, useState } from 'react';

/**
 * Aurora SCN — violeta marca (#6622CF).
 * Light: base lavanda clara. Dark: base profunda (sin negro puro).
 * El stage se pinta a mitad de resolución y se escala: el blur se ve igual y cuesta menos.
 */
export default function VioletAurora({ className = '' }: { className?: string }) {
  // Efecto de marca: se anima siempre (decisión del cliente), aun con "reducir movimiento" activo.
  const reduced = false;
  const rootRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || reduced) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        setPaused(!entry.isIntersecting);
      },
      { rootMargin: '120px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <div
      ref={rootRef}
      className={`scn-aurora absolute inset-0 overflow-hidden pointer-events-none ${paused ? 'scn-aurora-paused' : ''} ${className}`}
      aria-hidden
    >
      <div className="scn-aurora-base absolute inset-0" />

      <div className="scn-aurora-stage">
        <div className={`absolute inset-[-20%] ${reduced ? '' : 'scn-aurora-a'}`}>
          <div className="scn-aurora-blob-a absolute left-[-10%] top-[-5%] h-[55%] w-[120%] rotate-[-8deg] rounded-[100%] blur-[20px]" />
        </div>

        <div className={`absolute inset-0 ${reduced ? '' : 'scn-aurora-d'}`}>
          <div className="scn-aurora-ribbon-a absolute top-[18%] left-[-40%] h-[28%] w-[110%] rotate-[-12deg] rounded-full blur-[18px]" />
        </div>

        <div className={`absolute inset-0 ${reduced ? 'opacity-80' : 'scn-aurora-b'}`}>
          <div className="scn-aurora-ribbon-b absolute top-[36%] left-[-25%] h-[20%] w-[95%] rotate-[5deg] rounded-full blur-[16px]" />
        </div>

        <div className={`absolute inset-0 ${reduced ? '' : 'scn-aurora-c'}`}>
          <div className="scn-aurora-glow absolute top-[10%] right-[-20%] h-[60%] w-[55%] rounded-full blur-[24px]" />
        </div>

        <div className={`absolute inset-0 ${reduced ? 'opacity-50' : 'scn-aurora-a opacity-70'}`}>
          <div className="scn-aurora-ribbon-c absolute top-[8%] left-[10%] h-[12%] w-[70%] rotate-[-6deg] rounded-full blur-[12px]" />
        </div>
      </div>

      <div className="scn-aurora-veil absolute inset-0" />
    </div>
  );
}
