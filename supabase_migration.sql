-- ==========================================
-- SCN — Seamos como niños
-- Migración de Base de Datos para Supabase
-- ==========================================
--
-- IMPORTANTE: En Supabase → Project Settings → API → "Exposed schemas"
-- debe incluir "public". Si desactivas exponer tablas, la API REST no puede
-- leer/escribir datos y el login admin fallará aunque las filas existan en la DB.

-- Habilitar extensión para UUIDs si no está activa
create extension if not exists "uuid-ossp";

-- 1. TABLA DE CATEGORÍAS
create table public.categories (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    created_at timestamptz not null default now()
);

-- 2. TABLA DE PRODUCTOS
create table public.products (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    short_description text,
    description text,
    price numeric(12, 2) not null,
    currency text not null default 'ARS',
    includes jsonb not null default '[]'::jsonb, -- Array de strings con qué incluye
    category_id uuid references public.categories(id) on delete set null,
    is_featured boolean not null default false,
    is_active boolean not null default true,
    sku text,
    stock integer not null default 0,
    deleted_at timestamptz, -- Soft delete
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 3. TABLA DE IMÁGENES DE PRODUCTOS
create table public.product_images (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products(id) on delete cascade,
    storage_path text not null, -- URL completa o path en Supabase Storage
    position integer not null default 0,
    is_cover boolean not null default false
);

-- 4. TABLA DE ADMINISTRADORES
create table public.admins (
    user_id uuid primary key references auth.users(id) on delete cascade,
    name text not null,
    created_at timestamptz not null default now()
);

-- 5. TABLA DE CONFIGURACIÓN DEL SITIO
create table public.site_settings (
    id integer primary key default 1 check (id = 1), -- Fila única
    whatsapp_number text not null,
    instagram_url text not null,
    email text not null,
    hero_title text not null,
    hero_subtitle text not null
);

-- 6. TABLAS FUTURAS PARA E-COMMERCE (DOCUMENTADAS Y LISTAS)
create table public.orders (
    id uuid primary key default gen_random_uuid(),
    status text not null default 'pending', -- 'pending', 'processing', 'completed', 'cancelled'
    customer_name text not null,
    customer_phone text not null,
    total numeric(12, 2) not null,
    created_at timestamptz not null default now()
);

create table public.order_items (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.orders(id) on delete cascade,
    product_id uuid references public.products(id) on delete set null,
    quantity integer not null default 1,
    unit_price numeric(12, 2) not null
);

-- ==========================================
-- ÍNDICES PARA OPTIMIZAR QUERIES
-- ==========================================
create index idx_products_slug on public.products(slug);
create index idx_products_category_id on public.products(category_id);
create index idx_products_is_active_is_featured on public.products(is_active, is_featured);
create index idx_product_images_product_id on public.product_images(product_id);
create index idx_categories_slug on public.categories(slug);

-- ==========================================
-- TRIGGER PARA ACTUALIZAR EL CAMPO updated_at
-- ==========================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger trigger_update_products_updated_at
    before update on public.products
    for each row
    execute function public.handle_updated_at();

-- ==========================================
-- POLÍTICAS DE RLS (ROW LEVEL SECURITY)
-- ==========================================

-- Habilitar RLS en todas las tablas
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.admins enable row level security;
alter table public.site_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Función helper para verificar si el usuario logueado es admin
create or replace function public.is_admin()
returns boolean as $$
begin
    return exists (
        select 1 from public.admins 
        where user_id = auth.uid()
    );
end;
$$ language plpgsql security definer;

-- Políticas para Categorías
create policy "Lectura pública de categorías" 
    on public.categories for select 
    using (true);

create policy "Administradores pueden editar categorías" 
    on public.categories for all 
    using (public.is_admin());

-- Políticas para Productos
create policy "Lectura pública de productos activos" 
    on public.products for select 
    using (is_active = true and deleted_at is null);

create policy "Administradores pueden editar productos" 
    on public.products for all 
    using (public.is_admin());

-- Políticas para Imágenes de Productos
create policy "Lectura pública de imágenes" 
    on public.product_images for select 
    using (exists (
        select 1 from public.products 
        where id = product_images.product_id and is_active = true and deleted_at is null
    ));

create policy "Administradores pueden editar imágenes" 
    on public.product_images for all 
    using (public.is_admin());

-- Políticas para Admins (tabla de control)
create policy "Admins pueden ver tabla admins" 
    on public.admins for select 
    using (public.is_admin());

create policy "Usuarios pueden verificar su rol admin"
    on public.admins for select
    to authenticated
    using (user_id = auth.uid());

-- Permisos para que authenticated pueda leer su fila (RLS filtra por user_id)
grant select on public.admins to authenticated;

create policy "Superadmins pueden editar admins" 
    on public.admins for all 
    using (public.is_admin());

-- Políticas para Configuración del Sitio
create policy "Lectura pública de configuración" 
    on public.site_settings for select 
    using (true);

create policy "Administradores pueden editar configuración" 
    on public.site_settings for all 
    using (public.is_admin());

-- Políticas para Órdenes y Detalles (E-commerce futuro)
create policy "Administradores pueden gestionar órdenes" 
    on public.orders for all 
    using (public.is_admin());

create policy "Administradores pueden gestionar items de órdenes" 
    on public.order_items for all 
    using (public.is_admin());


-- ==========================================
-- POLÍTICAS DE STORAGE (BUCKET: product-images)
-- ==========================================

-- Insertar bucket si no existe
insert into storage.buckets (id, name, public) 
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Crear políticas para el bucket 'product-images'
create policy "Acceso público de lectura a imágenes del storage"
    on storage.objects for select
    using (bucket_id = 'product-images');

create policy "Solo administradores pueden subir imágenes al storage"
    on storage.objects for insert
    with check (bucket_id = 'product-images' and public.is_admin());

create policy "Solo administradores pueden actualizar imágenes del storage"
    on storage.objects for update
    using (bucket_id = 'product-images' and public.is_admin());

create policy "Solo administradores pueden eliminar imágenes del storage"
    on storage.objects for delete
    using (bucket_id = 'product-images' and public.is_admin());


-- ==========================================
-- DATOS SEMILLA (SEED DATA)
-- ==========================================

-- Seed de Categorías
insert into public.categories (id, name, slug) values
('c1000000-0000-0000-0000-000000000001', 'Smartphones', 'smartphones'),
('c1000000-0000-0000-0000-000000000002', 'Audio', 'audio'),
('c1000000-0000-0000-0000-000000000003', 'Accesorios', 'accesorios')
on conflict (id) do nothing;

-- Seed de Configuración del Sitio
insert into public.site_settings (id, whatsapp_number, instagram_url, email, hero_title, hero_subtitle) values
(1, '2915224734', 'https://instagram.com/seamoscomoninos', 'contacto@seamoscomoninos.com', 'SCN — Seamos como niños', 'Tu catálogo de tecnología favorito. Los mejores dispositivos y accesorios electrónicos, listos para tu hogar o regalo, con asesoría personalizada directa por WhatsApp.')
on conflict (id) do nothing;

-- Seed de Productos
insert into public.products (id, name, slug, short_description, description, price, category_id, is_featured, is_active, sku, stock, includes) values
(
    'a1000000-0000-4000-8000-000000000001', 
    'Auriculares Bluetooth Noise Cancelling SCN-900', 
    'auriculares-bluetooth-noise-cancelling-scn-900',
    'Auriculares inalámbricos de alta definición con cancelación de ruido activa.',
    'Disfrutá de tu música favorita sin interrupciones con los SCN-900. Cuentan con un sistema de cancelación de ruido híbrido que bloquea hasta el 95% del sonido ambiente, almohadillas de memory foam ultra suaves para máxima comodidad durante horas, y una batería de larga duración de hasta 40 horas con carga rápida USB-C.',
    89999.00, 
    'c1000000-0000-0000-0000-000000000002', 
    true, 
    true, 
    'AUD-SCN-900', 
    15, 
    '["Auriculares SCN-900", "Estuche rígido de viaje", "Cable de carga USB-C", "Cable auxiliar de 3.5mm", "Guía rápida de usuario"]'::jsonb
),
(
    'a1000000-0000-4000-8000-000000000002', 
    'Smartphone SCN Nexus S24 256GB', 
    'smartphone-scn-nexus-s24-256gb',
    'El celular definitivo con cámara Pro de 108MP y pantalla AMOLED de 120Hz.',
    'Viví la potencia absoluta con el SCN Nexus S24. Equipado con un procesador de última generación, 8GB de memoria RAM, y 256GB de almacenamiento interno. Su pantalla AMOLED ofrece colores vibrantes y negros perfectos para disfrutar tus contenidos favoritos, y su batería de 5000mAh te acompaña durante todo el día sin problemas.',
    649999.00, 
    'c1000000-0000-0000-0000-000000000001', 
    true, 
    true, 
    'CEL-SCN-S24', 
    8, 
    '["Smartphone SCN Nexus S24", "Funda de silicona transparente", "Cargador rápido de 45W", "Cable USB-C a USB-C", "Extractor de bandeja SIM"]'::jsonb
),
(
    'a1000000-0000-4000-8000-000000000003', 
    'Cargador Inalámbrico Magnético SCN-MagSafe 15W', 
    'cargador-inalambrico-magnetico-scn-magsafe-15w',
    'Carga inalámbrica rápida y magnética compatible con iPhones y dispositivos con Qi.',
    'Cargá tus dispositivos de la forma más cómoda con el SCN-MagSafe. Diseñado con imanes de alta potencia que se alinean a la perfección con tu dispositivo para una carga óptima de hasta 15W. Estructura de aluminio anodizado ultra delgada con cable integrado de nylon trenzado de 1.2 metros.',
    24999.00, 
    'c1000000-0000-0000-0000-000000000003', 
    false, 
    true, 
    'ACC-SCN-MAG', 
    50, 
    '["Cargador SCN-MagSafe con cable integrado", "Manual de instrucciones y garantía"]'::jsonb
),
(
    'a1000000-0000-4000-8000-000000000004', 
    'Parlante Bluetooth Impermeable SCN Groove 2', 
    'parlante-bluetooth-impermeable-scn-groove-2',
    'Parlante portátil de 20W, protección IPX7 y graves profundos.',
    'Llevá la fiesta a cualquier parte con el SCN Groove 2. Certificación IPX7 resistente al agua para usarlo en la pileta, la playa o bajo la lluvia. Con 20W de potencia y radiadores pasivos duales que logran graves asombrosos. Sincronización estéreo TWS para conectar dos parlantes simultáneamente.',
    47999.00, 
    'c1000000-0000-0000-0000-000000000002', 
    true, 
    true, 
    'AUD-SCN-GROOVE', 
    25, 
    '["Parlante SCN Groove 2", "Correa de mano desmontable", "Cable de carga USB-C", "Guía de usuario"]'::jsonb
),
(
    'a1000000-0000-4000-8000-000000000005', 
    'Smartwatch SCN Active Fit 3', 
    'smartwatch-scn-active-fit-3',
    'Reloj inteligente deportivo con GPS, monitor de ritmo cardíaco y oxígeno.',
    'El compañero ideal para entrenar. El SCN Active Fit 3 cuenta con monitoreo de salud 24/7 (frecuencia cardíaca, SpO2, sueño, estrés), más de 100 modos deportivos con GPS integrado de alta precisión para registrar tus rutas de carrera o ciclismo, pantalla táctil HD a todo color y notificaciones inteligentes.',
    69999.00, 
    'c1000000-0000-0000-0000-000000000003', 
    true, 
    true, 
    'ACC-SCN-FIT3', 
    12, 
    '["Smartwatch SCN Active Fit 3", "Malla de silicona deportiva", "Base de carga magnética USB", "Manual de usuario"]'::jsonb
),
(
    'a1000000-0000-4000-8000-000000000006', 
    'Auriculares In-Ear Inalámbricos SCN Buds Pro', 
    'auriculares-in-ear-inalambricos-scn-buds-pro',
    'Auriculares in-ear ultralivianos con sonido Hi-Fi y estuche con carga inalámbrica.',
    'Máxima fidelidad en formato miniatura. Los SCN Buds Pro ofrecen una acústica cristalina con graves reforzados. Con cancelación de ruido ambiental (ENC) en micrófonos para llamadas perfectas de trabajo o de juego. Resistencia a salpicaduras IPX5 y estuche de carga inteligente compatible con carga Qi.',
    32999.00, 
    'c1000000-0000-0000-0000-000000000002', 
    false, 
    true, 
    'AUD-SCN-BUDS', 
    30, 
    '["Auriculares SCN Buds Pro (L/R)", "Estuche de carga inalámbrica", "3 pares de almohadillas de silicona (S/M/L)", "Cable USB-C", "Manual"]'::jsonb
),
(
    'a1000000-0000-4000-8000-000000000007', 
    'Powerbank SCN TurboCharge 20000mAh', 
    'powerbank-scn-turbocharge-20000mah',
    'Batería portátil de gran capacidad con carga súper rápida PD de 22.5W.',
    'No te quedes sin batería nunca más. Cargá tu teléfono hasta 5 veces completas con el SCN TurboCharge. Equipado con un puerto USB-C bidireccional Power Delivery de 20W y dos puertos USB-A Quick Charge 3.0. Pantalla LED digital inteligente que indica el porcentaje exacto de carga disponible.',
    19999.00, 
    'c1000000-0000-0000-0000-000000000003', 
    false, 
    true, 
    'ACC-SCN-POWER', 
    40, 
    '["Batería portátil SCN TurboCharge 20000mAh", "Cable USB-A a USB-C de carga rápida", "Funda de transporte suave", "Manual"]'::jsonb
),
(
    'a1000000-0000-4000-8000-000000000008', 
    'Adaptador de Carga Ultra Rápido GaN SCN-PD 65W', 
    'adaptador-de-carga-ultra-rapido-gan-scn-pd-65w',
    'Cargador de pared compacto con tecnología GaN, con 2 puertos USB-C y 1 USB-A.',
    'Un solo cargador para todos tus dispositivos. Gracias a la tecnología de nitruro de galio (GaN), este cargador es la mitad de tamaño de uno convencional, genera menos calor y es capaz de entregar hasta 65W para alimentar laptops, tablets, consolas y smartphones rápidamente al mismo tiempo.',
    28999.00, 
    'c1000000-0000-0000-0000-000000000003', 
    false, 
    true, 
    'ACC-SCN-GAN65', 
    20, 
    '["Cargador de pared GaN 65W", "Guía de bienvenida y especificaciones técnicas"]'::jsonb
)
on conflict (id) do nothing;

-- Seed de Imágenes de Productos (Unsplash URLs confiables para el catálogo)
insert into public.product_images (id, product_id, storage_path, position, is_cover) values
('b1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80', 1, true),
('b1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80', 1, true),
('b1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', 'https://images.unsplash.com/photo-1622445262465-2481c4574875?auto=format&fit=crop&w=800&q=80', 1, true),
('b1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80', 1, true),
('b1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000005', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80', 1, true),
('b1000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-000000000006', 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80', 1, true),
('b1000000-0000-4000-8000-000000000007', 'a1000000-0000-4000-8000-000000000007', 'https://images.unsplash.com/photo-1609592424085-f5b225577239?auto=format&fit=crop&w=800&q=80', 1, true),
('b1000000-0000-4000-8000-000000000008', 'a1000000-0000-4000-8000-000000000008', 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80', 1, true)
on conflict (id) do nothing;
