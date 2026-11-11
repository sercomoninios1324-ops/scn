# Puesta en producción — SCN (somos-scn.com.ar)

Guía paso a paso para dejar el sitio online con la base de datos **Supabase ya existente**
(proyecto `vanlkqadbdplussonwuf`). Tiempo estimado: 30–45 min + propagación DNS.

---

## 0. Requisitos

- Node 20 o superior (`node -v`)
- Acceso al dashboard de Supabase del proyecto `vanlkqadbdplussonwuf`
- Cuenta de Vercel (el proyecto se sube desde GitHub o con `npx vercel`)
- Dominio `somos-scn.com.ar` comprado en NIC Argentina

---

## 1. Claves de Supabase → archivo `.env` local

1. Supabase → **Project Settings → API**.
2. Copiar `.env.example` como `.env` y completar:
   - `SUPABASE_ANON_KEY` y `VITE_SUPABASE_ANON_KEY` → la clave **anon public** (la misma en las dos).
   - `SUPABASE_SERVICE_ROLE_KEY` → la clave **service_role** (secreta: nunca en el front, nunca con prefijo `VITE_`).
3. Las URLs y `SITE_URL` ya vienen completas en la plantilla.

## 2. Preparar la base de datos (una sola vez)

1. Supabase → **SQL Editor → New query**.
2. Pegar el contenido completo de **`supabase_setup_produccion.sql`** → **Run**.
   - Es idempotente (se puede correr dos veces) y **no toca productos, fotos ni admins**.
   - Crea la tabla de pedidos por WhatsApp (`cart_shares`), la columna de ofertas y los permisos.
   - Al final muestra: admins existentes, si el bucket de fotos es público y un resumen del catálogo.
3. Si la consulta de admins vino vacía, crear el usuario del cliente:
   - **Authentication → Users → Add user** (email + contraseña).
   - Copiar su UUID y correr: `insert into public.admins (user_id, name) values ('UUID', 'Administrador SCN');`

## 3. Verificar todo con un comando

```bash
npm install
npm run check:supabase
```

Revisa variables, tablas, bucket, admin y crea/borra un pedido de prueba.
Tiene que terminar en **"sin errores"** (los avisos ⚠ son opcionales).

### Opcional (recomendado): completar textos y aligerar fotos

```bash
npm run fill:shorts:supabase      # completa descripciones cortas vacías (no pisa las existentes)
npm run migrate:images:supabase   # PNG → WebP en el bucket (no borra originales)
```

El sitio ya sirve las fotos optimizadas a través de `/api/img`, así que la migración
es una mejora extra, no un requisito.

## 4. Probar en local con la base real

```bash
npm run dev
```

Abrir http://localhost:3000 y revisar: catálogo con los productos reales, una ficha,
agregar al carrito → "Comprar por WhatsApp" (genera un código), abrir `/pedido/CODIGO`,
y entrar a http://localhost:3000/personal con el usuario admin.

## 5. Deploy en Vercel

1. Importar el proyecto en Vercel (Framework preset: **Other**; build y output ya están en `vercel.json`).
2. **Settings → Environment Variables** (Production y Preview) — las mismas del `.env`:

   | Variable | Valor |
   |---|---|
   | `SITE_URL` | `https://somos-scn.com.ar` |
   | `VITE_SITE_URL` | `https://somos-scn.com.ar` |
   | `SUPABASE_URL` | `https://vanlkqadbdplussonwuf.supabase.co` |
   | `VITE_SUPABASE_URL` | `https://vanlkqadbdplussonwuf.supabase.co` |
   | `SUPABASE_ANON_KEY` | anon public |
   | `VITE_SUPABASE_ANON_KEY` | anon public |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role |

   ⚠ Las `VITE_*` se graban en el build: si las cambiás, hay que **redeployar**.
3. Deploy. Probar la URL `*.vercel.app` y `https://<tu-url>.vercel.app/api/health`
   (debe decir `supabaseConfigured: true`, `urlsMatch: true`, `adminsApi.ok: true`).

## 6. Dominio somos-scn.com.ar

1. Vercel → **Settings → Domains** → agregar `somos-scn.com.ar` y `www.somos-scn.com.ar`
   (el `www` redirige solo al dominio principal; ya está configurado en `vercel.json`).
2. En **NIC Argentina** (nic.ar → Mis dominios → Delegaciones), los dominios `.com.ar` se apuntan
   con servidores DNS. Lo más simple es delegar a Vercel:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`

   (Alternativa si el cliente usa otro DNS, p. ej. Cloudflare: registro **A** `@ → 76.76.21.21`
   y **CNAME** `www → cname.vercel-dns.com`.)
3. Esperar la propagación (de minutos a 24-48 h). Vercel emite el HTTPS automáticamente.

## 7. Después de publicar

- [ ] `https://somos-scn.com.ar` carga con candado (HTTPS).
- [ ] `https://www.somos-scn.com.ar` redirige a `https://somos-scn.com.ar`.
- [ ] `https://somos-scn.com.ar/sitemap.xml` lista todos los productos.
- [ ] Pedido por WhatsApp: el mensaje trae el link `https://somos-scn.com.ar/pedido/CODIGO` y abre bien desde otro celular.
- [ ] Login en `/personal` con el usuario del cliente; editar un producto y ver el cambio en el sitio (tarda hasta ~1 minuto por la caché del CDN).
- [ ] Dar de alta el sitio en **Google Search Console** y enviar `https://somos-scn.com.ar/sitemap.xml`.
- [ ] (Opcional) Ficha de Google Business con el link al sitio.

---

## 8. Google Analytics 4 + Tag Manager

Ya integrados en el código (no hay que pegar ningún snippet):
- **GA4** `G-1JWW3HCJKH`: recibe los eventos directo desde el sitio.
- **Tag Manager** `GTM-MS6SJLZ9`: cargado para sumar otras etiquetas (Meta, TikTok…) sin tocar código.
  **No agregar etiquetas de GA4 / Google tag adentro de Tag Manager**: se contaría todo doble.
- Para cambiar los IDs: variables `VITE_GA_ID` / `VITE_GTM_ID` en Vercel + Redeploy.

Pasos en GA4 (una sola vez):
1. Administrar → Flujos de datos → el flujo web → **Medición mejorada** (engranaje) →
   **desactivar "Cambios de página basados en eventos del historial"**. El sitio ya manda una página vista
   por cada página; con esa opción activada se contaría doble.
2. Administrar → Eventos (aparecen a las ~24 h del primer dato) → marcar **`begin_checkout`**
   (clic en Comprar por WhatsApp) y **`generate_lead`** (participación en sorteo) como **eventos clave**.

Eventos: `page_view` (uno por página; filtros/búsquedas del catálogo no suman), `view_item`, `add_to_cart`,
`begin_checkout` (ficha o carrito, con valor), `search`, `generate_lead`. Sin datos personales.
No se cargan en `localhost`, con "No contar este dispositivo" ni con la sesión del panel abierta.

### Notas técnicas

- **Caché:** el catálogo público se cachea 60 s en el CDN de Vercel (`s-maxage=60`). Las fotos
  optimizadas (`/api/img`) se cachean 1 año. El panel admin y los pedidos nunca se cachean.
- **Sin Supabase en producción no hay "modo demo":** si la base no responde, la API devuelve 503
  (no muestra datos viejos) y el login de desarrollo está desactivado.
- **Pedidos vencidos** (`cart_shares`, 30 días) se limpian solos desde la API.
