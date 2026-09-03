import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { INITIAL_DB, type DbSchema } from './seed-data';

dotenv.config();

const app = express();
const DEV_ADMIN_TOKEN = process.env.ADMIN_DEV_TOKEN || 'scn-dev-admin-token';

const supabaseUrl = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  ''
).trim();
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const anonKey = (
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();
const viteSupabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();

const hasValidUrl = !!(
  supabaseUrl &&
  !supabaseUrl.includes('your-project-id') &&
  supabaseUrl !== ''
);

if (viteSupabaseUrl && supabaseUrl && viteSupabaseUrl !== supabaseUrl) {
  console.error(
    'SUPABASE_URL y VITE_SUPABASE_URL no coinciden. El login y la API pueden usar proyectos distintos.'
  );
}

if (serviceRoleKey && anonKey && serviceRoleKey === anonKey) {
  console.error(
    'SUPABASE_SERVICE_ROLE_KEY es igual a la anon key. Usa la clave service_role del dashboard de Supabase.'
  );
}

const isSupabaseConfigured = hasValidUrl && !!(serviceRoleKey || anonKey);

if (!isSupabaseConfigured) {
  console.warn('Supabase no configurado. Se usará base de datos local.');
}

let supabase: SupabaseClient | null = null;
const supabaseAdmin: SupabaseClient | null =
  hasValidUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

if (hasValidUrl && serviceRoleKey) {
  supabase = supabaseAdmin;
} else if (hasValidUrl && anonKey) {
  supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const supabaseAnon: SupabaseClient | null =
  hasValidUrl && anonKey
    ? createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

function createUserSupabaseClient(accessToken: string): SupabaseClient | null {
  if (!hasValidUrl || !anonKey) return null;
  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function lookupAdminRecord(
  userId: string,
  accessToken: string
): Promise<{ admin: { user_id: string; name: string } | null; adminError: string | null }> {
  if (supabaseAdmin) {
    const result = await supabaseAdmin
      .from('admins')
      .select('user_id, name')
      .eq('user_id', userId)
      .maybeSingle();
    if (result.data) {
      return { admin: result.data, adminError: null };
    }
    if (result.error) {
      console.error('lookupAdminRecord (service role):', result.error.message);
    }
  }

  const userClient = createUserSupabaseClient(accessToken);
  if (!userClient) {
    return { admin: null, adminError: 'Supabase anon no configurado' };
  }

  const result = await userClient
    .from('admins')
    .select('user_id, name')
    .eq('user_id', userId)
    .maybeSingle();

  if (result.error) {
    console.error('lookupAdminRecord (user JWT):', result.error.message);
    return { admin: null, adminError: result.error.message };
  }

  return { admin: result.data, adminError: null };
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  if (!supabase && !supabaseAnon) {
    if (token === DEV_ADMIN_TOKEN) {
      (req as Request & { adminUser?: { email: string; name: string } }).adminUser = {
        email: process.env.ADMIN_EMAIL || 'admin@scn.com',
        name: 'Administrador SCN',
      };
      return next();
    }
    return res.status(401).json({ error: 'No autorizado' });
  }

  if (!supabaseAnon) {
    return res.status(500).json({ error: 'Supabase anon key no configurada en el servidor' });
  }

  const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
  if (userError || !userData.user) {
    console.error('requireAdmin: token inválido', userError?.message);
    return res.status(401).json({ error: 'Token inválido' });
  }

  const { admin, adminError } = await lookupAdminRecord(userData.user.id, token);

  if (!admin) {
    console.error('requireAdmin: rechazado', {
      userId: userData.user.id,
      email: userData.user.email,
      adminError,
      hasServiceRole: !!supabaseAdmin,
      supabaseHost: hasValidUrl ? new URL(supabaseUrl).hostname : null,
    });
    return res.status(403).json({ error: 'No es administrador' });
  }

  (req as Request & { adminUser?: { email: string; name: string; id: string } }).adminUser = {
    id: userData.user.id,
    email: userData.user.email || '',
    name: admin.name,
  };
  next();
}

function handleSupabaseError(err: any, contextMsg: string) {
  console.error(`Error de Supabase en ${contextMsg}:`, err.message || err);
  const errMsg = String(err.message || err).toLowerCase();
  if (
    errMsg.includes('fetch failed') || 
    errMsg.includes('getaddrinfo') || 
    errMsg.includes('enotfound') || 
    errMsg.includes('connection') ||
    errMsg.includes('failed to fetch')
  ) {
    console.warn('Desactivando Supabase por fallo de conexión.');
    supabase = null;
  }
}


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const ALLOWED_ORIGINS = new Set(
  [
    process.env.SITE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ].filter(Boolean)
);

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin) {
    let allow = ALLOWED_ORIGINS.has(origin);
    if (!allow) {
      try {
        allow = /\.vercel\.app$/i.test(new URL(origin).hostname);
      } catch {
        allow = false;
      }
    }
    if (allow) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, X-Requested-With'
  );
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('No se pudo crear el directorio de datos (filesystem de solo lectura). Se usará base de datos en memoria.');
}
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('No se pudo crear el directorio de uploads.');
}

