import crypto from 'crypto';
import type { Express, Request, RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createLocalStore, createRateLimiter, isMissingRelation, MIGRATION_HINT } from './localStore';

type Ctx = {
  getSupabase: () => SupabaseClient | null;
  requireAdmin: RequestHandler;
  dataDir: string;
  clientIp: (req: Request) => string;
  isProduction: () => boolean;
};

type Visit = { day: string; visitor_id: string; device: string; path: string | null };
type ProductView = { day: string; visitor_id: string; product_id: string };
type LocalData = { visits: Visit[]; productViews: ProductView[] };

const BOT_RE =
  /bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|discord|preview|lighthouse|pagespeed|headless|phantom|puppeteer|playwright|curl|wget|python|axios|node-fetch|go-http|java\//i;

/** Día calendario en Argentina (las métricas se agrupan por día local). */
export function argentinaDay(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function deviceOf(ua: string): 'mobile' | 'tablet' | 'desktop' {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return 'tablet';
  if (/mobi|iphone|ipod|android/i.test(ua)) return 'mobile';
  return 'desktop';
}

/** País de la visita según Vercel. En local se cuenta como Argentina para poder probar. */
function countryOf(req: Request, isProduction: boolean): string {
  const header = req.headers['x-vercel-ip-country'];
  const value = (Array.isArray(header) ? header[0] : header || '').toUpperCase();
  if (value) return value;
  return isProduction ? '' : (process.env.ANALYTICS_DEV_COUNTRY || 'AR').toUpperCase();
}

function visitorIdFrom(raw: unknown, req: Request, ip: string): string {
  const vid = String(raw || '').toLowerCase();
  if (/^[a-z0-9-]{16,64}$/.test(vid)) return vid;
  // Sin almacenamiento en el navegador: huella diaria anónima (no reversible)
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-16) || 'scn-local';
  return (
    'h-' +
    crypto
      .createHash('sha256')
      .update(`${salt}|${argentinaDay()}|${ip}|${req.headers['user-agent'] || ''}`)
      .digest('hex')
      .slice(0, 30)
  );
}

function shiftDay(day: string, deltaDays: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

export function registerAnalyticsRoutes(app: Express, ctx: Ctx) {
  const local = createLocalStore<LocalData>(ctx.dataDir, 'analytics.json', { visits: [], productViews: [] });
  const allowTrack = createRateLimiter(60, 60_000);

  /**
   * POST /api/track { type: 'visit' | 'product', vid, path?, productId? }
   * Siempre 204: el seguimiento nunca rompe la navegación.
   * Sin duplicados: clave (día, visitante) y (día, visitante, producto) + insert "ignore duplicates".
   */
  app.post('/api/track', async (req, res) => {
    res.status(204);
    try {
      const ua = String(req.headers['user-agent'] || '');
      if (!ua || BOT_RE.test(ua)) return res.end();
      if (req.headers['x-scn-optout'] === '1') return res.end();
      if (countryOf(req, ctx.isProduction()) !== 'AR') return res.end();
      const ip = ctx.clientIp(req);
      if (!allowTrack(ip)) return res.end();

      const body = (req.body || {}) as Record<string, unknown>;
      const type = body.type === 'product' ? 'product' : body.type === 'visit' ? 'visit' : null;
      if (!type) return res.end();
      const day = argentinaDay();
      const visitor_id = visitorIdFrom(body.vid, req, ip);
      const supabase = ctx.getSupabase();

      if (type === 'visit') {
        const path = String(body.path || '/').slice(0, 200);
        const row: Visit = { day, visitor_id, device: deviceOf(ua), path };
        if (supabase) {
          const { error } = await supabase
            .from('analytics_visits')
            .upsert(row, { onConflict: 'day,visitor_id', ignoreDuplicates: true });
          if (error && !isMissingRelation(error)) console.warn('track visit:', error.message);
        } else {
          const store = local.read();
          if (!store.visits.some((v) => v.day === day && v.visitor_id === visitor_id)) {
            store.visits.push(row);
            local.write(store);
          }
        }
        return res.end();
      }

      const product_id = String(body.productId || '').slice(0, 64);
      if (!/^[A-Za-z0-9-]{2,64}$/.test(product_id)) return res.end();
      const row: ProductView = { day, visitor_id, product_id };
      if (supabase) {
        const { error } = await supabase
          .from('analytics_product_views')
          .upsert(row, { onConflict: 'day,visitor_id,product_id', ignoreDuplicates: true });
        if (error && !isMissingRelation(error)) console.warn('track product:', error.message);
      } else {
        const store = local.read();
        if (!store.productViews.some((v) => v.day === day && v.visitor_id === visitor_id && v.product_id === product_id)) {
          store.productViews.push(row);
          local.write(store);
        }
      }
      return res.end();
    } catch (err) {
      console.warn('POST /api/track', err instanceof Error ? err.message : err);
      return res.end();
    }
  });

  /** GET /api/admin/metrics?days=30 */
  app.get('/api/admin/metrics', ctx.requireAdmin, async (req, res) => {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    const to = argentinaDay();
    const from = shiftDay(to, -(days - 1));
    const supabase = ctx.getSupabase();
    try {
      let summary: {
        daily: { day: string; visitors: number; mobile: number }[];
        devices: Record<string, number>;
        unique_visitors: number;
        top_products: { product_id: string; views: number }[];
      };
      if (supabase) {
        const { data, error } = await supabase.rpc('scn_metrics', { p_from: from, p_to: to });
        if (error) throw error;
        summary = data as typeof summary;
      } else {
        const store = local.read();
        const visits = store.visits.filter((v) => v.day >= from && v.day <= to);
        const byDay = new Map<string, { day: string; visitors: number; mobile: number }>();
        const devices: Record<string, number> = {};
        for (const v of visits) {
          const d = byDay.get(v.day) || { day: v.day, visitors: 0, mobile: 0 };
          d.visitors += 1;
          if (v.device === 'mobile') d.mobile += 1;
          byDay.set(v.day, d);
          devices[v.device] = (devices[v.device] || 0) + 1;
        }
        const views = new Map<string, number>();
        for (const pv of store.productViews) {
          if (pv.day >= from && pv.day <= to) views.set(pv.product_id, (views.get(pv.product_id) || 0) + 1);
        }
        summary = {
          daily: [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day)),
          devices,
          unique_visitors: new Set(visits.map((v) => v.visitor_id)).size,
          top_products: [...views.entries()]
            .map(([product_id, v]) => ({ product_id, views: v }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 15),
        };
      }

      // Serie completa (días sin visitas = 0) para el gráfico
      const map = new Map((summary.daily || []).map((d) => [String(d.day).slice(0, 10), d]));
      const series: { day: string; visitors: number; mobile: number }[] = [];
      for (let i = 0; i < days; i++) {
        const day = shiftDay(from, i);
        const d = map.get(day);
        series.push({ day, visitors: d?.visitors || 0, mobile: d?.mobile || 0 });
      }
      const totalVisits = series.reduce((s, d) => s + d.visitors, 0);
      return res.json({
        from,
        to,
        days,
        total_visits: totalVisits,
        unique_visitors: summary.unique_visitors || 0,
        today: series[series.length - 1]?.visitors || 0,
        devices: summary.devices || {},
        series,
        top_products: summary.top_products || [],
      });
    } catch (err) {
      if (isMissingRelation(err)) {
        return res.status(503).json({ error: MIGRATION_HINT, code: 'MIGRATION_REQUIRED' });
      }
      console.error('GET /api/admin/metrics', err);
      return res.status(500).json({ error: 'No se pudieron cargar las métricas' });
    }
  });
}
