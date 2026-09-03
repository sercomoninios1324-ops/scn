import { supabase } from './supabase';

const DEV_TOKEN_KEY = 'scn_dev_admin_token';

export function getDevAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(DEV_TOKEN_KEY);
}

export function setDevAdminToken(token: string) {
  localStorage.setItem(DEV_TOKEN_KEY, token);
}

export function clearDevAdminToken() {
  localStorage.removeItem(DEV_TOKEN_KEY);
}

export async function getAuthToken(): Promise<string | null> {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }
  return getDevAdminToken();
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

export async function safeJson(res: Response): Promise<unknown> {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  const text = await res.text();
  throw new Error(
    `Error del servidor (${res.status}): Respuesta inesperada. ${text.substring(0, 120)}`
  );
}
