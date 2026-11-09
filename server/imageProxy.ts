import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { Express, Request, Response } from 'express';
import sharp from 'sharp';

const WIDTHS = new Set([160, 320, 384, 480, 640, 960, 1280]);
const IS_VERCEL = !!process.env.VERCEL;
const ROOT = IS_VERCEL
  ? path.join('/tmp', 'scn-img-cache')
  : path.join(process.cwd(), 'data', 'img-cache');
const SRC_DIR = path.join(ROOT, 'src');
const WEBP_DIR = path.join(ROOT, 'webp');
const MAX_BYTES = 20 * 1024 * 1024;
const WARM_WIDTHS = [160, 320, 960, 1280];
const PRIORITY_SLUGS = [
  'mouse-netmak-rgb',
  'soporte-para-tabletcelular',
  'smartwatch-x3-plata',
  'receptor-bluetooth-50',
];

const srcPending = new Map<string, Promise<string>>();
const webpPending = new Map<string, Promise<string>>();
let active = 0;
const waiters: Array<() => void> = [];

sharp.concurrency(1);

function hash(value: string) {
  return crypto.createHash('sha1').update(value).digest('hex');
}

/** Solo el bucket público del proyecto Supabase configurado (evita usar el proxy contra otros hosts). */
function configuredSupabaseHost(): string | null {
  const raw = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  try {
    return raw ? new URL(raw).hostname.toLowerCase() : null;
  } catch {
    return null;
  }
}

function allowRemote(url: URL): boolean {
  if (url.protocol !== 'https:') return false;
  if (!url.pathname.startsWith('/storage/v1/object/public/product-images/')) return false;
  const host = url.hostname.toLowerCase();
  const configured = configuredSupabaseHost();
  return configured ? host === configured : host.endsWith('.supabase.co');
}

function localUploadPath(raw: string, uploadsDir: string): string | null {
  if (!raw.startsWith('/uploads/')) return null;
  const rel = raw.slice('/uploads/'.length);
  if (!rel || rel.includes('..') || rel.includes('\0')) return null;
  const file = path.resolve(uploadsDir, rel);
  if (!file.startsWith(path.resolve(uploadsDir) + path.sep)) return null;
  return file;
}

function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      active += 1;
      fn().then(resolve, reject).finally(() => {
        active -= 1;
        const next = waiters.shift();
        if (next) next();
      });
    };
    if (active < 2) run();
    else waiters.push(run);
  });
}

async function fileReady(file: string): Promise<boolean> {
  try {
    const stat = await fs.promises.stat(file);
    return stat.size > 0;
  } catch {
    return false;
  }
}

async function downloadToFile(url: URL, dest: string) {
  const part = `${dest}.part`;
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });

  for (let attempt = 0; attempt < 12; attempt++) {
    let have = 0;
    try {
      have = (await fs.promises.stat(part)).size;
    } catch {
      have = 0;
    }

    const headers: Record<string, string> = {};
    if (have > 0) headers.Range = `bytes=${have}-`;
    let res: Awaited<ReturnType<typeof fetch>>;
    try {
      res = await fetch(url, { redirect: 'follow', headers });
    } catch {
      continue;
    }
    if (res.status === 200 && have > 0) {
      await fs.promises.rm(part, { force: true });
      have = 0;
    }
    if (!res.ok && res.status !== 206) throw new Error(`origen ${res.status}`);
    if (!res.body) throw new Error('origen vacío');

    const totalHeader = res.headers.get('content-range');
    const total = totalHeader ? Number(totalHeader.split('/')[1]) : have + Number(res.headers.get('content-length') || 0);
    const handle = await fs.promises.open(part, have > 0 && res.status === 206 ? 'a' : 'w');
    const reader = res.body.getReader();
    let idle: ReturnType<typeof setTimeout> | undefined;
    const arm = () => {
      if (idle) clearTimeout(idle);
      idle = setTimeout(() => {
        void reader.cancel();
      }, 12000);
    };

    try {
      arm();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value?.byteLength) {
          arm();
          await handle.write(value);
        }
      }
    } catch {
      /* se reanuda en el siguiente intento */
    } finally {
      if (idle) clearTimeout(idle);
      await handle.close();
    }

    const size = (await fs.promises.stat(part)).size;
    if (size > 0 && (total <= 0 || size >= total)) {
      if (size > MAX_BYTES) throw new Error('imagen demasiado grande');
      await fs.promises.rename(part, dest);
      return;
    }
  }

  throw new Error('no se pudo bajar la imagen');
}

