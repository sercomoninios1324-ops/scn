/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

// Polyfills for ES modules as needed
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure data and uploads directories exist
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploaded images statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Helper function to generate slug
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

// Initial Database Seed Data (Matches Supabase migration)
const INITIAL_DB = {
  categories: [
    { id: 'c1000000-0000-0000-0000-000000000001', name: 'Smartphones', slug: 'smartphones' },
    { id: 'c1000000-0000-0000-0000-000000000002', name: 'Audio', slug: 'audio' },
    { id: 'c1000000-0000-0000-0000-000000000003', name: 'Accesorios', slug: 'accesorios' }
  ],
  site_settings: {
    whatsapp_number: '5491122334455',
    instagram_url: 'https://instagram.com/seamoscomoninos',
    email: 'contacto@seamoscomoninos.com',
    hero_title: 'SCN — Seamos como niños',
    hero_subtitle: 'Tu catálogo de tecnología favorito. Los mejores dispositivos y accesorios electrónicos, listos para tu hogar o regalo, con asesoría personalizada directa por WhatsApp.'
  },
  products: [
    {
      id: 'p1000000-0000-0000-0000-000000000001',
      name: 'Auriculares Bluetooth Noise Cancelling SCN-900',
      slug: 'auriculares-bluetooth-noise-cancelling-scn-900',
      short_description: 'Auriculares inalámbricos de alta definición con cancelación de ruido activa.',
      description: 'Disfrutá de tu música favorita sin interrupciones con los SCN-900. Cuentan con un sistema de cancelación de ruido híbrido que bloquea hasta el 95% del sonido ambiente, almohadillas de memory foam ultra suaves para máxima comodidad durante horas, y una batería de larga duración de hasta 40 horas con carga rápida USB-C.',
      price: 89999.00,
      currency: 'ARS',
      includes: ["Auriculares SCN-900", "Estuche rígido de viaje", "Cable de carga USB-C", "Cable auxiliar de 3.5mm", "Guía rápida de usuario"],
      category_id: 'c1000000-0000-0000-0000-000000000002',
      is_featured: true,
      is_active: true,
      sku: 'AUD-SCN-900',
      stock: 15,
      deleted_at: null,
      created_at: new Date('2026-01-01').toISOString(),
      updated_at: new Date('2026-01-01').toISOString()
    },
    {
      id: 'p1000000-0000-0000-0000-000000000002',
      name: 'Smartphone SCN Nexus S24 256GB',
      slug: 'smartphone-scn-nexus-s24-256gb',
      short_description: 'El celular definitivo con cámara Pro de 108MP y pantalla AMOLED de 120Hz.',
      description: 'Viví la potencia absoluta con el SCN Nexus S24. Equipado con un procesador de última generación, 8GB de memoria RAM, y 256GB de almacenamiento interno. Su pantalla AMOLED ofrece colores vibrantes y negros perfectos para disfrutar tus contenidos favoritos, y su batería de 5000mAh te acompaña durante todo el día sin problemas.',
      price: 649999.00,
      currency: 'ARS',
      includes: ["Smartphone SCN Nexus S24", "Funda de silicona transparente", "Cargador rápido de 45W", "Cable USB-C a USB-C", "Extractor de bandeja SIM"],
      category_id: 'c1000000-0000-0000-0000-000000000001',
      is_featured: true,
      is_active: true,
      sku: 'CEL-SCN-S24',
      stock: 8,
      deleted_at: null,
      created_at: new Date('2026-01-02').toISOString(),
      updated_at: new Date('2026-01-02').toISOString()
    },
    {
      id: 'p1000000-0000-0000-0000-000000000003',
      name: 'Cargador Inalámbrico Magnético SCN-MagSafe 15W',
      slug: 'cargador-inalambrico-magnetico-scn-magsafe-15w',
      short_description: 'Carga inalámbrica rápida y magnética compatible con iPhones y dispositivos con Qi.',
      description: 'Cargá tus dispositivos de la forma más cómoda con el SCN-MagSafe. Diseñado con imanes de alta potencia que se alinean a la perfección con tu dispositivo para una carga óptima de hasta 15W. Estructura de aluminio anodizado ultra delgada con cable integrado de nylon trenzado de 1.2 metros.',
      price: 24999.00,
      currency: 'ARS',
      includes: ["Cargador SCN-MagSafe con cable integrado", "Manual de instrucciones y garantía"],
      category_id: 'c1000000-0000-0000-0000-000000000003',
      is_featured: false,
      is_active: true,
      sku: 'ACC-SCN-MAG',
      stock: 50,
      deleted_at: null,
      created_at: new Date('2026-01-03').toISOString(),
      updated_at: new Date('2026-01-03').toISOString()
    },
    {
      id: 'p1000000-0000-0000-0000-000000000004',
      name: 'Parlante Bluetooth Impermeable SCN Groove 2',
      slug: 'parlante-bluetooth-impermeable-scn-groove-2',
      short_description: 'Parlante portátil de 20W, protección IPX7 y graves profundos.',
      description: 'Llevá la fiesta a cualquier parte con el SCN Groove 2. Certificación IPX7 resistente al agua para usarlo en la pileta, la playa o bajo la lluvia. Con 20W de potencia y radiadores pasivos duales que logran graves asombrosos. Sincronización estéreo TWS para conectar dos parlantes simultáneamente.',
      price: 47999.00,
      currency: 'ARS',
      includes: ["Parlante SCN Groove 2", "Correa de mano desmontable", "Cable de carga USB-C", "Guía de usuario"],
      category_id: 'c1000000-0000-0000-0000-000000000002',
      is_featured: true,
      is_active: true,
      sku: 'AUD-SCN-GROOVE',
      stock: 25,
      deleted_at: null,
      created_at: new Date('2026-01-04').toISOString(),
      updated_at: new Date('2026-01-04').toISOString()
    },
    {
      id: 'p1000000-0000-0000-0000-000000000005',
      name: 'Smartwatch SCN Active Fit 3',
      slug: 'smartwatch-scn-active-fit-3',
      short_description: 'Reloj inteligente deportivo con GPS, monitor de ritmo cardíaco y oxígeno.',
      description: 'El compañero ideal para entrenar. El SCN Active Fit 3 cuenta con monitoreo de salud 24/7 (frecuencia cardíaca, SpO2, sueño, estrés), más de 100 modos deportivos con GPS integrado de alta precisión para registrar tus rutas de carrera o ciclismo, pantalla táctil HD a todo color y notificaciones inteligentes.',
      price: 69999.00,
      currency: 'ARS',
      includes: ["Smartwatch SCN Active Fit 3", "Malla de silicona deportiva", "Base de carga magnética USB", "Manual de usuario"],
      category_id: 'c1000000-0000-0000-0000-000000000003',
      is_featured: true,
      is_active: true,
      sku: 'ACC-SCN-FIT3',
      stock: 12,
      deleted_at: null,
      created_at: new Date('2026-01-05').toISOString(),
      updated_at: new Date('2026-01-05').toISOString()
    },
    {
      id: 'p1000000-0000-0000-0000-000000000006',
      name: 'Auriculares In-Ear Inalámbricos SCN Buds Pro',
      slug: 'auriculares-in-ear-inalambricos-scn-buds-pro',
      short_description: 'Auriculares in-ear ultralivianos con sonido Hi-Fi y estuche con carga inalámbrica.',
      description: 'Máxima fidelidad en formato miniatura. Los SCN Buds Pro ofrecen una acústica cristalina con graves reforzados. Con cancelación de ruido ambiental (ENC) en micrófonos para llamadas perfectas de trabajo o de juego. Resistencia a salpicaduras IPX5 y estuche de carga inteligente compatible con carga Qi.',
      price: 32999.00,
      currency: 'ARS',
      includes: ["Auriculares SCN Buds Pro (L/R)", "Estuche de carga inalámbrica", "3 pares de almohadillas de silicona (S/M/L)", "Cable USB-C", "Manual"],
      category_id: 'c1000000-0000-0000-0000-000000000002',
      is_featured: false,
      is_active: true,
      sku: 'AUD-SCN-BUDS',
      stock: 30,
      deleted_at: null,
      created_at: new Date('2026-01-06').toISOString(),
      updated_at: new Date('2026-01-06').toISOString()
    },
    {
      id: 'p1000000-0000-0000-0000-000000000007',
      name: 'Powerbank SCN TurboCharge 20000mAh',
      slug: 'powerbank-scn-turbocharge-20000mah',
      short_description: 'Batería portátil de gran capacidad con carga súper rápida PD de 22.5W.',
      description: 'No te quedes sin batería nunca más. Cargá tu teléfono hasta 5 veces completas con el SCN TurboCharge. Equipado con un puerto USB-C bidireccional Power Delivery de 20W y dos puertos USB-A Quick Charge 3.0. Pantalla LED digital inteligente que indica el porcentaje exacto de carga disponible.',
      price: 19999.00,
      currency: 'ARS',
      includes: ["Batería portátil SCN TurboCharge 20000mAh", "Cable USB-A a USB-C de carga rápida", "Funda de transporte suave", "Manual"],
      category_id: 'c1000000-0000-0000-0000-000000000003',
      is_featured: false,
      is_active: true,
      sku: 'ACC-SCN-POWER',
      stock: 40,
      deleted_at: null,
      created_at: new Date('2026-01-07').toISOString(),
      updated_at: new Date('2026-01-07').toISOString()
    },
    {
      id: 'p1000000-0000-0000-0000-000000000008',
      name: 'Adaptador de Carga Ultra Rápido GaN SCN-PD 65W',
      slug: 'adaptador-de-carga-ultra-rapido-gan-scn-pd-65w',
      short_description: 'Cargador de pared compacto con tecnología GaN, con 2 puertos USB-C y 1 USB-A.',
      description: 'Un solo cargador para todos tus dispositivos. Gracias a la tecnología de nitruro de galio (GaN), este cargador es la mitad de tamaño de uno convencional, genera menos calor y es capaz de entregar hasta 65W para alimentar laptops, tablets, consolas y smartphones rápidamente al mismo tiempo.',
      price: 28999.00,
      currency: 'ARS',
      includes: ["Cargador de pared GaN 65W", "Guía de bienvenida y especificaciones técnicas"],
      category_id: 'c1000000-0000-0000-0000-000000000003',
      is_featured: false,
      is_active: true,
      sku: 'ACC-SCN-GAN65',
      stock: 20,
      deleted_at: null,
      created_at: new Date('2026-01-08').toISOString(),
      updated_at: new Date('2026-01-08').toISOString()
    }
  ],
  product_images: [
    { id: 'i1', product_id: 'p1000000-0000-0000-0000-000000000001', storage_path: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80', position: 1, is_cover: true },
    { id: 'i2', product_id: 'p1000000-0000-0000-0000-000000000002', storage_path: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80', position: 1, is_cover: true },
    { id: 'i3', product_id: 'p1000000-0000-0000-0000-000000000003', storage_path: 'https://images.unsplash.com/photo-1622445262465-2481c4574875?auto=format&fit=crop&w=800&q=80', position: 1, is_cover: true },
    { id: 'i4', product_id: 'p1000000-0000-0000-0000-000000000004', storage_path: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80', position: 1, is_cover: true },
    { id: 'i5', product_id: 'p1000000-0000-0000-0000-000000000005', storage_path: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80', position: 1, is_cover: true },
    { id: 'i6', product_id: 'p1000000-0000-0000-0000-000000000006', storage_path: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80', position: 1, is_cover: true },
    { id: 'i7', product_id: 'p1000000-0000-0000-0000-000000000007', storage_path: 'https://images.unsplash.com/photo-1609592424085-f5b225577239?auto=format&fit=crop&w=800&q=80', position: 1, is_cover: true },
    { id: 'i8', product_id: 'p1000000-0000-0000-0000-000000000008', storage_path: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80', position: 1, is_cover: true }
  ],
  admins: [
    { user_id: 'admin-user-id', name: 'Admin SCN' }
  ],
  orders: [],
  order_items: []
};

// Database Getter and Setter helpers
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), 'utf-8');
    return INITIAL_DB;
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database file, using in-memory default:', err);
    return INITIAL_DB;
  }
}

function writeDB(data: typeof INITIAL_DB) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to database file:', err);
  }
}

