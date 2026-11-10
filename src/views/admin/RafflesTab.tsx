import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowLeft, Download, Gift, Loader2, Pencil, Plus, Power, Shuffle, Trash2, Trophy, Upload, Users, X,
} from 'lucide-react';
import { apiFetch, safeJson } from '../../lib/api';
import { buildWhatsAppUrl } from '../../lib/whatsapp';
import CatalogImage from '../../components/CatalogImage';

type ContactMode = 'all' | 'whatsapp' | 'email' | 'either';

type AdminRaffle = {
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
  is_active: boolean;
  winner_entry_id: string | null;
  drawn_at: string | null;
  created_at: string;
  entries_count: number;
  is_open: boolean;
};

type Entry = { id: string; raffle_id: string; name: string; email: string | null; whatsapp: string | null; created_at: string };

type Notify = (type: 'success' | 'error', message: string) => void;

const MODE_LABEL: Record<ContactMode, string> = {
  all: 'Nombre, WhatsApp y mail',
  whatsapp: 'Solo WhatsApp',
  email: 'Solo mail',
  either: 'WhatsApp o mail (uno alcanza)',
};

const DEFAULT_TERMS = `• Participan personas mayores de 18 años con domicilio en Argentina.
• Una participación por persona. Las participaciones duplicadas se descartan.
• El ganador se elige al azar entre todas las participaciones válidas al cierre.
• Contactamos al ganador por los datos que dejó. Si no responde en 72 h, se sortea de nuevo.
• El premio no se canjea por dinero. Entrega en Bahía Blanca o envío a coordinar.`;

const fieldClass = 'w-full rounded-lg border border-scn-border bg-scn-bg-section px-3 py-2.5 text-xs text-scn-text-title';
const labelClass = 'mb-1 block text-3xs font-bold uppercase tracking-wider text-scn-text-title';

/** ISO → valor de <input type="datetime-local"> en hora local */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const fmtDate = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
    : '—';