function ensureSource(raw: string, uploadsDir: string): Promise<string> {
  const file = path.join(SRC_DIR, hash(raw));
  const running = srcPending.get(raw);
  if (running) return running;

  const job = (async () => {
    if (await fileReady(file)) return file;
    await fs.promises.mkdir(SRC_DIR, { recursive: true });
    const local = localUploadPath(raw, uploadsDir);
    if (local) {
      await fs.promises.copyFile(local, file);
      return file;
    }
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new Error('url inválida');
    }
    if (!allowRemote(url)) throw new Error('origen no permitido');
    await withSlot(() => downloadToFile(url, file));
    return file;
  })().finally(() => {
    srcPending.delete(raw);
  });

  srcPending.set(raw, job);
  return job;
}

function ensureWebp(raw: string, width: number, uploadsDir: string): Promise<string> {
  const file = path.join(WEBP_DIR, `${hash(`${width}|${raw}`)}.webp`);
  const key = `${width}|${raw}`;
  const running = webpPending.get(key);
  if (running) return running;

  const job = (async () => {
    if (await fileReady(file)) return file;
    await fs.promises.mkdir(WEBP_DIR, { recursive: true });
    const source = await ensureSource(raw, uploadsDir);
    const tmp = `${file}.tmp`;
    await sharp(source, { animated: false, limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 72, effort: 4 })
      .toFile(tmp);
    await fs.promises.rename(tmp, file);
    return file;
  })().finally(() => {
    webpPending.delete(key);
  });

  webpPending.set(key, job);
  return job;
}

function sendCached(res: Response, file: string) {
  res.setHeader('Content-Type', 'image/webp');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  return res.sendFile(file);
}

function startWarm(uploadsDir: string) {
  const dbPath = path.join(process.cwd(), 'data', 'db.json');
  let urls: string[] = [];
  try {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8')) as {
      products?: Array<{ id?: string; slug?: string }>;
      product_images?: Array<{ product_id?: string; storage_path?: string }>;
    };
    const rank = new Map((db.products || []).map((product) => [product.id, PRIORITY_SLUGS.indexOf(product.slug || '')]));
    urls = [...(db.product_images || [])]
      .sort((a, b) => {
        const ai = rank.get(a.product_id);
        const bi = rank.get(b.product_id);
        return (ai === undefined || ai < 0 ? 99 : ai) - (bi === undefined || bi < 0 ? 99 : bi);
      })
      .map((image) => image.storage_path)
      .filter((value): value is string => !!value);
  } catch {
    return;
  }

  void (async () => {
    for (const raw of urls) {
      for (const width of WARM_WIDTHS) {
        try {
          await ensureWebp(raw, width, uploadsDir);
        } catch (err) {
          console.warn('img cache:', err instanceof Error ? err.message : err);
        }
      }
    }
    console.log(`img cache lista (${urls.length} fotos)`);
  })();
}

function canRedirectOriginal(raw: string): boolean {
  if (raw.startsWith('/uploads/')) {
    const rel = raw.slice('/uploads/'.length);
    return !!rel && !rel.includes('..') && !rel.includes('/') && !rel.includes('\\') && !rel.includes('\0');
  }
  try {
    return allowRemote(new URL(raw));
  } catch {
    return false;
  }
}

export function registerImageProxy(app: Express, uploadsDir: string) {
  app.get('/api/img', async (req: Request, res: Response) => {
    const width = Number(req.query.w);
    const raw = typeof req.query.u === 'string' ? req.query.u : '';
    if (!WIDTHS.has(width) || !raw) return res.status(400).end();

    try {
      const file = await ensureWebp(raw, width, uploadsDir);
      return sendCached(res, file);
    } catch (err) {
      console.warn('img proxy:', err instanceof Error ? err.message : err);
      if (canRedirectOriginal(raw)) {
        return res.redirect(302, raw);
      }
      return res.status(404).end();
    }
  });

  // En Vercel el FS es efímero y el warm consume CPU/timeout en cold start.
  if (!IS_VERCEL) {
    startWarm(uploadsDir);
  }
}