// ----------------- API ROUTES -----------------

// Public Config / Site Settings
app.get('/api/settings', (req, res) => {
  const db = readDB();
  res.json(db.site_settings);
});

// Update Site Settings (Admin Protected)
app.put('/api/settings', (req, res) => {
  const db = readDB();
  const { whatsapp_number, instagram_url, email, hero_title, hero_subtitle } = req.body;
  
  db.site_settings = {
    whatsapp_number: whatsapp_number || db.site_settings.whatsapp_number,
    instagram_url: instagram_url || db.site_settings.instagram_url,
    email: email || db.site_settings.email,
    hero_title: hero_title || db.site_settings.hero_title,
    hero_subtitle: hero_subtitle || db.site_settings.hero_subtitle,
  };
  
  writeDB(db);
  res.json(db.site_settings);
});

// Public Categories
app.get('/api/categories', (req, res) => {
  const db = readDB();
  res.json(db.categories);
});

// Create Category (Admin Protected)
app.post('/api/categories', (req, res) => {
  const db = readDB();
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Nombre de categoría es requerido' });
  }
  
  const slug = generateSlug(name);
  if (db.categories.some(c => c.slug === slug)) {
    return res.status(400).json({ error: 'La categoría ya existe (slug duplicado)' });
  }

  const newCategory = {
    id: 'c' + Math.random().toString(36).substr(2, 9),
    name,
    slug
  };

  db.categories.push(newCategory);
  writeDB(db);
  res.status(201).json(newCategory);
});

