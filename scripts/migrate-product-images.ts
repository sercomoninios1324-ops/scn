/**
 * One-shot: re-encodea product_images a WebP y actualiza storage_path.
 * No borra el original hasta que la nueva URL responda 200.
 *
 * Uso:
 *   npx tsx scripts/migrate-product-images.ts           # data/db.json
 *   npx tsx scripts/migrate-product-images.ts --supabase # product_images via service role
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { encodeProductWebp, newProductImageName } from '../server/imageProcess';

dotenv.config();

const ROOT = process.cwd();
const DB_PATH = path.join(ROOT, 'data', 'db.json');
const useSupabase = process.argv.includes('--supabase');

type ImgRow = {
  id: string;
  product_id: string;
  storage_path: string;
  position?: number;
  is_cover?: boolean;
};

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function urlOk(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (res.ok) return true;
    const get = await fetch(url, { method: 'GET', redirect: 'follow' });
    return get.ok;
  } catch {
    return false;
  }
}

function localPathFromUploads(storagePath: string): string | null {
  if (!storagePath.startsWith('/uploads/')) return null;
  const name = storagePath.slice('/uploads/'.length);
  if (!name || name.includes('..') || name.includes('/')) return null;
  return path.join(ROOT, 'uploads', name);
}

async function loadSource(storagePath: string): Promise<Buffer> {
  const local = localPathFromUploads(storagePath);
  if (local && fs.existsSync(local)) {
    return fs.readFileSync(local);
  }
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    return fetchBuffer(storagePath);
  }
  throw new Error(`origen no legible: ${storagePath}`);
}

async function migrateLocal() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) as {
    product_images: ImgRow[];
  };
  const uploadsDir = path.join(ROOT, 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });

  let updated = 0;
  for (const img of db.product_images) {
    if (!img.storage_path || img.storage_path.includes('_opt.webp') || img.storage_path.endsWith('.webp')) {
      // Ya WebP de upload nuevo: igual re-encodea remotos pesados; saltea si ya es prod_…webp local opt
      if (/\.webp(\?|$)/i.test(img.storage_path) && img.storage_path.includes('/product-images/')) {
        console.log('skip (ya webp bucket):', img.id);
        continue;
      }
      if (img.storage_path.startsWith('/uploads/') && img.storage_path.endsWith('.webp')) {
        console.log('skip (uploads webp):', img.id);
        continue;
      }
    }

    try {
      const raw = await loadSource(img.storage_path);
      const webp = await encodeProductWebp(raw);
      const name = newProductImageName().replace('.webp', '_opt.webp');
      const dest = path.join(uploadsDir, name);
      fs.writeFileSync(dest, webp);
      if (!fs.existsSync(dest) || fs.statSync(dest).size < 1) {
        throw new Error('archivo nuevo inválido');
      }
      const newPath = `/uploads/${name}`;
      console.log('ok', img.id, '→', newPath, `(${webp.length} bytes)`);
      img.storage_path = newPath;
      updated += 1;
    } catch (err) {
      console.warn('fail', img.id, err instanceof Error ? err.message : err);
    }
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  console.log(`Listo local: ${updated} imágenes actualizadas en ${DB_PATH}`);
}

async function migrateSupabase() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) {
    throw new Error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  }
  const supabase = createClient(url, key);

  const { data: rows, error } = await supabase.from('product_images').select('*');
  if (error) throw error;

  let updated = 0;
  for (const img of (rows || []) as ImgRow[]) {
    if (/\.webp(\?|$)/i.test(img.storage_path) && img.storage_path.includes('_opt')) {
      console.log('skip:', img.id);
      continue;
    }
    try {
      const raw = await loadSource(img.storage_path);
      const webp = await encodeProductWebp(raw);
      const name = newProductImageName().replace('.webp', '_opt.webp');
      const { error: upErr } = await supabase.storage.from('product-images').upload(name, webp, {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('product-images').getPublicUrl(name);
      const newUrl = pub.publicUrl;
      if (!(await urlOk(newUrl))) {
        throw new Error(`nueva URL no responde 200: ${newUrl}`);
      }
      const { error: updErr } = await supabase
        .from('product_images')
        .update({ storage_path: newUrl })
        .eq('id', img.id);
      if (updErr) throw updErr;
      console.log('ok', img.id, '→', newUrl, `(${webp.length} bytes)`);
      updated += 1;
    } catch (err) {
      console.warn('fail', img.id, err instanceof Error ? err.message : err);
    }
  }
  console.log(`Listo supabase: ${updated} imágenes actualizadas`);
}

async function main() {
  if (useSupabase) await migrateSupabase();
  else await migrateLocal();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