app.use('/uploads', express.static(UPLOADS_DIR));

function generateSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // remove accents
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-') // replace spaces with -
    .replace(/[^\w\-]+/g, '') // remove all non-word chars
    .replace(/\-\-+/g, '-') // replace multiple - with single -
    .replace(/^-+/, '') // trim - from start
    .replace(/-+$/, ''); // trim - from end
}


let memoryDB: DbSchema | null = null;

function cloneDb(data: DbSchema): DbSchema {
  return JSON.parse(JSON.stringify(data));
}

function readDB(): DbSchema {
  if (memoryDB) {
    return memoryDB;
  }
  try {
    if (!fs.existsSync(DB_FILE)) {
      try {
        const seed = cloneDb(INITIAL_DB);
        fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
        memoryDB = seed;
        return memoryDB;
      } catch (_) {
        memoryDB = cloneDb(INITIAL_DB);
        return memoryDB;
      }
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    memoryDB = JSON.parse(data) as DbSchema;
    return memoryDB;
  } catch (err) {
    console.error('Error reading database file, using in-memory default:', err);
    memoryDB = cloneDb(INITIAL_DB);
    return memoryDB;
  }
}

function writeDB(data: DbSchema) {
  memoryDB = data;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to database file:', err);
  }
}


app.get('/api/health', async (_req, res) => {
  let supabaseHost: string | null = null;
  let viteHost: string | null = null;
  try {
    if (hasValidUrl) supabaseHost = new URL(supabaseUrl).hostname;
    if (viteSupabaseUrl) viteHost = new URL(viteSupabaseUrl).hostname;
  } catch {
    /* ignore */
  }

  let adminsApi: { ok: boolean; count: number | null; error: string | null } = {
    ok: false,
    count: null,
    error: null,
  };
  if (supabaseAdmin) {
    const { count, error } = await supabaseAdmin
      .from('admins')
      .select('*', { count: 'exact', head: true });
    adminsApi = {
      ok: !error,
      count: count ?? null,
      error: error?.message ?? null,
    };
  }

  res.json({
    supabaseConfigured: isSupabaseConfigured,
    hasServiceRole: !!serviceRoleKey,
    hasAnonKey: !!anonKey,
    serviceRoleEqualsAnon: !!(serviceRoleKey && anonKey && serviceRoleKey === anonKey),
    supabaseHost,
    viteSupabaseHost: viteHost,
    urlsMatch: !viteSupabaseUrl || supabaseUrl === viteSupabaseUrl,
    adminsApi,
  });
});

app.get('/api/admin/me', requireAdmin, (req, res) => {
  const adminUser = (req as Request & { adminUser?: { email: string; name: string; id?: string } }).adminUser;
  res.json({
    id: adminUser?.id,
    email: adminUser?.email,
    name: adminUser?.name,
  });
});

app.get('/api/settings', async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          const defaultSettings = {
            id: 1,
            whatsapp_number: '2915224734',
            instagram_url: 'https://instagram.com/seamoscomoninos',
            email: 'contacto@seamoscomoninos.com',
            hero_title: 'SCN — Seamos como niños',
            hero_subtitle: 'Catálogo de tecnología en Bahía Blanca. Celulares, notebooks y accesorios con asesoría personalizada por WhatsApp.'
          };
          const { data: inserted, error: insertError } = await supabase
            .from('site_settings')
            .insert(defaultSettings)
            .select()
            .single();
          if (insertError) throw insertError;
          return res.json(inserted);
        }
        throw error;
      }
      return res.json(data);
    } catch (err: any) {
      handleSupabaseError(err, 'GET /api/settings');
      const db = readDB();
      return res.json(db.site_settings);
    }
  } else {
    const db = readDB();
    res.json(db.site_settings);
  }
});

