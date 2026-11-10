import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ContactMode = 'all' | 'whatsapp' | 'email' | 'either';

export type PublicRaffle = {
  id: string;
  title: string;
  prize: string;
  description: string;
  terms: string;
  image_url: string | null;
  contact_mode: ContactMode;
  ask_name: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

type RaffleContextValue = {
  raffle: PublicRaffle | null;
  joined: boolean;
  markJoined: () => void;
  sheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
};

const RaffleContext = createContext<RaffleContextValue | null>(null);

const joinedKey = (id: string) => `scn-raffle-joined-${id}`;

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function RaffleProvider({ children }: { children: ReactNode }) {
  const [raffle, setRaffle] = useState<PublicRaffle | null>(null);
  const [joined, setJoined] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/raffles/active')
      .then((res) => (res.ok ? res.json() : { raffle: null }))
      .then((data: { raffle: PublicRaffle | null }) => {
        if (cancelled) return;
        setRaffle(data.raffle);
        if (data.raffle) setJoined(readFlag(joinedKey(data.raffle.id)));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const markJoined = useCallback(() => {
    if (!raffle) return;
    try {
      localStorage.setItem(joinedKey(raffle.id), '1');
    } catch {
      /* noop */
    }
    setJoined(true);
  }, [raffle]);

  const openSheet = useCallback(() => setSheetOpen(true), []);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const value = useMemo(
    () => ({ raffle, joined, markJoined, sheetOpen, openSheet, closeSheet }),
    [raffle, joined, markJoined, sheetOpen, openSheet, closeSheet]
  );

  return <RaffleContext.Provider value={value}>{children}</RaffleContext.Provider>;
}

export function useRaffle() {
  const ctx = useContext(RaffleContext);
  if (!ctx) throw new Error('useRaffle debe usarse dentro de RaffleProvider');
  return ctx;
}

/** "Cierra el 20/11 · faltan 3 días" */
export function raffleDeadlineText(endsAt: string | null): string | null {
  if (!endsAt) return null;
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return null;
  const date = new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(end);
  const ms = end.getTime() - Date.now();
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor(ms / 3_600_000);
  const left =
    ms <= 0 ? 'cerrado' : days >= 1 ? `faltan ${days} ${days === 1 ? 'día' : 'días'}` : hours >= 1 ? `faltan ${hours} h` : 'último momento';
  return `Cierra el ${date} · ${left}`;
}
