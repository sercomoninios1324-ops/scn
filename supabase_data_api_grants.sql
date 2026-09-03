-- ==========================================
-- SCN — Exponer tablas a la Data API (REST)
-- ==========================================
-- Ejecutar en Supabase SQL Editor si desactivaste "Automatically expose new tables"
-- al crear el proyecto, o si /api/health muestra adminsApi.error.
--
-- RLS sigue activo: estos GRANT solo permiten que PostgREST vea las tablas.
-- Quién puede leer/escribir cada fila lo define RLS (políticas en supabase_migration.sql).

-- Schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Tablas del catálogo
GRANT SELECT ON public.categories TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated, service_role;

GRANT SELECT ON public.products TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated, service_role;

GRANT SELECT ON public.product_images TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated, service_role;

GRANT SELECT ON public.site_settings TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated, service_role;

GRANT SELECT ON public.admins TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admins TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated, service_role;

-- Sequences (ids autogenerados)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Tablas nuevas en el futuro (opcional)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