app.put('/api/settings', requireAdmin, async (req, res) => {
  const { whatsapp_number, instagram_url, email, hero_title, hero_subtitle } = req.body;
  if (supabase) {
    try {
      const updateData: any = {};
      if (whatsapp_number !== undefined) updateData.whatsapp_number = whatsapp_number;
      if (instagram_url !== undefined) updateData.instagram_url = instagram_url;
      if (email !== undefined) updateData.email = email;
      if (hero_title !== undefined) updateData.hero_title = hero_title;
      if (hero_subtitle !== undefined) updateData.hero_subtitle = hero_subtitle;

      const { data, error } = await supabase
        .from('site_settings')
        .update(updateData)
        .eq('id', 1)
        .select()
        .single();
      
      if (error) throw error;
      return res.json(data);
    } catch (err: any) {
      handleSupabaseError(err, 'PUT /api/settings');
      if (!supabase) {
        const db = readDB();
        db.site_settings = {
          whatsapp_number: whatsapp_number || db.site_settings.whatsapp_number,
          instagram_url: instagram_url || db.site_settings.instagram_url,
          email: email || db.site_settings.email,
          hero_title: hero_title || db.site_settings.hero_title,
          hero_subtitle: hero_subtitle || db.site_settings.hero_subtitle,
        };
        writeDB(db);
        return res.json(db.site_settings);
      }
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = readDB();
    db.site_settings = {
      whatsapp_number: whatsapp_number || db.site_settings.whatsapp_number,
      instagram_url: instagram_url || db.site_settings.instagram_url,
      email: email || db.site_settings.email,
      hero_title: hero_title || db.site_settings.hero_title,
      hero_subtitle: hero_subtitle || db.site_settings.hero_subtitle,
    };
    writeDB(db);
    res.json(db.site_settings);
  }
});

app.get('/api/categories', async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return res.json(data);
    } catch (err: any) {
      handleSupabaseError(err, 'GET /api/categories');
      const db = readDB();
      return res.json(db.categories);
    }
  } else {
    const db = readDB();
    res.json(db.categories);
  }
});

app.post('/api/categories', requireAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Nombre de categoría es requerido' });
  }
  
  const slug = generateSlug(name);

  if (supabase) {
    try {
      const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (existing) {
        return res.status(400).json({ error: 'La categoría ya existe (slug duplicado)' });
      }

      const { data, error } = await supabase
        .from('categories')
        .insert({ name, slug })
        .select()
        .single();
      
      if (error) throw error;
      return res.status(201).json(data);
    } catch (err: any) {
      handleSupabaseError(err, 'POST /api/categories');
      if (!supabase) {
        const db = readDB();
        if (db.categories.some(c => c.slug === slug)) {
          return res.status(400).json({ error: 'La categoría ya existe (slug duplicado)' });
        }
        const newCategory = { id: 'c' + Math.random().toString(36).slice(2, 11), name, slug };
        db.categories.push(newCategory);
        writeDB(db);
        return res.status(201).json(newCategory);
      }
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = readDB();
    if (db.categories.some(c => c.slug === slug)) {
      return res.status(400).json({ error: 'La categoría ya existe (slug duplicado)' });
    }

    const newCategory = {
      id: 'c' + Math.random().toString(36).slice(2, 11),
      name,
      slug
    };

    db.categories.push(newCategory);
    writeDB(db);
    res.status(201).json(newCategory);
  }
});

