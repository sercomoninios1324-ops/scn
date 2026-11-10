import fs from 'fs';
import path from 'path';

/**
 * Almacén JSON para desarrollo local sin Supabase (sorteos y métricas).
 * En producción (Vercel) siempre se usa Supabase.
 */
export function createLocalStore<T>(dataDir: string, file: string, initial: T) {
  const filePath = path.join(dataDir, file);
  let memory: T | null = null;

  const read = (): T => {
    if (memory) return memory;
    try {
      if (fs.existsSync(filePath)) {
        memory = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
        return memory;
      }
    } catch (err) {
      console.error(`Error leyendo ${file}:`, err);
    }
    memory = JSON.parse(JSON.stringify(initial)) as T;
    return memory;
  };

  const write = (data: T) => {
    memory = data;
    try {
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error(`Error escribiendo ${file}:`, err);
    }
  };

  return { read, write };
}

/** Rate limit simple en memoria (por instancia). */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (key: string): boolean => {
    const now = Date.now();
    const prev = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (prev.length >= limit) {
      hits.set(key, prev);
      return false;
    }
    prev.push(now);
    hits.set(key, prev);
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
    }
    return true;
  };
}

/** Error de PostgREST por tabla/función inexistente (migración sin correr). */
export function isMissingRelation(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  const msg = String(e?.message || '').toLowerCase();
  return (
    e?.code === '42P01' ||
    e?.code === 'PGRST205' ||
    e?.code === 'PGRST202' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('could not find the function')
  );
}

export const MIGRATION_HINT =
  'Faltan las tablas de sorteos y métricas en la base. Hay que correr supabase_migration_sorteos_metricas.sql en Supabase.';
