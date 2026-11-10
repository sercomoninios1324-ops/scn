import crypto from 'crypto';
import type { Express, Request, RequestHandler, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createLocalStore, createRateLimiter, isMissingRelation, MIGRATION_HINT } from './localStore';

export type ContactMode = 'all' | 'whatsapp' | 'email' | 'either';

export type Raffle = {
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
  updated_at: string;
};

export type RaffleEntry = {
  id: string;
  raffle_id: string;
  name: string;
  email: string | null;
  whatsapp: string | null;
  visitor_id: string | null;
  ip_hash: string | null;
  created_at: string;
};

type Ctx = {
  getSupabase: () => SupabaseClient | null;
  requireAdmin: RequestHandler;
  dataDir: string;
  clientIp: (req: Request) => string;
  isAllowedImage: (url: string) => boolean;
};

const CONTACT_MODES: ContactMode[] = ['all', 'whatsapp', 'email', 'either'];
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;

/** WhatsApp argentino → 549 + área + número (13 dígitos). null si no es válido. */
export function normalizeArWhatsapp(raw: unknown): string | null {
  let d = String(raw || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('549')) d = d.slice(3);
  else if (d.startsWith('54')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  // "15" después del código de área (ej. 291 15 5224734): se quita
  const m = d.match(/^(\d{2,4})15(\d{6,8})$/);
  if (m && (m[1] + m[2]).length === 10) d = m[1] + m[2];
  if (d.length !== 10) return null;
  return `549${d}`;
}

export function normalizeEmail(raw: unknown): string | null {
  const e = String(raw || '').trim().toLowerCase();
  if (!e) return null;
  return EMAIL_RE.test(e) && e.length <= 254 ? e : null;
}

function cleanText(raw: unknown, max: number): string {
  return String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function toIsoOrNull(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function isOpen(r: Raffle, now = Date.now()): boolean {
  if (!r.is_active) return false;
  if (r.starts_at && new Date(r.starts_at).getTime() > now) return false;
  if (r.ends_at && new Date(r.ends_at).getTime() < now) return false;
  return true;
}

/** Datos públicos: sin ganador ni datos internos. */
function publicRaffle(r: Raffle) {
  return {
    id: r.id,
    title: r.title,
    prize: r.prize,
    description: r.description,
    terms: r.terms,
    image_url: r.image_url,
    contact_mode: r.contact_mode,
    ask_name: r.ask_name,
    starts_at: r.starts_at,
    ends_at: r.ends_at,
  };
}

function hashIp(ip: string): string {
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-16) || 'scn-local';
  return crypto.createHash('sha256').update(`${salt}|${ip}`).digest('hex').slice(0, 32);
}

type LocalData = { raffles: Raffle[]; entries: RaffleEntry[] };

export function registerRaffleRoutes(app: Express, ctx: Ctx) {
  const local = createLocalStore<LocalData>(ctx.dataDir, 'raffles.json', { raffles: [], entries: [] });
  const allowEntry = createRateLimiter(6, 60_000);

  /** Lee el payload del admin (crear/editar). */
  function parseRaffleInput(body: Record<string, unknown>, partial: boolean) {
    const out: Partial<Raffle> = {};
    const errors: string[] = [];
    if (!partial || body.title !== undefined) {
      const title = cleanText(body.title, 120);
      if (!title) errors.push('El título es obligatorio');
      out.title = title;
    }
    if (!partial || body.prize !== undefined) out.prize = cleanText(body.prize, 200);
    if (!partial || body.description !== undefined)
      out.description = String(body.description ?? '').trim().slice(0, 2000);
    if (!partial || body.terms !== undefined) out.terms = String(body.terms ?? '').trim().slice(0, 4000);
    if (!partial || body.contact_mode !== undefined) {
      const mode = String(body.contact_mode || 'either') as ContactMode;
      if (!CONTACT_MODES.includes(mode)) errors.push('Modo de contacto inválido');
      out.contact_mode = mode;
    }
    if (!partial || body.ask_name !== undefined) out.ask_name = body.ask_name !== false;
    if (!partial || body.starts_at !== undefined) out.starts_at = toIsoOrNull(body.starts_at);
    if (!partial || body.ends_at !== undefined) out.ends_at = toIsoOrNull(body.ends_at);
    if (!partial || body.image_url !== undefined) {
      const img = String(body.image_url || '').trim();
      if (img && !ctx.isAllowedImage(img)) errors.push('La imagen tiene que subirse desde el panel');
      out.image_url = img || null;
    }
    if (body.is_active !== undefined) out.is_active = !!body.is_active;
    if (out.starts_at && out.ends_at && new Date(out.ends_at) <= new Date(out.starts_at)) {
      errors.push('La fecha de cierre tiene que ser posterior a la de inicio');
    }
    return { data: out, errors };
  }

  function missingTables(res: Response) {
    return res.status(503).json({ error: MIGRATION_HINT, code: 'MIGRATION_REQUIRED' });
  }

  // ── Público ────────────────────────────────────────────────────────
  app.get('/api/raffles/active', async (_req, res) => {
    const supabase = ctx.getSupabase();
    try {
      let list: Raffle[];
      if (supabase) {
        const { data, error } = await supabase
          .from('raffles')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(5);
        if (error) throw error;
        list = (data || []) as Raffle[];
      } else {
        list = local.read().raffles.filter((r) => r.is_active);
      }
      const open = list.find((r) => isOpen(r));
      return res.json({ raffle: open ? publicRaffle(open) : null });
    } catch (err) {
      if (!isMissingRelation(err)) console.error('GET /api/raffles/active', err);
      // Nunca romper la web pública por el sorteo
      return res.json({ raffle: null });
    }
  });

  app.post('/api/raffles/:id/entries', async (req, res) => {
    const ip = ctx.clientIp(req);
    if (!allowEntry(ip)) {
      return res.status(429).json({ error: 'Demasiados intentos. Probá de nuevo en un minuto.' });
    }
    const body = (req.body || {}) as Record<string, unknown>;
    // Honeypot: los humanos no ven este campo
    if (String(body.website || '').trim()) return res.status(201).json({ ok: true });
    if (body.accept !== true) {
      return res.status(400).json({ error: 'Tenés que aceptar las bases del sorteo' });
    }

    const supabase = ctx.getSupabase();
    const raffleId = String(req.params.id || '');
    try {
      let raffle: Raffle | null = null;
      if (supabase) {
        const { data, error } = await supabase.from('raffles').select('*').eq('id', raffleId).maybeSingle();
        if (error) throw error;
        raffle = (data as Raffle) || null;
      } else {
        raffle = local.read().raffles.find((r) => r.id === raffleId) || null;
      }
      if (!raffle || !isOpen(raffle)) {
        return res.status(404).json({ error: 'Este sorteo ya no está activo' });
      }

      const name = cleanText(body.name, 80);
      const rawWa = String(body.whatsapp || '').trim();
      const rawEmail = String(body.email || '').trim();
      const whatsapp = rawWa ? normalizeArWhatsapp(rawWa) : null;
      const email = rawEmail ? normalizeEmail(rawEmail) : null;

      if (raffle.ask_name && name.length < 2) return res.status(400).json({ error: 'Escribí tu nombre' });
      if (rawWa && !whatsapp) {
        return res.status(400).json({ error: 'Revisá el WhatsApp: código de área + número, sin 0 ni 15' });
      }
      if (rawEmail && !email) return res.status(400).json({ error: 'Revisá el mail' });

      const mode = raffle.contact_mode;
      if ((mode === 'whatsapp' || mode === 'all') && !whatsapp) {
        return res.status(400).json({ error: 'Falta tu WhatsApp' });
      }
      if ((mode === 'email' || mode === 'all') && !email) {
        return res.status(400).json({ error: 'Falta tu mail' });
      }
      if (mode === 'either' && !whatsapp && !email) {
        return res.status(400).json({ error: 'Dejá tu WhatsApp o tu mail' });
      }

      const entry: RaffleEntry = {
        id: crypto.randomUUID(),
        raffle_id: raffle.id,
        name,
        // Solo se guarda lo que el sorteo pide
        email: mode === 'whatsapp' ? null : email,
        whatsapp: mode === 'email' ? null : whatsapp,
        visitor_id: cleanText(body.vid, 64) || null,
        ip_hash: hashIp(ip),
        created_at: new Date().toISOString(),
      };

      if (supabase) {
        const { error } = await supabase.from('raffle_entries').insert(entry);
        if (error) {
          if (error.code === '23505') {
            return res.status(409).json({ error: 'Ya estás participando en este sorteo 🎉', already: true });
          }
          throw error;
        }
      } else {
        const store = local.read();
        const dup = store.entries.some(
          (e) =>
            e.raffle_id === entry.raffle_id &&
            ((entry.email && e.email === entry.email) || (entry.whatsapp && e.whatsapp === entry.whatsapp))
        );
        if (dup) return res.status(409).json({ error: 'Ya estás participando en este sorteo 🎉', already: true });
        store.entries.push(entry);
        local.write(store);
      }
      return res.status(201).json({ ok: true });
    } catch (err) {
      if (isMissingRelation(err)) return missingTables(res);
      console.error('POST /api/raffles/:id/entries', err);
      return res.status(500).json({ error: 'No pudimos registrar tu participación. Probá de nuevo.' });
    }
  });

  // ── Admin ──────────────────────────────────────────────────────────
  app.get('/api/admin/raffles', ctx.requireAdmin, async (_req, res) => {
    const supabase = ctx.getSupabase();
    try {
      if (supabase) {
        const { data, error } = await supabase.from('raffles').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        const raffles = (data || []) as Raffle[];
        const counts: Record<string, number> = {};
        await Promise.all(
          raffles.map(async (r) => {
            const { count } = await supabase
              .from('raffle_entries')
              .select('id', { count: 'exact', head: true })
              .eq('raffle_id', r.id);
            counts[r.id] = count || 0;
          })
        );
        return res.json(raffles.map((r) => ({ ...r, entries_count: counts[r.id] || 0, is_open: isOpen(r) })));
      }
      const store = local.read();
      return res.json(
        [...store.raffles]
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map((r) => ({
            ...r,
            entries_count: store.entries.filter((e) => e.raffle_id === r.id).length,
            is_open: isOpen(r),
          }))
      );
    } catch (err) {
      if (isMissingRelation(err)) return missingTables(res);
      console.error('GET /api/admin/raffles', err);
      return res.status(500).json({ error: 'No se pudieron cargar los sorteos' });
    }
  });

  /** Activar uno desactiva los demás: hay un solo sorteo visible a la vez. */
  async function deactivateOthers(supabase: SupabaseClient | null, keepId: string) {
    if (supabase) {
      const { error } = await supabase.from('raffles').update({ is_active: false }).neq('id', keepId);
      if (error) throw error;
    } else {
      const store = local.read();
      store.raffles.forEach((r) => {
        if (r.id !== keepId) r.is_active = false;
      });
      local.write(store);
    }
  }

  app.post('/api/admin/raffles', ctx.requireAdmin, async (req, res) => {
    const { data, errors } = parseRaffleInput(req.body || {}, false);
    if (errors.length) return res.status(400).json({ error: errors[0] });
    const now = new Date().toISOString();
    const raffle: Raffle = {
      id: crypto.randomUUID(),
      title: data.title!,
      prize: data.prize || '',
      description: data.description || '',
      terms: data.terms || '',
      image_url: data.image_url ?? null,
      contact_mode: data.contact_mode || 'either',
      ask_name: data.ask_name !== false,
      starts_at: data.starts_at ?? null,
      ends_at: data.ends_at ?? null,
      is_active: !!data.is_active,
      winner_entry_id: null,
      drawn_at: null,
      created_at: now,
      updated_at: now,
    };
    const supabase = ctx.getSupabase();
    try {
      if (supabase) {
        const { error } = await supabase.from('raffles').insert(raffle);
        if (error) throw error;
      } else {
        const store = local.read();
        store.raffles.push(raffle);
        local.write(store);
      }
      if (raffle.is_active) await deactivateOthers(supabase, raffle.id);
      return res.status(201).json(raffle);
    } catch (err) {
      if (isMissingRelation(err)) return missingTables(res);
      console.error('POST /api/admin/raffles', err);
      return res.status(500).json({ error: 'No se pudo crear el sorteo' });
    }
  });

  app.put('/api/admin/raffles/:id', ctx.requireAdmin, async (req, res) => {
    const { data, errors } = parseRaffleInput(req.body || {}, true);
    if (errors.length) return res.status(400).json({ error: errors[0] });
    const id = String(req.params.id);
    const update = { ...data, updated_at: new Date().toISOString() };
    const supabase = ctx.getSupabase();
    try {
      let saved: Raffle | null = null;
      if (supabase) {
        const { data: row, error } = await supabase.from('raffles').update(update).eq('id', id).select().maybeSingle();
        if (error) throw error;
        saved = (row as Raffle) || null;
      } else {
        const store = local.read();
        const r = store.raffles.find((x) => x.id === id);
        if (r) {
          Object.assign(r, update);
          saved = r;
          local.write(store);
        }
      }
      if (!saved) return res.status(404).json({ error: 'Sorteo no encontrado' });
      if (update.is_active) await deactivateOthers(supabase, id);
      return res.json(saved);
    } catch (err) {
      if (isMissingRelation(err)) return missingTables(res);
      console.error('PUT /api/admin/raffles/:id', err);
      return res.status(500).json({ error: 'No se pudo guardar el sorteo' });
    }
  });

  app.delete('/api/admin/raffles/:id', ctx.requireAdmin, async (req, res) => {
    const id = String(req.params.id);
    const supabase = ctx.getSupabase();
    try {
      if (supabase) {
        const { error } = await supabase.from('raffles').delete().eq('id', id);
        if (error) throw error;
      } else {
        const store = local.read();
        store.raffles = store.raffles.filter((r) => r.id !== id);
        store.entries = store.entries.filter((e) => e.raffle_id !== id);
        local.write(store);
      }
      return res.json({ success: true });
    } catch (err) {
      if (isMissingRelation(err)) return missingTables(res);
      console.error('DELETE /api/admin/raffles/:id', err);
      return res.status(500).json({ error: 'No se pudo borrar el sorteo' });
    }
  });

  async function loadEntries(id: string): Promise<RaffleEntry[]> {
    const supabase = ctx.getSupabase();
    if (supabase) {
      const all: RaffleEntry[] = [];
      for (let from = 0; from < 50_000; from += 1000) {
        const { data, error } = await supabase
          .from('raffle_entries')
          .select('*')
          .eq('raffle_id', id)
          .order('created_at', { ascending: true })
          .range(from, from + 999);
        if (error) throw error;
        all.push(...((data || []) as RaffleEntry[]));
        if (!data || data.length < 1000) break;
      }
      return all;
    }
    return local
      .read()
      .entries.filter((e) => e.raffle_id === id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  app.get('/api/admin/raffles/:id/entries', ctx.requireAdmin, async (req, res) => {
    try {
      const entries = await loadEntries(String(req.params.id));
      return res.json(entries.map(({ ip_hash: _ip, visitor_id: _v, ...e }) => e));
    } catch (err) {
      if (isMissingRelation(err)) return missingTables(res);
      console.error('GET /api/admin/raffles/:id/entries', err);
      return res.status(500).json({ error: 'No se pudieron cargar los participantes' });
    }
  });

  app.delete('/api/admin/raffles/:id/entries/:entryId', ctx.requireAdmin, async (req, res) => {
    const supabase = ctx.getSupabase();
    try {
      if (supabase) {
        const { error } = await supabase
          .from('raffle_entries')
          .delete()
          .eq('id', String(req.params.entryId))
          .eq('raffle_id', String(req.params.id));
        if (error) throw error;
      } else {
        const store = local.read();
        store.entries = store.entries.filter((e) => e.id !== req.params.entryId);
        local.write(store);
      }
      return res.json({ success: true });
    } catch (err) {
      if (isMissingRelation(err)) return missingTables(res);
      return res.status(500).json({ error: 'No se pudo borrar la participación' });
    }
  });

  /** Ganador al azar (CSPRNG del servidor), entre todas las participaciones válidas. */
  app.post('/api/admin/raffles/:id/draw', ctx.requireAdmin, async (req, res) => {
    const id = String(req.params.id);
    const supabase = ctx.getSupabase();
    try {
      const entries = await loadEntries(id);
      if (!entries.length) return res.status(400).json({ error: 'Todavía no hay participantes' });
      const winner = entries[crypto.randomInt(entries.length)];
      const update = { winner_entry_id: winner.id, drawn_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      if (supabase) {
        const { error } = await supabase.from('raffles').update(update).eq('id', id);
        if (error) throw error;
      } else {
        const store = local.read();
        const r = store.raffles.find((x) => x.id === id);
        if (r) Object.assign(r, update);
        local.write(store);
      }
      const { ip_hash: _ip, visitor_id: _v, ...pub } = winner;
      return res.json({ winner: pub, total: entries.length, drawn_at: update.drawn_at });
    } catch (err) {
      if (isMissingRelation(err)) return missingTables(res);
      console.error('POST /api/admin/raffles/:id/draw', err);
      return res.status(500).json({ error: 'No se pudo sortear' });
    }
  });
}