app.get('/api/products', async (req, res) => {
  if (supabase) {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          *,
          images:product_images(*),
          category:categories(*)
        `)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name');
      
      if (error) throw error;

      const enrichedProducts = (products || []).map(p => {
        if (p.images) {
          p.images.sort((a: any, b: any) => a.position - b.position);
        }
        return p;
      });

      return res.json(enrichedProducts);
    } catch (err: any) {
      handleSupabaseError(err, 'GET /api/products');
      const db = readDB();
      const activeProducts = db.products.filter((p) => p.is_active && p.deleted_at === null);
      const enriched = activeProducts.map((product) => {
        const images = db.product_images.filter((img) => img.product_id === product.id);
        const category = db.categories.find((c) => c.id === product.category_id);
        return {
          ...product,
          images: images.sort((a, b) => a.position - b.position),
          category,
        };
      });
      return res.json(enriched);
    }
  } else {
    const db = readDB();
    const activeProducts = db.products.filter(p => p.is_active && p.deleted_at === null);
    const enrichedProducts = activeProducts.map(product => {
      const images = db.product_images.filter(img => img.product_id === product.id);
      const category = db.categories.find(c => c.id === product.category_id);
      return {
        ...product,
        images: images.sort((a, b) => a.position - b.position),
        category
      };
    });
    res.json(enrichedProducts);
  }
});

app.get('/api/admin/products', requireAdmin, async (req, res) => {
  if (supabase) {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          *,
          images:product_images(*),
          category:categories(*)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      const enrichedProducts = (products || []).map(p => {
        if (p.images) {
          p.images.sort((a: any, b: any) => a.position - b.position);
        }
        return p;
      });

      return res.json(enrichedProducts);
    } catch (err: any) {
      handleSupabaseError(err, 'GET /api/admin/products');
      if (!supabase) {
        const db = readDB();
        const allProducts = db.products.filter(p => p.deleted_at === null);
        const enriched = allProducts.map(product => {
          const images = db.product_images.filter(img => img.product_id === product.id);
          const category = db.categories.find(c => c.id === product.category_id);
          return { ...product, images: images.sort((a, b) => a.position - b.position), category };
        });
        return res.json(enriched);
      }
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = readDB();
    const allProducts = db.products.filter(p => p.deleted_at === null);
    const enrichedProducts = allProducts.map(product => {
      const images = db.product_images.filter(img => img.product_id === product.id);
      const category = db.categories.find(c => c.id === product.category_id);
      return {
        ...product,
        images: images.sort((a, b) => a.position - b.position),
        category
      };
    });
    res.json(enrichedProducts);
  }
});

app.get('/api/products/:slug', async (req, res) => {
  const { slug } = req.params;
  if (supabase) {
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select(`
          *,
          images:product_images(*),
          category:categories(*)
        `)
        .eq('slug', slug)
        .eq('is_active', true)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      if (!product) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      if (product.images) {
        product.images.sort((a: any, b: any) => a.position - b.position);
      }

      return res.json(product);
    } catch (err: any) {
      handleSupabaseError(err, 'GET /api/products/:slug');
      if (!supabase) {
        const db = readDB();
        const product = db.products.find(
          (p) => p.slug === slug && p.deleted_at === null && p.is_active
        );
        if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
        const images = db.product_images.filter(img => img.product_id === product.id);
        const category = db.categories.find(c => c.id === product.category_id);
        return res.json({ ...product, images: images.sort((a, b) => a.position - b.position), category });
      }
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = readDB();
    const product = db.products.find(
      (p) => p.slug === slug && p.deleted_at === null && p.is_active
    );
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    const images = db.product_images.filter(img => img.product_id === product.id);
    const category = db.categories.find(c => c.id === product.category_id);
    res.json({
      ...product,
      images: images.sort((a, b) => a.position - b.position),
      category
    });
  }
});

app.post('/api/products', requireAdmin, async (req, res) => {
  const {
    name,
    short_description,
    description,
    price,
    category_id,
    is_featured,
    is_active,
    sku,
    stock,
    includes,
    images // Array of { storage_path, is_cover, position }
  } = req.body;

  if (!name || !price || !category_id) {
    return res.status(400).json({ error: 'Faltan campos obligatorios (nombre, precio, categoría)' });
  }

  const slug = generateSlug(name);

  if (supabase) {
    try {
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('slug', slug)
        .is('deleted_at', null)
        .maybeSingle();

      if (existing) {
        return res.status(400).json({ error: 'Ya existe un producto activo con ese nombre/slug' });
      }

      const generatedSku = sku || 'SKU-' + Math.floor(Math.random() * 1000000);

      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          name,
          slug,
          short_description: short_description || '',
          description: description || '',
          price: Number(price),
          currency: 'ARS',
          includes: Array.isArray(includes) ? includes : [],
          category_id,
          is_featured: !!is_featured,
          is_active: is_active !== undefined ? !!is_active : true,
          sku: generatedSku,
          stock: stock !== undefined ? Number(stock) : 0,
        })
        .select()
        .single();

      if (productError) throw productError;

      const productId = newProduct.id;
      const imagesToInsert: any[] = [];

      if (Array.isArray(images) && images.length > 0) {
        images.forEach((img, index) => {
          imagesToInsert.push({
            product_id: productId,
            storage_path: img.storage_path,
            position: img.position !== undefined ? Number(img.position) : index + 1,
            is_cover: !!img.is_cover
          });
        });
      } else {
        imagesToInsert.push({
          product_id: productId,
          storage_path: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=800&q=80',
          position: 1,
          is_cover: true
        });
      }

      const { data: insertedImages, error: imagesError } = await supabase
        .from('product_images')
        .insert(imagesToInsert)
        .select();

      if (imagesError) throw imagesError;

      return res.status(201).json({
        ...newProduct,
        images: insertedImages
      });
    } catch (err: any) {
      handleSupabaseError(err, 'POST /api/products');
      if (!supabase) {
        const db = readDB();
        if (db.products.some(p => p.slug === slug && p.deleted_at === null)) {
          return res.status(400).json({ error: 'Ya existe un producto activo con ese nombre/slug' });
        }
        const productId = 'p' + Math.random().toString(36).slice(2, 11);
        const newProduct = {
          id: productId, name, slug,
          short_description: short_description || '',
          description: description || '',
          price: Number(price), currency: 'ARS',
          includes: Array.isArray(includes) ? includes : [],
          category_id,
          is_featured: !!is_featured,
          is_active: is_active !== undefined ? !!is_active : true,
          sku: sku || 'SKU-' + Math.floor(Math.random() * 1000000),
          stock: stock !== undefined ? Number(stock) : 0,
          deleted_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        db.products.push(newProduct);
        if (Array.isArray(images) && images.length > 0) {
          images.forEach((img, index) => {
            db.product_images.push({
              id: 'img' + Math.random().toString(36).slice(2, 11),
              product_id: productId,
              storage_path: img.storage_path,
              position: img.position !== undefined ? Number(img.position) : index + 1,
              is_cover: !!img.is_cover
            });
          });
        } else {
          db.product_images.push({
            id: 'img' + Math.random().toString(36).slice(2, 11),
            product_id: productId,
            storage_path: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=800&q=80',
            position: 1, is_cover: true
          });
        }
        writeDB(db);
        return res.status(201).json({ ...newProduct, images: db.product_images.filter(img => img.product_id === productId) });
      }
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = readDB();
    if (db.products.some(p => p.slug === slug && p.deleted_at === null)) {
      return res.status(400).json({ error: 'Ya existe un producto activo con ese nombre/slug' });
    }
    const productId = 'p' + Math.random().toString(36).slice(2, 11);
    const newProduct = {
      id: productId,
      name,
      slug,
      short_description: short_description || '',
      description: description || '',
      price: Number(price),
      currency: 'ARS',
      includes: Array.isArray(includes) ? includes : [],
      category_id,
      is_featured: !!is_featured,
      is_active: is_active !== undefined ? !!is_active : true,
      sku: sku || 'SKU-' + Math.floor(Math.random() * 1000000),
      stock: stock !== undefined ? Number(stock) : 0,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.products.push(newProduct);

    if (Array.isArray(images) && images.length > 0) {
      images.forEach((img, index) => {
        db.product_images.push({
          id: 'img' + Math.random().toString(36).slice(2, 11),
          product_id: productId,
          storage_path: img.storage_path,
          position: img.position !== undefined ? Number(img.position) : index + 1,
          is_cover: !!img.is_cover
        });
      });
    } else {
      db.product_images.push({
        id: 'img' + Math.random().toString(36).slice(2, 11),
        product_id: productId,
        storage_path: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=800&q=80',
        position: 1,
        is_cover: true
      });
    }

    writeDB(db);
    res.status(201).json({
      ...newProduct,
      images: db.product_images.filter(img => img.product_id === productId)
    });
  }
});

app.put('/api/products/:id', requireAdmin, async (req, res) => {
  const productId = req.params.id;
  const {
    name,
    short_description,
    description,
    price,
    category_id,
    is_featured,
    is_active,
    sku,
    stock,
    includes,
    images // Array of { id, storage_path, is_cover, position }
  } = req.body;

  if (supabase) {
    try {
      const { data: currentProduct, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .is('deleted_at', null)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!currentProduct) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      let slug = currentProduct.slug;
      if (name && name !== currentProduct.name) {
        slug = generateSlug(name);
        const { data: duplicate } = await supabase
          .from('products')
          .select('id')
          .eq('slug', slug)
          .neq('id', productId)
          .is('deleted_at', null)
          .maybeSingle();

        if (duplicate) {
          return res.status(400).json({ error: 'Ya existe otro producto activo con ese nombre/slug' });
        }
      }

      const updateData: any = { updated_at: new Date().toISOString() };
      if (name !== undefined) updateData.name = name;
      updateData.slug = slug;
      if (short_description !== undefined) updateData.short_description = short_description;
      if (description !== undefined) updateData.description = description;
      if (price !== undefined) updateData.price = Number(price);
      if (category_id !== undefined) updateData.category_id = category_id;
      if (is_featured !== undefined) updateData.is_featured = !!is_featured;
      if (is_active !== undefined) updateData.is_active = !!is_active;
      if (sku !== undefined) updateData.sku = sku;
      if (stock !== undefined) updateData.stock = Number(stock);
      if (includes !== undefined) updateData.includes = Array.isArray(includes) ? includes : currentProduct.includes;

      const { data: updatedProduct, error: updateError } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', productId)
        .select()
        .single();

      if (updateError) throw updateError;

      if (images !== undefined) {
        const { error: deleteImagesError } = await supabase
          .from('product_images')
          .delete()
          .eq('product_id', productId);

        if (deleteImagesError) throw deleteImagesError;

        if (Array.isArray(images) && images.length > 0) {
          const imagesToInsert = images.map((img, index) => ({
            product_id: productId,
            storage_path: img.storage_path,
            position: img.position !== undefined ? Number(img.position) : index + 1,
            is_cover: !!img.is_cover
          }));
          const { error: insertImagesError } = await supabase
            .from('product_images')
            .insert(imagesToInsert);

          if (insertImagesError) throw insertImagesError;
        }
      }

      const { data: finalImages } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('position');

      return res.json({
        ...updatedProduct,
        images: finalImages || []
      });
    } catch (err: any) {
      handleSupabaseError(err, 'PUT /api/products/:id');
      if (!supabase) {
        const db = readDB();
        const productIndex = db.products.findIndex(p => p.id === productId && p.deleted_at === null);
        if (productIndex === -1) return res.status(404).json({ error: 'Producto no encontrado' });
        const currentProduct = db.products[productIndex];
        let slug = currentProduct.slug;
        if (name && name !== currentProduct.name) {
          slug = generateSlug(name);
          if (db.products.some(p => p.id !== productId && p.slug === slug && p.deleted_at === null)) {
            return res.status(400).json({ error: 'Ya existe otro producto activo con ese nombre/slug' });
          }
        }
        db.products[productIndex] = {
          ...currentProduct,
          name: name || currentProduct.name, slug,
          short_description: short_description !== undefined ? short_description : currentProduct.short_description,
          description: description !== undefined ? description : currentProduct.description,
          price: price !== undefined ? Number(price) : currentProduct.price,
          category_id: category_id || currentProduct.category_id,
          is_featured: is_featured !== undefined ? !!is_featured : currentProduct.is_featured,
          is_active: is_active !== undefined ? !!is_active : currentProduct.is_active,
          sku: sku !== undefined ? sku : currentProduct.sku,
          stock: stock !== undefined ? Number(stock) : currentProduct.stock,
          includes: Array.isArray(includes) ? includes : currentProduct.includes,
          updated_at: new Date().toISOString()
        };
        if (images !== undefined) {
          db.product_images = db.product_images.filter(img => img.product_id !== productId);
          if (Array.isArray(images)) {
            images.forEach((img, index) => {
              db.product_images.push({
                id: img.id || 'img' + Math.random().toString(36).slice(2, 11),
                product_id: productId, storage_path: img.storage_path,
                position: img.position !== undefined ? Number(img.position) : index + 1,
                is_cover: !!img.is_cover
              });
            });
          }
        }
        writeDB(db);
        return res.json({ ...db.products[productIndex], images: db.product_images.filter(img => img.product_id === productId) });
      }
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = readDB();
    const productIndex = db.products.findIndex(p => p.id === productId && p.deleted_at === null);
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    const currentProduct = db.products[productIndex];
    
    let slug = currentProduct.slug;
    if (name && name !== currentProduct.name) {
      slug = generateSlug(name);
      if (db.products.some(p => p.id !== productId && p.slug === slug && p.deleted_at === null)) {
        return res.status(400).json({ error: 'Ya existe otro producto activo con ese nombre/slug' });
      }
    }

    db.products[productIndex] = {
      ...currentProduct,
      name: name || currentProduct.name,
      slug,
      short_description: short_description !== undefined ? short_description : currentProduct.short_description,
      description: description !== undefined ? description : currentProduct.description,
      price: price !== undefined ? Number(price) : currentProduct.price,
      category_id: category_id || currentProduct.category_id,
      is_featured: is_featured !== undefined ? !!is_featured : currentProduct.is_featured,
      is_active: is_active !== undefined ? !!is_active : currentProduct.is_active,
      sku: sku !== undefined ? sku : currentProduct.sku,
      stock: stock !== undefined ? Number(stock) : currentProduct.stock,
      includes: Array.isArray(includes) ? includes : currentProduct.includes,
      updated_at: new Date().toISOString()
    };

    if (images !== undefined) {
      db.product_images = db.product_images.filter(img => img.product_id !== productId);
      if (Array.isArray(images)) {
        images.forEach((img, index) => {
          db.product_images.push({
            id: img.id || 'img' + Math.random().toString(36).slice(2, 11),
            product_id: productId,
            storage_path: img.storage_path,
            position: img.position !== undefined ? Number(img.position) : index + 1,
            is_cover: !!img.is_cover
          });
        });
      }
    }

    writeDB(db);
    res.json({
      ...db.products[productIndex],
      images: db.product_images.filter(img => img.product_id === productId)
    });
  }
});

app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  const productId = req.params.id;
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({
          deleted_at: new Date().toISOString(),
          is_active: false
        })
        .eq('id', productId)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return res.status(404).json({ error: 'Producto no encontrado o ya eliminado' });
      }
      return res.json({ success: true, message: 'Producto eliminado correctamente' });
    } catch (err: any) {
      handleSupabaseError(err, 'DELETE /api/products/:id');
      if (!supabase) {
        const db = readDB();
        const productIndex = db.products.findIndex(p => p.id === productId && p.deleted_at === null);
        if (productIndex === -1) return res.status(404).json({ error: 'Producto no encontrado o ya eliminado' });
        db.products[productIndex].deleted_at = new Date().toISOString();
        db.products[productIndex].is_active = false;
        writeDB(db);
        return res.json({ success: true, message: 'Producto eliminado correctamente' });
      }
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = readDB();
    const productIndex = db.products.findIndex(p => p.id === productId && p.deleted_at === null);
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Producto no encontrado o ya eliminado' });
    }
    db.products[productIndex].deleted_at = new Date().toISOString();
    db.products[productIndex].is_active = false;
    
    writeDB(db);
    res.json({ success: true, message: 'Producto eliminado correctamente' });
  }
});

app.post('/api/admin/dev-login', (req, res) => {
  if (supabase) {
    return res.status(400).json({ error: 'Use Supabase Auth para iniciar sesión' });
  }

  const { email, password } = req.body;
  const devEmail = process.env.ADMIN_EMAIL || 'admin@scn.com';
  const devPassword = process.env.ADMIN_PASSWORD || 'admin123';

  if (email === devEmail && password === devPassword) {
    return res.json({
      success: true,
      token: DEV_ADMIN_TOKEN,
      user: {
        email: devEmail,
        name: 'Administrador SCN',
      },
    });
  }

  return res.status(401).json({ error: 'Credenciales incorrectas.' });
});

app.post('/api/admin/upload', requireAdmin, async (req, res) => {
  const { base64, fileName } = req.body;
  if (!base64 || !fileName) {
    return res.status(400).json({ error: 'Faltan parámetros de subida (base64, fileName)' });
  }

  try {
    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Formato base64 inválido' });
    }

    const type = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    
    const ext = path.extname(fileName) || '.jpg';
    const uniqueName = 'prod_' + Date.now() + '_' + Math.floor(Math.random() * 1000) + ext;

    if (supabase) {
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(uniqueName, buffer, {
          contentType: type,
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(uniqueName);

      return res.json({
        success: true,
        url: publicUrlData.publicUrl
      });
    } else {
      const savePath = path.join(UPLOADS_DIR, uniqueName);
      fs.writeFileSync(savePath, buffer);
      
      return res.json({
        success: true,
        url: `/uploads/${uniqueName}`
      });
    }
  } catch (err: any) {
    console.error('Upload Error:', err);
    res.status(500).json({ error: 'Error procesando la subida de imagen: ' + err.message });
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Express error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

export default app;
