-- =====================================================================
-- SCN — Sorteos y métricas de visitas
-- Supabase → SQL Editor → pegar todo → Run. Idempotente: se puede correr varias veces.
-- No toca productos, fotos, categorías ni admins.
-- =====================================================================

-- ── Sorteos ──────────────────────────────────────────────────────────
create table if not exists public.raffles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  prize text not null default '',
  description text not null default '',
  terms text not null default '',
  image_url text,
  -- Qué datos pide: 'all' (WhatsApp y mail), 'whatsapp', 'email', 'either' (WhatsApp o mail)
  contact_mode text not null default 'either'
    check (contact_mode in ('all', 'whatsapp', 'email', 'either')),
  ask_name boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default false,
  winner_entry_id uuid,
  drawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.raffle_entries (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references public.raffles(id) on delete cascade,
  name text not null default '',
  email text,
  whatsapp text,
  visitor_id text,
  ip_hash text,
  created_at timestamptz not null default now()
);

-- Nadie participa dos veces con el mismo mail o WhatsApp en un mismo sorteo
create unique index if not exists raffle_entries_email_uniq
  on public.raffle_entries (raffle_id, email) where email is not null;
create unique index if not exists raffle_entries_whatsapp_uniq
  on public.raffle_entries (raffle_id, whatsapp) where whatsapp is not null;
create index if not exists raffle_entries_raffle_idx
  on public.raffle_entries (raffle_id, created_at desc);

-- ── Métricas (solo Argentina, sin duplicados) ────────────────────────
-- Una fila por visitante por día: la clave primaria impide contar dos veces.
create table if not exists public.analytics_visits (
  day date not null,
  visitor_id text not null,
  device text not null default 'desktop',
  path text,
  created_at timestamptz not null default now(),
  primary key (day, visitor_id)
);

-- Una fila por visitante, producto y día.
create table if not exists public.analytics_product_views (
  day date not null,
  visitor_id text not null,
  product_id text not null,
  created_at timestamptz not null default now(),
  primary key (day, visitor_id, product_id)
);

create index if not exists analytics_product_views_day_idx
  on public.analytics_product_views (day, product_id);

-- Resumen para el panel (lo llama la API con service role)
create or replace function public.scn_metrics(p_from date, p_to date)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'daily', (
      select coalesce(json_agg(d order by d.day), '[]'::json)
      from (
        select day, count(*)::int as visitors,
               count(*) filter (where device = 'mobile')::int as mobile
        from analytics_visits
        where day between p_from and p_to
        group by day
      ) d
    ),
    'devices', (
      select coalesce(json_object_agg(device, c), '{}'::json)
      from (
        select device, count(*)::int as c
        from analytics_visits
        where day between p_from and p_to
        group by device
      ) x
    ),
    'unique_visitors', (
      select count(distinct visitor_id)::int
      from analytics_visits
      where day between p_from and p_to
    ),
    'top_products', (
      select coalesce(json_agg(t), '[]'::json)
      from (
        select product_id, count(*)::int as views
        from analytics_product_views
        where day between p_from and p_to
        group by product_id
        order by views desc
        limit 15
      ) t
    )
  );
$$;

-- ── Seguridad: solo la API (service role) lee y escribe ──────────────
alter table public.raffles enable row level security;
alter table public.raffle_entries enable row level security;
alter table public.analytics_visits enable row level security;
alter table public.analytics_product_views enable row level security;

grant select, insert, update, delete on public.raffles to service_role;
grant select, insert, update, delete on public.raffle_entries to service_role;
grant select, insert, update, delete on public.analytics_visits to service_role;
grant select, insert, update, delete on public.analytics_product_views to service_role;

revoke all on function public.scn_metrics(date, date) from public, anon, authenticated;
grant execute on function public.scn_metrics(date, date) to service_role;

-- Verificación
select
  (select count(*) from public.raffles) as sorteos,
  (select count(*) from public.raffle_entries) as participaciones,
  (select count(*) from public.analytics_visits) as visitas;
