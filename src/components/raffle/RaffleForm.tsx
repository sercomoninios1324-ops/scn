import { useId, useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useRaffle, type PublicRaffle } from '../../context/RaffleContext';
import { getVisitorId } from '../../lib/analytics';

type Props = { raffle: PublicRaffle; compact?: boolean; autoFocus?: boolean };

const inputClass =
  'h-12 w-full rounded-xl border border-scn-border/60 bg-white/80 px-3.5 text-sm text-scn-text-title placeholder-scn-text-secondary dark:bg-white/8';

export default function RaffleForm({ raffle, compact = false, autoFocus = false }: Props) {
  const { joined, markJoined } = useRaffle();
  const uid = useId();
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [accept, setAccept] = useState(false);
  const [website, setWebsite] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const mode = raffle.contact_mode;
  const askWhatsapp = mode !== 'email';
  const askEmail = mode !== 'whatsapp';
  const either = mode === 'either';

  if (joined || status === 'done') {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-left" role="status">
        <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-emerald-500" />
        <div>
          <p className="text-sm font-bold text-scn-text-title">{message || '¡Ya estás participando!'}</p>
          <p className="mt-0.5 text-xs text-scn-text-normal">
            Si ganás, te contactamos {mode === 'email' ? 'por mail' : mode === 'whatsapp' ? 'por WhatsApp' : 'por WhatsApp o mail'}. ¡Suerte!
          </p>
        </div>
      </div>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (raffle.ask_name && name.trim().length < 2) return setError('Escribí tu nombre');
    if (mode === 'all' && (!whatsapp.trim() || !email.trim())) return setError('Completá WhatsApp y mail');
    if (mode === 'whatsapp' && !whatsapp.trim()) return setError('Falta tu WhatsApp');
    if (mode === 'email' && !email.trim()) return setError('Falta tu mail');
    if (either && !whatsapp.trim() && !email.trim()) return setError('Dejá tu WhatsApp o tu mail');
    if (!accept) return setError('Tenés que aceptar las bases');

    setStatus('sending');
    try {
      const res = await fetch(`/api/raffles/${encodeURIComponent(raffle.id)}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: raffle.ask_name ? name : '',
          whatsapp: askWhatsapp ? whatsapp : '',
          email: askEmail ? email : '',
          accept: true,
          website,
          vid: getVisitorId(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; already?: boolean };
      if (res.ok || data.already) {
        setMessage(data.already ? '¡Ya estabas participando!' : '¡Listo, ya estás participando!');
        setStatus('done');
        markJoined();
        return;
      }
      setError(data.error || 'No pudimos registrar tu participación. Probá de nuevo.');
      setStatus('idle');
    } catch {
      setError('Sin conexión. Probá de nuevo.');
      setStatus('idle');
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className={`space-y-3 text-left ${compact ? '' : 'sm:space-y-3.5'}`}>
      {raffle.ask_name ? (
        <div>
          <label htmlFor={`${uid}-name`} className="mb-1 block text-xs font-semibold text-scn-text-title">
            Nombre
          </label>
          <input
            id={`${uid}-name`}
            className={inputClass}
            autoComplete="name"
            autoFocus={autoFocus}
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
          />
        </div>
      ) : null}

      {either ? <p className="text-xs font-semibold text-scn-text-secondary">WhatsApp o mail: con uno alcanza</p> : null}

      {askWhatsapp ? (
        <div>
          <label htmlFor={`${uid}-wa`} className="mb-1 block text-xs font-semibold text-scn-text-title">
            WhatsApp
          </label>
          <input
            id={`${uid}-wa`}
            className={inputClass}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            autoFocus={autoFocus && !raffle.ask_name}
            maxLength={24}
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="291 5224734"
          />
        </div>
      ) : null}

      {askEmail ? (
        <div>
          <label htmlFor={`${uid}-mail`} className="mb-1 block text-xs font-semibold text-scn-text-title">
            Mail
          </label>
          <input
            id={`${uid}-mail`}
            className={inputClass}
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@mail.com"
          />
        </div>
      ) : null}

      {/* Anti-bots: campo invisible para personas */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Sitio web
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 py-1 text-xs leading-snug text-scn-text-normal">
        <input
          type="checkbox"
          checked={accept}
          onChange={(e) => setAccept(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#6622CF]"
        />
        <span>
          Acepto las bases del sorteo y que SCN me contacte si gano.
          {raffle.terms ? (
            <>
              {' '}
              <button
                type="button"
                onClick={() => setShowTerms((v) => !v)}
                className="font-semibold text-[#6622CF] underline underline-offset-2 dark:text-[#c9b2e8] cursor-pointer"
              >
                {showTerms ? 'Ocultar bases' : 'Ver bases'}
              </button>
            </>
          ) : null}
        </span>
      </label>
      {showTerms && raffle.terms ? (
        <div className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl border border-scn-border/50 bg-scn-bg-section/60 p-3 text-xs leading-relaxed text-scn-text-normal">
          {raffle.terms}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-300">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#6622CF] px-5 text-sm font-semibold text-white shadow-lg shadow-[#6622CF]/30 transition-transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-70 cursor-pointer"
      >
        {status === 'sending' ? <Loader2 size={17} className="animate-spin" /> : null}
        {status === 'sending' ? 'Enviando…' : 'Participar'}
      </button>
      <p className="text-center text-[11px] text-scn-text-secondary">
        Usamos tus datos solo para este sorteo. Una participación por persona.
      </p>
    </form>
  );
}
