# HANDOFF — SCN (Seamos como niños)

Documento para la próxima IA / dev: estado del repo, **qué falta**, **qué pulir**, y **cómo enganchar el Supabase ya existente**.  
No editar el plan en `.cursor/plans/`; este archivo es la fuente operativa actual.

> **Actualización 2026-11-09** — Guía para humanos: **`DEPLOY.md`**. SQL único para el proyecto vivo:
> **`supabase_setup_produccion.sql`** (idempotente; reemplaza correr a mano cart_shares + compare_at_price + grants).
> Diagnóstico: **`npm run check:supabase`**.
>
> Hecho en esta pasada (no rehacer):
> - **Perf front:** code-splitting por ruta, `LazyMotion` (motion `m`), WebGL (`ElectricLogo`/`ElectricBorder`) en chunks lazy,
>   supabase-js solo se descarga con sesión admin o en `/personal` (`getSupabase()`), fuentes async, logo transparente
>   pre-generado (`src/assets/scn-logo-alpha.png`, `scn-logo-192.webp`; se eliminó `useTransparentLogo`),
>   `srcset/sizes` en tarjetas/ficha/hero, sin `backdrop-filter` en tarjetas en celular. Bundle inicial 236 KB → 125 KB gzip.
> - **API:** `Cache-Control s-maxage=60` en GET públicos; en prod (VERCEL) nunca cae a `db.json` (503) y `dev-login` desactivado;
>   proxy `/api/img` restringido al bucket `product-images` del proyecto configurado; limpieza oportunista de `cart_shares` vencidos;
>   `/sitemap.xml` y `/robots.txt` dinámicos desde la API (se borraron los estáticos de `public/`, apuntaban a scnbb.vercel.app).
> - **SEO:** canonical/og:url/JSON-LD siempre `https://somos-scn.com.ar` (antes usaba `window.location.origin`);
>   links de WhatsApp/pedidos usan el dominio oficial (`linkOrigin()`); `noindex` en `/personal`, carrito, pedidos y 404 de producto;
>   email unificado al real (`sercomoninios1324@gmail.com`); favicon 5 KB, apple-touch-icon, `site.webmanifest`; tema aplicado antes del primer pintado.
> - **UX mobile:** destacados (6 en celular / 8 en PC, “Ver todos” compacto + CTA abajo), barra de compra fija en la ficha,
>   header de ficha compacto, chips de filtro y links de footer con área táctil ≥ 36 px, inputs 16 px (sin zoom iOS), foco visible.
> - **Vercel:** redirect `www → apex`, HSTS, cache inmutable de `/assets`, `.vercelignore`.
> - Código muerto sin uso (no entra al bundle): `GhostFibers`, `Lightning`, `SoftAurora`, `SpecularButton`, `StrokeText`,
>   `effects/Lazy*`, `OccasionalLightning`, `components/ui/button`, deps `gsap`, `@base-ui/react`, `shadcn`, `cn`, `class-variance-authority`
>   y la carpeta `scn-main/`. Se pueden borrar cuando haya git.

---

## 1. Qué es

Catálogo público de tecnología (Bahía Blanca) + admin + pedidos por WhatsApp con código corto (`/pedido/CODE`).

| Pieza | Tech |
|--------|------|
| Front | React 19 + Vite + Tailwind 4 + React Router |
| API | Express (`server/app.ts`) empaquetado a `api/bundle.cjs` para Vercel |
| Datos prod | **Supabase** (Postgres + Auth + Storage bucket `product-images`) |
| Datos local sin env | `data/db.json` (+ `uploads/`, `data/cart-shares.json`) |
| Deploy objetivo | Vercel + dominio canónico `https://somos-scn.com.ar` |

Proyecto Supabase **ya en uso** (URLs de fotos en `data/db.json` / catálogo):

```text
https://vanlkqadbdplussonwuf.supabase.co
```

Bucket público esperado: `product-images`.

---

## 2. Conectar al Supabase existente (obligatorio en prod)

### 2.1 Variables (local `.env` y Vercel → Settings → Environment Variables)

Copiar desde `.env.example`. **No commitear** `.env`.

