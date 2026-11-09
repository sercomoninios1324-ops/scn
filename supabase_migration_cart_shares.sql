-- Pedidos cortos WhatsApp (códigos /pedido/CODE) — durable en Vercel
-- Ejecutar en Supabase SQL Editor si el proyecto ya tiene el resto de tablas.

create table if not exists public.cart_shares (
    code text primary key,
    items jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null
);

create index if not exists cart_shares_expires_at_idx
    on public.cart_shares (expires_at);

alter table public.cart_shares enable row level security;

-- Sin políticas públicas: solo service role (API server) lee/escribe.
-- Opcional: limpieza periódica de expirados
-- delete from public.cart_shares where expires_at < now();
