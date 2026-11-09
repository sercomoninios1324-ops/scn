import type { CartItem } from '../context/CartContext';
import { linkOrigin } from './whatsapp';

export type CartShareItem = {
  slug: string;
  qty: number;
  name?: string;
  price?: number;
};

export type CartShareResponse = {
  code: string;
  urlPath: string;
  items: CartShareItem[];
  created_at: string;
};

/** Mensaje corto: solo saludo + código + link. */
export function buildCartCodeWhatsAppMessage(code: string, origin?: string): string {
  const base = origin || linkOrigin();
  const url = `${base}/pedido/${code}`;
  return `Hola SCN! Quiero comprar.\nPedido: ${code}\n${url}`;
}

export async function createCartShare(
  items: CartItem[]
): Promise<CartShareResponse> {
  const res = await fetch('/api/cart-shares', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: items.map((i) => ({
        slug: i.slug,
        qty: i.qty,
        name: i.name,
        price: i.price,
      })),
    }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error || 'No se pudo generar el pedido');
  }
  return (await res.json()) as CartShareResponse;
}

export async function fetchCartShare(code: string): Promise<CartShareResponse> {
  const res = await fetch(`/api/cart-shares/${encodeURIComponent(code)}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error || 'Pedido no encontrado');
  }
  return (await res.json()) as CartShareResponse;
}
