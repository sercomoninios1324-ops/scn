import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Monitor, RefreshCw, Smartphone, Tablet, Users } from 'lucide-react';
import { apiFetch, safeJson } from '../../lib/api';
import { isTrackingOptedOut, setTrackingOptOut } from '../../lib/analytics';
import CatalogImage from '../../components/CatalogImage';

type Metrics = {
  from: string;
  to: string;
  days: number;
  total_visits: number;
  unique_visitors: number;
  today: number;
  devices: Record<string, number>;
  series: { day: string; visitors: number; mobile: number }[];
  top_products: { product_id: string; views: number }[];
};

type ProductLite = {
  id: string;
  name: string;
  slug: string;
  images: { storage_path: string; is_cover: boolean }[];
};

const RANGES = [
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
];

const fmt = new Intl.NumberFormat('es-AR');

function dayLabel(day: string, short = false) {
  const d = new Date(`${day}T12:00:00Z`);
  return new Intl.DateTimeFormat('es-AR', short ? { day: 'numeric', month: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
}

export default function MetricsTab({ products }: { products: ProductLite[] }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Metrics | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [optOut, setOptOut] = useState(() => isTrackingOptedOut());

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/api/admin/metrics?days=${days}`);
      const body = (await safeJson(res)) as Metrics & { error?: string };
      if (!res.ok) throw new Error(body.error || 'No se pudieron cargar las métricas');
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las métricas');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const max = Math.max(1, ...(data?.series.map((d) => d.visitors) || [1]));
  const deviceTotal = Object.values(data?.devices || {}).reduce((a, b) => a + b, 0);
  const pct = (n: number) => (deviceTotal ? Math.round((n / deviceTotal) * 100) : 0);
  const topMax = Math.max(1, ...(data?.top_products.map((t) => t.views) || [1]));

  const toggleOptOut = () => {
    const next = !optOut;
    setTrackingOptOut(next);
    setOptOut(next);
  };

  return (
    <div id="admin-metrics-tab" className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-xl border border-scn-border bg-scn-bg-section p-1" role="group" aria-label="Período">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              aria-pressed={days === r.days}
              onClick={() => setDays(r.days)}
              className={`min-h-9 rounded-lg px-4 text-xs font-bold transition-colors cursor-pointer ${
                days === r.days ? 'bg-scn-bg-card text-scn-primary shadow-xs' : 'text-scn-text-normal hover:text-scn-text-title'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-scn-border px-3 text-xs font-semibold text-scn-text-normal hover:bg-scn-bg-section cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {/* Switch: no contar este dispositivo */}
      <div className="flex items-start justify-between gap-4 rounded-2xl border border-scn-border bg-scn-bg-card p-4">
        <div>
          <p id="optout-label" className="text-sm font-bold text-scn-text-title">No contar las visitas de este dispositivo</p>
          <p className="mt-0.5 text-xs leading-relaxed text-scn-text-secondary">
            Activalo en cada celular o computadora que uses para revisar la web (vale para este navegador). Mientras
            tengas la sesión del panel abierta tampoco se cuentan tus visitas.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={optOut}
          aria-labelledby="optout-label"
          onClick={toggleOptOut}
          className={`relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
            optOut ? 'bg-[#6622CF]' : 'bg-scn-border'
          }`}
        >
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${optOut ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {error ? (
        <div role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-semibold text-amber-700 dark:text-amber-300">
          {error}
        </div>
      ) : null}

      {data ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { icon: Users, label: 'Personas distintas', value: data.unique_visitors, hint: `en ${data.days} días` },
              { icon: Eye, label: 'Visitas', value: data.total_visits, hint: '1 por persona por día' },
              { icon: Users, label: 'Hoy', value: data.today, hint: 'personas' },
              { icon: Smartphone, label: 'Desde celular', value: `${pct(data.devices.mobile || 0)}%`, hint: `${fmt.format(data.devices.mobile || 0)} visitas` },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl border border-scn-border bg-scn-bg-card p-4">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-scn-text-secondary">
                  <k.icon size={13} /> {k.label}
                </p>
                <p className="mt-1.5 font-display text-2xl font-extrabold tabular-nums text-scn-text-title sm:text-3xl">
                  {typeof k.value === 'number' ? fmt.format(k.value) : k.value}
                </p>
                <p className="text-[11px] text-scn-text-secondary">{k.hint}</p>
              </div>
            ))}
          </div>

          {/* Visitas por día */}
          <div className="rounded-2xl border border-scn-border bg-scn-bg-card p-4 sm:p-5">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-bold text-scn-text-title">Visitas por día</h3>
              <p className="text-[11px] text-scn-text-secondary">
                {dayLabel(data.from, true)} – {dayLabel(data.to, true)}
              </p>
            </div>
            <div className="flex h-40 items-end gap-[2px] sm:gap-1" role="img" aria-label={`Gráfico de visitas por día, máximo ${max}`}>
              {data.series.map((d) => (
                <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end">
                  <div
                    className="w-full rounded-t-[3px] bg-[#6622CF]/80 transition-colors group-hover:bg-[#6622CF]"
                    style={{ height: d.visitors ? `${Math.max(4, (d.visitors / max) * 100)}%` : '2px', opacity: d.visitors ? 1 : 0.25 }}
                  />
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[#18142a] px-2 py-1 text-[11px] font-semibold text-white shadow-lg group-hover:block">
                    {dayLabel(d.day)}: {fmt.format(d.visitors)}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-scn-text-secondary">
              <span>{dayLabel(data.from, true)}</span>
              <span>{dayLabel(data.to, true)}</span>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {/* Productos más vistos */}
            <div className="rounded-2xl border border-scn-border bg-scn-bg-card p-4 sm:p-5 lg:col-span-2">
              <h3 className="mb-3 text-sm font-bold text-scn-text-title">Productos más vistos</h3>
              {data.top_products.length === 0 ? (
                <p className="py-6 text-center text-xs text-scn-text-secondary">Todavía no hay vistas de productos en este período.</p>
              ) : (
                <ol className="space-y-2.5">
                  {data.top_products.map((t, i) => {
                    const p = byId.get(t.product_id);
                    const cover = p?.images.find((im) => im.is_cover)?.storage_path || p?.images[0]?.storage_path;
                    return (
                      <li key={t.product_id} className="flex items-center gap-3">
                        <span className="w-5 shrink-0 text-right text-xs font-bold tabular-nums text-scn-text-secondary">{i + 1}</span>
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-scn-border bg-scn-bg-section">
                          {cover ? <CatalogImage src={cover} width={160} alt="" className="h-full w-full object-cover" /> : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-scn-text-title">{p?.name || 'Producto eliminado'}</p>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-scn-bg-section">
                            <div className="h-full rounded-full bg-[#6622CF]" style={{ width: `${(t.views / topMax) * 100}%` }} />
                          </div>
                        </div>
                        <span className="shrink-0 text-xs font-bold tabular-nums text-scn-text-title">{fmt.format(t.views)}</span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            {/* Dispositivos */}
            <div className="rounded-2xl border border-scn-border bg-scn-bg-card p-4 sm:p-5">
              <h3 className="mb-3 text-sm font-bold text-scn-text-title">Dispositivos</h3>
              {deviceTotal === 0 ? (
                <p className="py-6 text-center text-xs text-scn-text-secondary">Sin datos todavía.</p>
              ) : (
                <ul className="space-y-3">
                  {[
                    { key: 'mobile', label: 'Celular', icon: Smartphone },
                    { key: 'desktop', label: 'Computadora', icon: Monitor },
                    { key: 'tablet', label: 'Tablet', icon: Tablet },
                  ].map((d) => (
                    <li key={d.key}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-semibold text-scn-text-title">
                          <d.icon size={14} /> {d.label}
                        </span>
                        <span className="tabular-nums text-scn-text-secondary">
                          {pct(data.devices[d.key] || 0)}% · {fmt.format(data.devices[d.key] || 0)}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-scn-bg-section">
                        <div className="h-full rounded-full bg-[#6622CF]" style={{ width: `${pct(data.devices[d.key] || 0)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-scn-text-secondary">
            Solo se cuentan visitas desde Argentina. Cada persona suma una visita por día (aunque recargue o abra varias
            pestañas) y cada producto se cuenta una vez por persona por día. No se cuentan bots ni buscadores.
          </p>
        </>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-scn-primary border-t-transparent" />
        </div>
      ) : null}
    </div>
  );
}