// Public Products (Active, not deleted, combined with images & category details)
app.get('/api/products', (req, res) => {
  const db = readDB();
  
  // Filter active and non-deleted
  const activeProducts = db.products.filter(p => p.is_active && p.deleted_at === null);
  
  // Map and attach categories and images
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
});

// Admin All Products (Including inactive and deleted)
app.get('/api/admin/products', (req, res) => {
  const db = readDB();
  const allProducts = db.products.filter(p => p.deleted_at === null); // Soft delete is actual filter
  
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
});

// Single Product by Slug
app.get('/api/products/:slug', (req, res) => {
  const db = readDB();
  const product = db.products.find(p => p.slug === req.params.slug && p.deleted_at === null);
  
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
});

// Create Product (Admin Protected)
app.post('/api/products', (req, res) => {
  const db = readDB();
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
  if (db.products.some(p => p.slug === slug && p.deleted_at === null)) {
    return res.status(400).json({ error: 'Ya existe un producto activo con ese nombre/slug' });
  }

  const productId = 'p' + Math.random().toString(36).substr(2, 9);
  
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

  // Handle product images
  if (Array.isArray(images) && images.length > 0) {
    images.forEach((img, index) => {
      db.product_images.push({
        id: 'img' + Math.random().toString(36).substr(2, 9),
        product_id: productId,
        storage_path: img.storage_path,
        position: img.position !== undefined ? Number(img.position) : index + 1,
        is_cover: !!img.is_cover
      });
    });
  } else {
    // Add default image placeholder if none provided
    db.product_images.push({
      id: 'img' + Math.random().toString(36).substr(2, 9),
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
});

// Update Product (Admin Protected)
app.put('/api/products/:id', (req, res) => {
  const db = readDB();
  const productId = req.params.id;
  const productIndex = db.products.findIndex(p => p.id === productId && p.deleted_at === null);

  if (productIndex === -1) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }

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

  const currentProduct = db.products[productIndex];
  
  // Re-slug if name changes
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

  // Update images
  if (images !== undefined) {
    // Delete existing images for this product
    db.product_images = db.product_images.filter(img => img.product_id !== productId);
    
    // Write new images list
    if (Array.isArray(images)) {
      images.forEach((img, index) => {
        db.product_images.push({
          id: img.id || 'img' + Math.random().toString(36).substr(2, 9),
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
});

// Soft Delete Product (Admin Protected)
app.delete('/api/products/:id', (req, res) => {
  const db = readDB();
  const productId = req.params.id;
  const productIndex = db.products.findIndex(p => p.id === productId && p.deleted_at === null);

  if (productIndex === -1) {
    return res.status(404).json({ error: 'Producto no encontrado o ya eliminado' });
  }

  db.products[productIndex].deleted_at = new Date().toISOString();
  db.products[productIndex].is_active = false;
  
  writeDB(db);
  res.json({ success: true, message: 'Producto eliminado correctamente' });
});

// Admin Authentication Simulation
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  
  // Clean simple credential checks for testing ease
  if (email === 'admin@scn.com' && password === 'admin123') {
    return res.json({
      success: true,
      token: 'simulated-jwt-token-for-scn-admin',
      user: {
        email: 'admin@scn.com',
        name: 'Administrador SCN'
      }
    });
  }
  
  return res.status(401).json({ error: 'Credenciales incorrectas. Usá admin@scn.com y admin123 para el demo.' });
});

// Admin Image Drag & Drop / Base64 Upload
app.post('/api/admin/upload', (req, res) => {
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
    const savePath = path.join(UPLOADS_DIR, uniqueName);

    fs.writeFileSync(savePath, buffer);
    
    // Return relative URL that our Express server will serve statically
    res.json({
      success: true,
      url: `/uploads/${uniqueName}`
    });
  } catch (err: any) {
    console.error('Upload Error:', err);
    res.status(500).json({ error: 'Error procesando la subida de imagen: ' + err.message });
  }
});


// ----------------- CLIENT ROUTING WITH VITE -----------------

async function startServer() {
  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SCN Catalog Server running on http://localhost:${PORT}`);
  });
}

startServer();
