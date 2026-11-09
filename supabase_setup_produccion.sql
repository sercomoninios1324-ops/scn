-- =====================================================================
-- SCN — Puesta a punto del proyecto Supabase EXISTENTE (producción)
-- Proyecto: vanlkqadbdplussonwuf
--
-- Cómo usarlo: Supabase Dashboard → SQL Editor → New query → pegar todo → Run.
-- Es idempotente: se puede correr más de una vez sin romper nada ni borrar datos.
-- NO crea ni modifica productos, categorías, fotos ni admins existentes.
-- =====================================================================

-- 1) Precio anterior para ofertas (badge "Oferta" + precio tachado)
alter table public.products
  add column if not exists compare_at_price numeric(12, 2);

comment on column public.products.compare_at_price is
  'Precio anterior opcional. Si es mayor que price, la UI muestra Oferta y precio tachado.';

-- 2) Pedidos por WhatsApp con código corto (/pedido/CODE)
create table if not exists public.cart_shares (
  code text primary key,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists cart_shares_expires_at_idx
  on public.cart_shares (expires_at);

-- RLS activo y SIN políticas públicas: solo la API (service_role) lee/escribe.
alter table public.cart_shares enable row level security;

-- 3) Permisos de la Data API (por si el proyecto no expone tablas nuevas automáticamente)
grant usage on schema public to anon, authenticated, service_role;

grant select on public.categories     to anon, authenticated, service_role;
grant select on public.products       to anon, authenticated, service_role;
grant select on public.product_images to anon, authenticated, service_role;
grant select on public.site_settings  to anon, authenticated, service_role;

grant select, insert, update, delete on public.categories     to authenticated, service_role;
grant select, insert, update, delete on public.products       to authenticated, service_role;
grant select, insert, update, delete on public.product_images to authenticated, service_role;
grant select, insert, update, delete on public.site_settings  to authenticated, service_role;

grant select on public.admins to authenticated, service_role;
grant select, insert, update, delete on public.admins to service_role;

grant select, insert, update, delete on public.cart_shares to service_role;

grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- 4) Limpieza de pedidos vencidos (la API ya limpia de forma oportunista;
--    esto deja la tabla prolija ahora mismo).
delete from public.cart_shares where expires_at < now();

-- 5) Verificaciones (mirar los resultados abajo en el SQL Editor)
--    a) Debe haber al menos un admin y su user_id debe existir en auth.users
select a.user_id, a.name, u.email, (u.id is not null) as existe_en_auth
from public.admins a
left join auth.users u on u.id = a.user_id;

--    b) Bucket de fotos público
select id, name, public from storage.buckets where id = 'product-images';

--    c) Resumen del catálogo
select
  (select count(*) from public.products where is_active and deleted_at is null) as productos_activos,
  (select count(*) from public.products where is_featured and is_active and deleted_at is null) as destacados,
  (select count(*) from public.products where coalesce(short_description, '') = '' and deleted_at is null) as sin_descripcion_corta,
  (select count(*) from public.product_images) as fotos,
  (select count(*) from public.product_images where storage_path ilike '%.png' or storage_path ilike '%.jpg' or storage_path ilike '%.jpeg') as fotos_sin_webp;

-- ---------------------------------------------------------------------
-- Si la consulta (a) no devuelve filas, crear el admin así:
--   1. Authentication → Users → Add user (email + contraseña del cliente)
--   2. Copiar el UUID del usuario y correr:
--      insert into public.admins (user_id, name) values ('UUID-ACA', 'Administrador SCN');
-- ---------------------------------------------------------------------
