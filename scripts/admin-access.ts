/**
 * Acceso al panel /personal sin entrar al dashboard de Supabase.
 * Usa SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY del .env (las mismas de Vercel).
 *
 *   npm run admin                       → lista los admins (email, nombre, último ingreso)
 *   npm run admin -- --reset EMAIL      → contraseña nueva al azar para ese admin
 *   npm run admin -- --create EMAIL     → crea un usuario nuevo y lo hace admin
 *
 * La contraseña generada se muestra UNA vez en esta terminal. No se guarda en ningún archivo.
 */
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createClient, type User } from '@supabase/supabase-js';

dotenv.config();

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!url || !key) {
  console.error('\nFalta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el archivo .env');
  console.error('Copialas desde Vercel → proyecto scn → Settings → Environment Variables.\n');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

function newPassword(): string {
  // 16 caracteres sin ambiguos (0/O, 1/l/I)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(16);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

async function findUserByEmail(email: string) {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const users = data.users as User[];
    const hit = users.find((u) => (u.email || '').toLowerCase() === target);
    if (hit) return hit;
    if (users.length < 200) break;
  }
  return null;
}

async function listAdmins() {
  const { data: admins, error } = await db.from('admins').select('user_id, name');
  if (error) throw error;
  if (!admins?.length) {
    console.log('\nNo hay admins. Creá uno con:  npm run admin -- --create tu@email.com\n');
    return;
  }
  console.log('\nAdmins del panel /personal:\n');
  for (const a of admins) {
    const { data } = await db.auth.admin.getUserById(a.user_id);
    const u = data?.user;
    const last = u?.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString('es-AR') : 'nunca';
    console.log(`  • ${u?.email ?? '(usuario inexistente)'} — ${a.name} — último ingreso: ${last}`);
  }
  console.log('\nPara poner una contraseña nueva:  npm run admin -- --reset EMAIL\n');
}

function printCredentials(email: string, password: string) {
  console.log('\n────────────────────────────────────────────');
  console.log('  Panel:      https://somos-scn.com.ar/personal');
  console.log(`  Email:      ${email}`);
  console.log(`  Contraseña: ${password}`);
  console.log('────────────────────────────────────────────');
  console.log('Guardala en un gestor de contraseñas. No se vuelve a mostrar.\n');
}

async function resetPassword(email: string) {
  const user = await findUserByEmail(email);
  if (!user) throw new Error(`No existe un usuario con el email ${email}`);
  const { data: admin } = await db.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!admin) throw new Error(`${email} existe pero no es admin (no está en public.admins)`);
  const password = newPassword();
  const { error } = await db.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  if (error) throw error;
  printCredentials(user.email || email, password);
}

async function createAdmin(email: string) {
  const existing = await findUserByEmail(email);
  if (existing) throw new Error(`Ya existe un usuario con ${email}. Usá --reset para cambiarle la contraseña.`);
  const password = newPassword();
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error || new Error('No se pudo crear el usuario');
  const { error: insErr } = await db.from('admins').insert({ user_id: data.user.id, name: 'Administrador SCN' });
  if (insErr) throw insErr;
  printCredentials(email, password);
}

async function main() {
  const args = process.argv.slice(2);
  const resetIdx = args.indexOf('--reset');
  const createIdx = args.indexOf('--create');
  if (resetIdx >= 0) {
    const email = args[resetIdx + 1];
    if (!email) throw new Error('Falta el email: npm run admin -- --reset EMAIL');
    return resetPassword(email);
  }
  if (createIdx >= 0) {
    const email = args[createIdx + 1];
    if (!email) throw new Error('Falta el email: npm run admin -- --create EMAIL');
    return createAdmin(email);
  }
  return listAdmins();
}

main().catch((err) => {
  console.error('\nError:', err instanceof Error ? err.message : err, '\n');
  process.exit(1);
});
