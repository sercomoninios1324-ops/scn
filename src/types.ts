/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Category {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  price: number;
  currency: string;
  includes: string[]; // Deserialized from JSONB array
  category_id: string;
  is_featured: boolean;
  is_active: boolean;
  sku: string;
  stock: number;
  deleted_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  storage_path: string;
  position: number;
  is_cover: boolean;
}

export interface SiteSettings {
  whatsapp_number: string;
  instagram_url: string;
  email: string;
  hero_title: string;
  hero_subtitle: string;
}

export interface Admin {
  user_id: string;
  name: string;
  created_at?: string;
}

// Future e-commerce models
export interface Order {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  customer_name: string;
  customer_phone: string;
  total: number;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
}