```bash
# Canónico
SITE_URL=https://somos-scn.com.ar
VITE_SITE_URL=https://somos-scn.com.ar

# Mismo proyecto en server y cliente
SUPABASE_URL=https://vanlkqadbdplussonwuf.supabase.co
VITE_SUPABASE_URL=https://vanlkqadbdplussonwuf.supabase.co

# Dashboard → Project Settings → API
SUPABASE_ANON_KEY=...          # o VITE_SUPABASE_ANON_KEY
VITE_SUPABASE_ANON_KEY=...     # misma anon key
SUPABASE_SERVICE_ROLE_KEY=...  # SOLO server / scripts — NUNCA en el front
```

Reglas del código (`server/app.ts`):

- Si faltan URL + service role → cae a `data/db.json` (mensaje: “Supabase no configurado”).
- `SUPABASE_URL` y `VITE_SUPABASE_URL` deben coincidir.
- `SERVICE_ROLE` ≠ anon key.
- Front usa solo anon (`src/lib/supabase.ts`).
- Admin real: Supabase Auth + fila en `public.admins`. Token `ADMIN_DEV_TOKEN` es bypass de desarrollo.

### 2.2 SQL que hay que correr en el proyecto ya creado

El schema base suele estar. Falta aplicar **migraciones incrementales** en el SQL Editor:

