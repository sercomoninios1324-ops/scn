/**
 * Diagnóstico de la conexión con el Supabase de producción.
 * Solo lee, salvo un pedido de prueba en cart_shares que se crea y se borra al instante.
 *
 * Uso:  npm run check:supabase
 * Requiere .env con SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y SUPABASE_ANON_KEY.
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const url = (process.env.SUPABASE_URL || '').trim();
const viteUrl = (process.env.VITE_SUPABASE_URL || '').trim();
const service = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const anon = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
const viteAnon = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();
const siteUrl = (process.env.SITE_URL || '').trim();

let failures = 0;
let warnings = 0;
const ok = (msg: string) => console.log(`  ✔ ${msg}`);
const fail = (msg: string) => {
  failures++;
  console.log(`  ✘ ${msg}`);
};
const warn = (msg: string) => {
  warnings++;
  console.log(`  ⚠ ${msg}`);
};

async function main() {
  console.log('\n1) Variables de entorno');
  if (!url || url.includes('YOUR_PROJECT')) fail('Falta SUPABASE_URL');
  else ok(`SUPABASE_URL = ${url}`);
  if (viteUrl && viteUrl !== url) fail('VITE_SUPABASE_URL no coincide con SUPABASE_URL');
  else if (!viteUrl) fail('Falta VITE_SUPABASE_URL (el login del admin no va a funcionar)');
  else ok('VITE_SUPABASE_URL coincide');
  if (!service) fail('Falta SUPABASE_SERVICE_ROLE_KEY');
  else ok('SUPABASE_SERVICE_ROLE_KEY presente');
  if (!anon) fail('Falta SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY');
  else ok('Anon key presente');
  if (!viteAnon) fail('Falta VITE_SUPABASE_ANON_KEY (necesaria para el front)');
  if (service && anon && service === anon) fail('La service role key es igual a la anon key');
  if (siteUrl !== 'https://somos-scn.com.ar') warn(`SITE_URL = "${siteUrl || '(vacío)'}" (esperado https://somos-scn.com.ar)`);
  else ok('SITE_URL = https://somos-scn.com.ar');

  if (!url || !service) {
    console.log('\nNo se puede seguir sin URL + service role.\n');
    process.exit(1);
  }

  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

  console.log('\n2) Tablas');
  for (const table of ['categories', 'products', 'product_images', 'site_settings', 'admins', 'cart_shares']) {
    const { count, error } = await db.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      if (table === 'cart_shares') fail(`cart_shares: ${error.message} → correr supabase_setup_produccion.sql`);
      else fail(`${table}: ${error.message}`);
    } else ok(`${table}: ${count ?? 0} filas`);
  }

  const { error: colErr } = await db.from('products').select('compare_at_price').limit(1);
  if (colErr) fail(`Columna compare_at_price: ${colErr.message} → correr supabase_setup_produccion.sql`);
  else ok('Columna products.compare_at_price');

  console.log('\n3) Catálogo');
  const { data: products, error: prodErr } = await db
    .from('products')
    .select('id, name, slug, short_description, is_featured, is_push, images:product_images(storage_path)')
    .eq('is_active', true)
    .is('deleted_at', null);
  if (prodErr) fail(prodErr.message);
  else {
    const list = products || [];
    ok(`${list.length} productos activos (${list.filter((p) => p.is_featured).length} destacados)`);
    const noShort = list.filter((p) => !String(p.short_description || '').trim());
    if (noShort.length) warn(`${noShort.length} sin descripción corta → npm run fill:shorts:supabase`);
    else ok('Todos tienen descripción corta');
    const noImg = list.filter((p) => !(p.images as unknown[] | null)?.length);
    if (noImg.length) warn(`${noImg.length} sin foto: ${noImg.slice(0, 5).map((p) => p.slug).join(', ')}`);
    const allImgs = list.flatMap((p) => ((p.images as { storage_path: string }[] | null) || []).map((i) => i.storage_path));
    const heavy = allImgs.filter((s) => /\.(png|jpe?g)(\?|$)/i.test(s));
    if (heavy.length) warn(`${heavy.length} fotos todavía en PNG/JPG → npm run migrate:images:supabase (opcional)`);
    else ok('Fotos en WebP');
    const foreign = allImgs.filter((s) => s.startsWith('http') && !s.startsWith(url));
    if (foreign.length) warn(`${foreign.length} fotos apuntan fuera de este proyecto Supabase`);

    const sample = allImgs.find((s) => s.startsWith('http'));
    if (sample) {
      try {
        const res = await fetch(sample, { method: 'HEAD' });
        if (res.ok) ok('Foto de ejemplo accesible públicamente');
        else fail(`Foto de ejemplo devuelve HTTP ${res.status} (¿bucket product-images público?)`);
      } catch (e) {
        fail(`No se pudo bajar una foto de ejemplo: ${(e as Error).message}`);
      }
    }
  }

  console.log('\n4) Storage');
  const { data: bucket, error: bucketErr } = await db.storage.getBucket('product-images');
  if (bucketErr) fail(`Bucket product-images: ${bucketErr.message}`);
  else if (!bucket?.public) fail('El bucket product-images no es público');
  else ok('Bucket product-images público');

  console.log('\n5) Admin');
  const { data: admins, error: adminErr } = await db.from('admins').select('user_id, name');
  if (adminErr) fail(adminErr.message);
  else if (!admins?.length) fail('No hay ningún admin en public.admins (ver final de supabase_setup_produccion.sql)');
  else {
    for (const a of admins) {
      const { data: u, error: uErr } = await db.auth.admin.getUserById(a.user_id);
      if (uErr || !u?.user) fail(`Admin "${a.name}" (${a.user_id}) no existe en auth.users`);
      else ok(`Admin "${a.name}" → ${u.user.email}`);
    }
  }

  console.log('\n6) Pedidos WhatsApp (cart_shares)');
  const code = `TEST${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const { error: insErr } = await db.from('cart_shares').insert({
    code,
    items: [{ slug: 'prueba', qty: 1 }],
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  });
  if (insErr) fail(`No se pudo crear un pedido de prueba: ${insErr.message}`);
  else {
    const { data: row } = await db.from('cart_shares').select('code').eq('code', code).maybeSingle();
    if (row) ok('Crear y leer pedido funciona');
    else fail('El pedido de prueba no se pudo leer');
    await db.from('cart_shares').delete().eq('code', code);
  }

  if (anon) {
    const pub = createClient(url, anon, { auth: { persistSession: false } });
    const { error: anonShareErr, data: leaked } = await pub.from('cart_shares').select('code').limit(1);
    if (!anonShareErr && leaked && leaked.length) warn('cart_shares es legible con la anon key (debería estar cerrado por RLS)');
    else ok('cart_shares no es legible con la anon key (correcto)');
  }

  console.log(
    `\nResultado: ${failures ? `${failures} error(es)` : 'sin errores'}${warnings ? `, ${warnings} aviso(s)` : ''}.\n`
  );
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