function statusOf(r: AdminRaffle): { label: string; tone: string } {
  if (r.is_open) return { label: 'Visible en la web', tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' };
  if (r.is_active && r.starts_at && new Date(r.starts_at) > new Date()) return { label: 'Programado', tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-300' };
  if (r.is_active) return { label: 'Activo · cerrado por fecha', tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-300' };
  return { label: 'Pausado', tone: 'bg-scn-bg-section text-scn-text-secondary' };
}

export default function RafflesTab({ notify }: { notify: Notify }) {
  const [raffles, setRaffles] = useState<AdminRaffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<AdminRaffle | 'new' | null>(null);
  const [viewing, setViewing] = useState<AdminRaffle | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/api/admin/raffles?fresh=${Date.now()}`);
      const body = (await safeJson(res)) as AdminRaffle[] & { error?: string };
      if (!res.ok) throw new Error((body as { error?: string }).error || 'No se pudieron cargar los sorteos');
      setRaffles(body as AdminRaffle[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los sorteos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleActive = async (r: AdminRaffle) => {
    try {
      const res = await apiFetch(`/api/admin/raffles/${r.id}`, { method: 'PUT', body: JSON.stringify({ is_active: !r.is_active }) });
      const body = (await safeJson(res)) as { error?: string };
      if (!res.ok) throw new Error(body.error || 'No se pudo actualizar');
      notify('success', r.is_active ? 'Sorteo pausado: ya no aparece en la web.' : 'Sorteo activado. Aparece en la web en hasta 1 minuto.');
      void load();
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'No se pudo actualizar');
    }
  };

  const remove = async (r: AdminRaffle) => {
    if (!confirm(`¿Borrar "${r.title}" y sus ${r.entries_count} participaciones? No se puede deshacer.`)) return;
    try {
      const res = await apiFetch(`/api/admin/raffles/${r.id}`, { method: 'DELETE' });
      const body = (await safeJson(res)) as { error?: string };
      if (!res.ok) throw new Error(body.error || 'No se pudo borrar');
      notify('success', 'Sorteo borrado.');
      void load();
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'No se pudo borrar');
    }
  };

  if (editing) {
    return (
      <RaffleEditor
        raffle={editing === 'new' ? null : editing}
        notify={notify}
        onClose={(saved) => {
          setEditing(null);
          if (saved) void load();
        }}
      />
    );
  }

  if (viewing) {
    return (
      <EntriesView
        raffle={viewing}
        notify={notify}
        onBack={() => {
          setViewing(null);
          void load();
        }}
      />
    );
  }

  return (
    <div id="admin-raffles-tab" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-scn-text-secondary">
          Un solo sorteo se muestra a la vez: el botón flotante en todas las páginas y el bloque en el inicio.
        </p>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-scn-primary px-5 text-xs font-bold text-white shadow-md hover:bg-scn-hover cursor-pointer"
        >
          <Plus size={15} /> Nuevo sorteo
        </button>
      </div>

      {error ? (
        <div role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-semibold text-amber-700 dark:text-amber-300">
          {error}
        </div>
      ) : null}

      {loading && !raffles.length ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-scn-primary border-t-transparent" />
        </div>
      ) : !raffles.length && !error ? (
        <div className="rounded-2xl border border-dashed border-scn-border p-10 text-center">
          <Gift size={28} className="mx-auto text-scn-text-secondary" />
          <p className="mt-3 text-sm font-bold text-scn-text-title">Todavía no hay sorteos</p>
          <p className="mt-1 text-xs text-scn-text-secondary">Creá uno y activalo para que aparezca en la web.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {raffles.map((r) => {
            const st = statusOf(r);
            return (
              <li key={r.id} className="rounded-2xl border border-scn-border bg-scn-bg-card p-4">
                <div className="flex gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-scn-border bg-scn-bg-section">
                    {r.image_url ? (
                      <CatalogImage src={r.image_url} width={160} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-scn-text-secondary">
                        <Gift size={20} />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-bold text-scn-text-title">{r.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${st.tone}`}>{st.label}</span>
                      {r.winner_entry_id ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-300">
                          <Trophy size={11} /> Sorteado
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-scn-text-normal">{r.prize || 'Sin premio cargado'}</p>
                    <p className="mt-0.5 text-[11px] text-scn-text-secondary">
                      {fmtDate(r.starts_at)} → {fmtDate(r.ends_at)} · {MODE_LABEL[r.contact_mode]}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-scn-border/60 pt-3">
                  <button
                    type="button"
                    onClick={() => setViewing(r)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-scn-primary/10 px-3 text-xs font-bold text-scn-primary cursor-pointer"
                  >
                    <Users size={14} /> {r.entries_count} participante{r.entries_count === 1 ? '' : 's'}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(r)}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold cursor-pointer ${
                      r.is_active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-scn-bg-section text-scn-text-secondary'
                    }`}
                  >
                    <Power size={14} /> {r.is_active ? 'Activo' : 'Activar'}
                  </button>
                  <div className="ml-auto flex gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(r)}
                      aria-label={`Editar ${r.title}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-scn-text-secondary hover:bg-scn-primary/10 hover:text-scn-primary cursor-pointer"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(r)}
                      aria-label={`Borrar ${r.title}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-scn-text-secondary hover:bg-rose-500/10 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RaffleEditor({ raffle, notify, onClose }: { raffle: AdminRaffle | null; notify: Notify; onClose: (saved: boolean) => void }) {
  const [title, setTitle] = useState(raffle?.title || '');
  const [prize, setPrize] = useState(raffle?.prize || '');
  const [description, setDescription] = useState(raffle?.description || '');
  const [terms, setTerms] = useState(raffle?.terms ?? DEFAULT_TERMS);
  const [imageUrl, setImageUrl] = useState(raffle?.image_url || '');
  const [contactMode, setContactMode] = useState<ContactMode>(raffle?.contact_mode || 'either');
  const [askName, setAskName] = useState(raffle?.ask_name ?? true);
  const [startsAt, setStartsAt] = useState(toLocalInput(raffle?.starts_at || null));
  const [endsAt, setEndsAt] = useState(toLocalInput(raffle?.ends_at || null));
  const [isActive, setIsActive] = useState(raffle?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) return notify('error', 'Elegí una imagen (JPG, PNG o WebP).');
    if (file.size > 8 * 1024 * 1024) return notify('error', 'La imagen pesa más de 8 MB.');
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
        reader.readAsDataURL(file);
      });
      const res = await apiFetch('/api/admin/upload', { method: 'POST', body: JSON.stringify({ base64, fileName: file.name }) });
      const body = (await safeJson(res)) as { url?: string; error?: string };
      if (!res.ok || !body.url) throw new Error(body.error || 'No se pudo subir la imagen');
      setImageUrl(body.url);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return notify('error', 'Poné un título.');
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      return notify('error', 'El cierre tiene que ser después del inicio.');
    }
    setSaving(true);
    try {
      const payload = {
        title,
        prize,
        description,
        terms,
        image_url: imageUrl || null,
        contact_mode: contactMode,
        ask_name: askName,
        starts_at: fromLocalInput(startsAt),
        ends_at: fromLocalInput(endsAt),
        is_active: isActive,
      };
      const res = await apiFetch(raffle ? `/api/admin/raffles/${raffle.id}` : '/api/admin/raffles', {
        method: raffle ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      const body = (await safeJson(res)) as { error?: string };
      if (!res.ok) throw new Error(body.error || 'No se pudo guardar');
      notify('success', isActive ? 'Sorteo guardado. Aparece en la web en hasta 1 minuto.' : 'Sorteo guardado (pausado).');
      onClose(true);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-extrabold text-scn-text-title">{raffle ? 'Editar sorteo' : 'Nuevo sorteo'}</h2>
        <button
          type="button"
          onClick={() => onClose(false)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-scn-border px-3 text-xs font-semibold text-scn-text-normal cursor-pointer"
        >
          <ArrowLeft size={14} /> Volver
        </button>
      </div>

      <div className="space-y-4 rounded-2xl border border-scn-border bg-scn-bg-card p-5">
        <div>
          <label className={labelClass} htmlFor="rf-title">Título *</label>
          <input id="rf-title" className={fieldClass} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sorteo de fin de año" />
        </div>
        <div>
          <label className={labelClass} htmlFor="rf-prize">Premio</label>
          <input id="rf-prize" className={fieldClass} maxLength={200} value={prize} onChange={(e) => setPrize(e.target.value)} placeholder="Auriculares inalámbricos M25" />
        </div>
        <div>
          <label className={labelClass} htmlFor="rf-desc">Descripción corta</label>
          <textarea id="rf-desc" className={fieldClass} rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Dejá tus datos y participá. Sorteamos el 20 de diciembre." />
        </div>

        <div>
          <span className={labelClass}>Imagen del premio (opcional)</span>
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-scn-border bg-scn-bg-section">
              {imageUrl ? (
                <CatalogImage src={imageUrl} width={160} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-scn-text-secondary"><Gift size={20} /></span>
              )}
            </div>
            <label className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-scn-border px-3 text-xs font-semibold text-scn-text-normal">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? 'Subiendo…' : imageUrl ? 'Cambiar' : 'Subir imagen'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f);
                  e.target.value = '';
                }}
              />
            </label>
            {imageUrl ? (
              <button type="button" onClick={() => setImageUrl('')} aria-label="Quitar imagen" className="flex h-9 w-9 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer">
                <X size={15} />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-scn-border bg-scn-bg-card p-5">
        <div>
          <span className={labelClass}>Datos que pide el formulario</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(MODE_LABEL) as ContactMode[]).map((m) => (
              <label
                key={m}
                className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border px-3 text-xs font-semibold ${
                  contactMode === m ? 'border-scn-primary bg-scn-primary/8 text-scn-text-title' : 'border-scn-border text-scn-text-normal'
                }`}
              >
                <input type="radio" name="contact_mode" checked={contactMode === m} onChange={() => setContactMode(m)} className="accent-[#6622CF]" />
                {MODE_LABEL[m]}
              </label>
            ))}
          </div>
          <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-scn-text-title">
            <input type="checkbox" checked={askName} onChange={(e) => setAskName(e.target.checked)} className="h-4 w-4 accent-[#6622CF]" />
            Pedir nombre
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="rf-start">Empieza (opcional)</label>
            <input id="rf-start" type="datetime-local" className={fieldClass} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="rf-end">Cierra (opcional)</label>
            <input id="rf-end" type="datetime-local" className={fieldClass} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
        </div>
        <p className="-mt-2 text-[11px] text-scn-text-secondary">
          Fuera de esas fechas el sorteo no se muestra aunque esté activo.
        </p>

        <div>
          <label className={labelClass} htmlFor="rf-terms">Bases y condiciones</label>
          <textarea id="rf-terms" className={fieldClass} rows={6} maxLength={4000} value={terms} onChange={(e) => setTerms(e.target.value)} />
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-scn-border px-3 py-3">
          <span>
            <span className="block text-xs font-bold text-scn-text-title">Mostrar en la web</span>
            <span className="block text-[11px] text-scn-text-secondary">Activar este sorteo pausa cualquier otro.</span>
          </span>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-5 w-5 accent-[#6622CF]" />
        </label>
      </div>

      <button
        type="submit"
        disabled={saving || uploading}
        className="w-full rounded-xl bg-scn-primary py-4 text-sm font-bold text-white shadow-lg shadow-scn-primary/20 hover:bg-scn-hover disabled:opacity-60 cursor-pointer"
      >
        {saving ? 'Guardando…' : 'Guardar sorteo'}
      </button>
    </form>
  );
}