1. **`supabase_migration_cart_shares.sql`** — tabla `cart_shares` (pedidos WhatsApp durables entre instancias serverless). Sin esto, en Vercel los códigos pueden 404.
2. **`supabase_migration_compare_at_price.sql`** — columna `compare_at_price` (si aún no está).
3. Si el health (`GET /api/health`) marca error de API en tablas: **`supabase_data_api_grants.sql`**.
4. Tras crear `cart_shares`, conviene GRANT a `service_role` (la API escribe con service role; RLS sin policies públicas es intencional):

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_shares TO service_role;
```

Verificar admin:

```sql
select * from public.admins;
-- el user_id debe existir en auth.users
```

### 2.3 Scripts one-shot **contra Supabase** (aún no corridos en prod)

En local ya se llenaron shorts en `data/db.json`. **Supabase probablemente NO tiene** esos `short_description` ni las fotos re-encodeadas a WebP.

Con `.env` cargado (service role):

```bash
npm install
npm run fill:shorts:supabase      # completa short_description vacíos (no pisa los que ya tienen texto)
npm run migrate:images:supabase   # PNG/JPEG → WebP en bucket, actualiza storage_path; no borra original si la URL nueva no da 200
```

Código: `scripts/fill-short-descriptions.ts`, `scripts/migrate-product-images.ts`.

---

## 3. Qué YA está hecho en el código (no rehacer)

- Upload admin seguro: MIME whitelist, sharp → WebP, nombre `prod_*.webp`, cache largo en Storage; rechazo claro en Admin UI.
- Validación `storage_path` en POST/PUT productos (solo `*.supabase.co/.../product-images/...` o `/uploads/<seguro>`).
- SEO/canónico/OG/JSON-LD → `somos-scn.com.ar` (`index.html`, `src/lib/seo.ts`).
- CORS: `somos-scn.com.ar` + `www`.
- `cart_shares` en API: Supabase si hay client; si no, archivo local; TTL 30 días; rate limit 20/min/IP (in-memory).
- `/api/img`: sin `startWarm()` si `VERCEL`; cache `/tmp` en Vercel; **302 al original** si falla transform.
- 23 `short_description` en **`data/db.json`** (local).
- `.gitignore`, `.env.example`, scripts npm, `tsc` + `build` OK al momento del hardening.

---

## 4. Qué FALTA hacer (prioridad)

### P0 — Producción usable

1. **Env en Vercel** con el proyecto `vanlkqadbdplussonwuf` (URL + anon + service role + `SITE_URL` / `VITE_SITE_URL`).
2. **Ejecutar SQL** `cart_shares` (+ grants + `compare_at_price` si falta).
3. **Redeploy** y smoke: home, catálogo, ficha con foto, crear share WhatsApp → abrir `/pedido/CODE` en otra “sesión”.
4. **Correr** `fill:shorts:supabase` y `migrate:images:supabase` (o aceptar PNGs pesados un tiempo más).
5. **DNS** del dominio (lo hace el humano en el registrante): CNAME a Vercel; en Vercel agregar `somos-scn.com.ar` / `www`.

### P1 — Datos / admin

- Confirmar usuario admin en `admins` + login con Supabase Auth (no solo `ADMIN_DEV_TOKEN`).
- Revisar 4–5 fichas (push + destacados) tras shorts/WebP.
- Limpieza opcional de objetos viejos en Storage **después** de verificar URLs nuevas 200 (el script no borra solos).

### P2 — Pulir (no bloquean deploy)

- **Peso front**: WebGL (ElectricBorder / ElectricLogo / auroras) sigue caro en mobile; ya se bajó un poco, pero se puede gatear más por `prefers-reduced-motion` / viewport.
- Rate limit de cart-shares es por instancia (Vercel multi-instance); si hay abuso, pasar a Upstash/Redis o edge config.
- Job periódico: `delete from cart_shares where expires_at < now();`
- GRANT/documentar `cart_shares` en `supabase_data_api_grants.sql` para installs nuevas.
- `package.json` name sigue en `react-example` (cosmética).
- Unificar fuentes de verdad: hoy `data/db.json` puede divergir de Supabase; en prod **manda Supabase**.
- Revisar si `scn-main/` (carpeta anidada vieja) debe salir del repo/zip.
- `data/img-cache/` es cache local; no hace falta en Vercel (efímero).

---

## 5. Arquitectura rápida (para no romper cosas)

```text
Browser  →  Vite SPA (src/)
         →  /api/*  Express (server/app.ts → api/bundle.cjs en Vercel)
                    ├─ products/categories/settings  → Supabase (service role) o db.json
                    ├─ POST /api/admin/upload        → Storage product-images o uploads/
                    ├─ /api/cart-shares              → tabla cart_shares o data/cart-shares.json
                    └─ /api/img?u=&w=                → sharp + cache (/tmp | data/img-cache)
WhatsApp → mensaje con código + link /pedido/CODE → hidrata carrito (src/lib/cartShare.ts)
```

Frontend catálogo: `CatalogContext` + `CatalogImage` / `displayImage` (proxy `/api/img` cuando aplica).

---

## 6. Comandos útiles

```bash
npm install
npm run dev          # API + Vite en :3000
npm run lint         # tsc --noEmit
npm run build        # dist/ + api/bundle.cjs
npm run fill:shorts:supabase
npm run migrate:images:supabase
```

Health / debug admin API: `GET /api/health` (incluye chequeo `admins`).

---

## 7. Smoke checklist post-conexión

- [ ] `GET /api/products` trae datos de Supabase (no el seed local vacío/distinto).
- [ ] Login admin con usuario real (fila en `admins`).
- [ ] Subir PNG en admin → URL `.webp` en bucket; rechazo de PDF con mensaje claro.
- [ ] Producto nuevo/editado no acepta Unsplash / URLs arbitrarias.
- [ ] `POST /api/cart-shares` → fila en `cart_shares` → `GET` OK desde otra cold start.
- [ ] Ficha con foto carga (proxy o URL directa WebP).
- [ ] Canonical/OG apuntan a `https://somos-scn.com.ar`.
- [ ] Dominio + HTTPS en Vercel.

---

## 8. Decisiones ya cerradas (no reabrir sin el humano)

- Host: **Vercel**.
- Dominio canónico: **somos-scn.com.ar**.
- Textos cortos: estrategia **2A+2B** (recortar `description` si sirve; si no, frase neutra nombre + categoría **sin inventar specs**).
- Pedidos WhatsApp: **solo código corto** + path `/pedido/CODE` (no listar todo el carrito en el mensaje).
- No rewrite visual del front ni cambio de look “porque sí”.

---

## 9. Archivos clave

| Path | Rol |
|------|-----|
| `server/app.ts` | API, CORS, admin, upload, cart-shares, productos |
| `server/imageProcess.ts` | WebP + sanitización paths |
| `server/imageProxy.ts` | `/api/img` serverless-aware |
| `src/lib/supabase.ts` | Cliente browser |
| `src/lib/cartShare.ts` / `CartView.tsx` | UX pedido WhatsApp |
| `src/views/AdminView.tsx` | Admin + upload |
| `supabase_migration_cart_shares.sql` | SQL pendiente en proyecto vivo |
| `scripts/*.ts` | Migración imágenes / shorts |
| `.env.example` | Plantilla env |
| `vercel.json` | Rewrites SPA + API |

---

## 10. Primera tarea sugerida para la IA siguiente

1. Pedir/confirmar keys del proyecto `vanlkqadbdplussonwuf` (sin pegar service role en el chat si se puede evitar).
2. Aplicar SQL `cart_shares` + grant service_role.
3. Configurar env Vercel + local.
4. `fill:shorts:supabase` + `migrate:images:supabase`.
5. Smoke de la sección 7.
6. Solo después: pulido performance mobile / rate-limit durable.
)