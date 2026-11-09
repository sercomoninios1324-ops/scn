import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured =
  supabaseUrl.length > 0 &&
  supabaseAnonKey.length > 0 &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseUrl.includes('YOUR_PROJECT');

let clientPromise: Promise<SupabaseClient | null> | null = null;

/**
 * Cliente de Supabase (solo auth del admin). Se carga bajo demanda para que
 * el catálogo público no descargue supabase-js (~45 KB gzip) en cada visita.
 */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(supabaseUrl, supabaseAnonKey)
    );
  }
  return clientPromise;
}

/** ¿Hay una sesión de Supabase guardada en este navegador? (sin cargar supabase-js) */
export function hasStoredSupabaseSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) return true;
    }
  } catch {
    /* storage bloqueado */
  }
  return false;
}
