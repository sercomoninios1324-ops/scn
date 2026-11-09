/**
 * Completa short_description vacíos (2A+2B):
 * - Si hay description útil → primera frase limpia (~120 chars)
 * - Si no → frase comercial neutra con nombre + categoría (sin inventar specs)
 *
 * Uso:
 *   npx tsx scripts/fill-short-descriptions.ts
 *   npx tsx scripts/fill-short-descriptions.ts --supabase
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { formatCategoryLabel } from '../src/lib/formatCategory';

dotenv.config();

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');
const useSupabase = process.argv.includes('--supabase');
const MAX_LEN = 120;

function stripHtml(raw: string): string {
  return raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const SMALL = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'a', 'en', 'con', 'para', 'por']);
const ACRONYMS: Record<string, string> = {
  usb: 'USB',
  otg: 'OTG',
  rgb: 'RGB',
  sd: 'SD',
  pc: 'PC',
  ps2: 'PS2',
  jbl: 'JBL',
  hdmi: 'HDMI',
  led: 'LED',
};

function readableName(raw: string): string {
  const spaced = raw.replace(/\s+/g, ' ').trim();
  if (!spaced) return '';
  return spaced
    .split(' ')
    .map((token, index) => {
      if (!token) return token;
      const parts = token.split('/').map((piece) => {
        const key = piece.toLowerCase().replace(/[^a-záéíóúüñ0-9]/gi, '');
        if (ACRONYMS[key]) return piece.replace(new RegExp(key, 'i'), ACRONYMS[key]);
        if (SMALL.has(key) && index > 0) return key;
        if (/^[A-ZÁÉÍÓÚÜÑ0-9.,+\-]+$/.test(piece) || piece === piece.toUpperCase()) {
          return piece.charAt(0).toUpperCase() + piece.slice(1).toLowerCase();
        }
        return piece.charAt(0).toUpperCase() + piece.slice(1);
      });
      return parts.join('/');
    })
    .join(' ');
}

function firstSentence(text: string): string {
  const clean = stripHtml(text);
  if (!clean) return '';
  const match = clean.match(/^(.+?[.!?])(?:\s|$)/);
  const sentence = (match ? match[1] : clean).trim();
  if (sentence.length <= MAX_LEN) return sentence;
  const cut = sentence.slice(0, MAX_LEN - 1);
  const sp = cut.lastIndexOf(' ');
  return (sp > 40 ? cut.slice(0, sp) : cut).trimEnd() + '…';
}

function neutralShort(name: string, categoryName: string): string {
  const n = readableName(name);
  const cat = formatCategoryLabel(categoryName) || 'Accesorios';
  const base = `${n} — ${cat} para el día a día. Consultá disponibilidad por WhatsApp.`;
  if (base.length <= MAX_LEN) return base;
  const short = `${n} — ${cat}. Consultá por WhatsApp.`;
  if (short.length <= MAX_LEN) return short;
  return firstSentence(short);
}

function deriveShort(product: {
  name: string;
  description?: string | null;
  short_description?: string | null;
  categoryName?: string;
}): string | null {
  if (product.short_description && String(product.short_description).trim()) return null;
  const fromDesc = firstSentence(product.description || '');
  if (fromDesc && fromDesc.length >= 24) return fromDesc;
  return neutralShort(product.name, product.categoryName || '');
}

async function fillLocal() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) as {
    products: Array<{
      id: string;
      name: string;
      description?: string;
      short_description?: string;
      category_id?: string;
    }>;
    categories: Array<{ id: string; name: string }>;
  };
  const cats = Object.fromEntries(db.categories.map((c) => [c.id, c.name]));
  let n = 0;
  for (const p of db.products) {
    const next = deriveShort({
      name: p.name,
      description: p.description,
      short_description: p.short_description,
      categoryName: cats[p.category_id || ''],
    });
    if (!next) continue;
    p.short_description = next;
    n += 1;
    console.log(p.name, '→', next);
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  console.log(`Actualizados ${n} short_description en db.json`);
}

async function fillSupabase() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) throw new Error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(url, key);

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, description, short_description, category_id, categories(name)')
    .is('deleted_at', null);
  if (error) throw error;

  let n = 0;
  for (const row of products || []) {
    const cat = (row as { categories?: { name?: string } | null }).categories?.name || '';
    const next = deriveShort({
      name: row.name,
      description: row.description,
      short_description: row.short_description,
      categoryName: cat,
    });
    if (!next) continue;
    const { error: upd } = await supabase
      .from('products')
      .update({ short_description: next })
      .eq('id', row.id);
    if (upd) {
      console.warn('fail', row.id, upd.message);
      continue;
    }
    n += 1;
    console.log(row.name, '→', next);
  }
  console.log(`Actualizados ${n} short_description en Supabase`);
}

async function main() {
  if (useSupabase) await fillSupabase();
  else await fillLocal();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