function csvCell(v: string | null | undefined) {
  const s = String(v ?? '');
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function EntriesView({ raffle, notify, onBack }: { raffle: AdminRaffle; notify: Notify; onBack: () => void }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [winner, setWinner] = useState<Entry | null>(null);
  const [drawing, setDrawing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/raffles/${raffle.id}/entries?fresh=${Date.now()}`);
      const body = (await safeJson(res)) as Entry[] & { error?: string };
      if (!res.ok) throw new Error((body as { error?: string }).error || 'No se pudieron cargar');
      const list = body as Entry[];
      setEntries(list);
      if (raffle.winner_entry_id) setWinner(list.find((e) => e.id === raffle.winner_entry_id) || null);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'No se pudieron cargar los participantes');
    } finally {
      setLoading(false);
    }
  }, [raffle.id, raffle.winner_entry_id, notify]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return entries;
    return entries.filter((e) => [e.name, e.email, e.whatsapp].some((v) => (v || '').toLowerCase().includes(t)));
  }, [entries, q]);

  const draw = async () => {
    if (!entries.length) return;
    if (winner && !confirm('Ya hay un ganador. ¿Sortear de nuevo? (por ejemplo, si no respondió)')) return;
    setDrawing(true);
    try {
      const res = await apiFetch(`/api/admin/raffles/${raffle.id}/draw`, { method: 'POST' });
      const body = (await safeJson(res)) as { winner?: Entry; error?: string };
      if (!res.ok || !body.winner) throw new Error(body.error || 'No se pudo sortear');
      // Pequeña pausa para que se sienta el sorteo
      await new Promise((r) => setTimeout(r, 900));
      setWinner(body.winner);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'No se pudo sortear');
    } finally {
      setDrawing(false);
    }
  };

  const removeEntry = async (e: Entry) => {
    if (!confirm(`¿Quitar a ${e.name || e.email || e.whatsapp}? (por ejemplo, si es un dato falso)`)) return;
    try {
      const res = await apiFetch(`/api/admin/raffles/${raffle.id}/entries/${e.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('No se pudo quitar');
      setEntries((list) => list.filter((x) => x.id !== e.id));
      if (winner?.id === e.id) setWinner(null);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'No se pudo quitar');
    }
  };

  const exportCsv = () => {
    const rows = [
      ['Nombre', 'WhatsApp', 'Mail', 'Fecha'],
      ...entries.map((e) => [e.name, e.whatsapp ? `+${e.whatsapp}` : '', e.email || '', new Date(e.created_at).toLocaleString('es-AR')]),
    ];
    const csv = '﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `participantes-${raffle.title.toLowerCase().replace(/[^a-z0-9]+/gi, '-').slice(0, 40) || 'sorteo'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const winnerWa = winner?.whatsapp
    ? buildWhatsAppUrl(
        `¡Hola${winner.name ? ` ${winner.name.split(' ')[0]}` : ''}! Te escribimos de SCN: ganaste el sorteo "${raffle.title}"${raffle.prize ? ` (${raffle.prize})` : ''} 🎉 ¿Coordinamos la entrega?`,
        winner.whatsapp
      )
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <button type="button" onClick={onBack} className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-scn-text-secondary hover:text-scn-primary cursor-pointer">
            <ArrowLeft size={13} /> Sorteos
          </button>
          <h2 className="truncate font-display text-lg font-extrabold text-scn-text-title">{raffle.title}</h2>
          <p className="text-xs text-scn-text-secondary">{entries.length} participante{entries.length === 1 ? '' : 's'}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportCsv}
            disabled={!entries.length}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-scn-border px-3 text-xs font-semibold text-scn-text-normal disabled:opacity-40 cursor-pointer"
          >
            <Download size={14} /> Exportar
          </button>
          <button
            type="button"
            onClick={draw}
            disabled={!entries.length || drawing}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-scn-primary px-4 text-xs font-bold text-white disabled:opacity-40 cursor-pointer"
          >
            {drawing ? <Loader2 size={14} className="animate-spin" /> : <Shuffle size={14} />}
            {drawing ? 'Sorteando…' : winner ? 'Sortear de nuevo' : 'Sortear ganador'}
          </button>
        </div>
      </div>

      {winner ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center" role="status">
          <Trophy size={28} className="shrink-0 text-amber-500" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Ganador</p>
            <p className="truncate text-base font-extrabold text-scn-text-title">{winner.name || 'Sin nombre'}</p>
            <p className="truncate text-xs text-scn-text-normal">
              {[winner.whatsapp ? `+${winner.whatsapp}` : null, winner.email].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="flex gap-2">
            {winnerWa ? (
              <a href={winnerWa} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white">
                Avisar por WhatsApp
              </a>
            ) : null}
            {winner.email ? (
              <a href={`mailto:${winner.email}?subject=${encodeURIComponent(`Ganaste el sorteo de SCN`)}`} className="inline-flex min-h-10 items-center rounded-xl border border-scn-border px-4 text-xs font-bold text-scn-text-title">
                Mail
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nombre, WhatsApp o mail…"
        className="w-full rounded-xl border border-scn-border bg-scn-bg-card px-3.5 py-2.5 text-xs"
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-scn-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-scn-border p-8 text-center text-xs text-scn-text-secondary">
          {entries.length ? 'Nadie coincide con la búsqueda.' : 'Todavía no participó nadie.'}
        </p>
      ) : (
        <ul className="divide-y divide-scn-border overflow-hidden rounded-2xl border border-scn-border bg-scn-bg-card">
          {filtered.map((e) => (
            <li key={e.id} className={`flex items-center gap-3 p-3 ${winner?.id === e.id ? 'bg-amber-500/10' : ''}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-scn-text-title">
                  {e.name || 'Sin nombre'} {winner?.id === e.id ? '🏆' : ''}
                </p>
                <p className="truncate text-[11px] text-scn-text-secondary">
                  {[e.whatsapp ? `+${e.whatsapp}` : null, e.email].filter(Boolean).join(' · ')} · {fmtDate(e.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeEntry(e)}
                aria-label={`Quitar participación de ${e.name || e.email || e.whatsapp}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-scn-text-secondary hover:bg-rose-500/10 hover:text-rose-500 cursor-pointer"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
