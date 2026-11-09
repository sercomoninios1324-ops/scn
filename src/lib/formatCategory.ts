import { normalizeSearchText } from './catalogSearch';

/** Etiquetas canónicas para nombres/slugs mal cargados. */
const LABEL_BY_KEY: Record<string, string> = {
  accesorios: 'Accesorios',
  audio: 'Audio',
  auriculares: 'Auriculares',
  cables: 'Cables',
  cargadores: 'Cargadores',
  gadget: 'Gadget',
  gadgets: 'Gadgets',
  joysticks: 'Joysticks',
  kits: 'Kits',
  mouse: 'Mouse',
  mousepads: 'Mousepads',
  mousepad: 'Mousepad',
  parlantes: 'Parlantes',
  smartphones: 'Smartphones',
  smartphone: 'Smartphone',
  smartwatch: 'Smartwatch',
  smartwatches: 'Smartwatches',
  teclados: 'Teclados',
  teclado: 'Teclado',
  computadoragamer: 'Computadora Gamer',
  computadorasgamer: 'Computadoras Gamer',
  'computadora gamer': 'Computadora Gamer',
  'computadoras gamer': 'Computadoras Gamer',
  notebooks: 'Notebooks',
  notebook: 'Notebook',
  tablets: 'Tablets',
  tablet: 'Tablet',
};

/** Palabras para partir nombres pegados en MAYÚSCULAS (COMPUTADORAGAMER). */
const SPLIT_WORDS = [
  'computadoras',
  'computadora',
  'auriculares',
  'auricular',
  'cargadores',
  'cargador',
  'smartphones',
  'smartphone',
  'smartwatches',
  'smartwatch',
  'mousepads',
  'mousepad',
  'parlantes',
  'parlante',
  'joysticks',
  'joystick',
  'teclados',
  'teclado',
  'accesorios',
  'accesorio',
  'gadgets',
  'gadget',
  'cables',
  'cable',
  'notebooks',
  'notebook',
  'tablets',
  'tablet',
  'kits',
  'kit',
  'mouse',
  'audio',
  'gamer',
  'gaming',
  'smart',
  'watch',
].sort((a, b) => b.length - a.length);

function splitGluedWord(raw: string): string[] {
  let rest = normalizeSearchText(raw).replace(/\s+/g, '');
  if (!rest) return [];
  const parts: string[] = [];
  while (rest.length > 0) {
    const hit = SPLIT_WORDS.find((w) => rest.startsWith(w));
    if (!hit) {
      parts.push(rest);
      break;
    }
    parts.push(hit);
    rest = rest.slice(hit.length);
  }
  return parts;
}

function titleCaseWord(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

const INCLUDE_ACRONYMS = new Set([
  'usb',
  'hdmi',
  'rgb',
  'led',
  'otg',
  'sd',
  'aux',
  'wifi',
  'nfc',
  'qc',
  'pd',
]);

/** Ítems de “¿Qué incluye?”: oración normal — "Cable de carga". */
export function formatIncludeLabel(raw: string | null | undefined): string {
  if (!raw?.trim()) return '';
  const words = raw.replace(/\s+/g, ' ').trim().split(' ');
  return words
    .map((word, index) => {
      const clean = word.replace(/[^a-zA-ZÁÉÍÓÚÜÑáéíóúüñ0-9]/g, '');
      if (!clean) return word;
      const key = normalizeSearchText(clean);
      if (INCLUDE_ACRONYMS.has(key)) {
        return word.replace(clean, clean.toUpperCase());
      }
      const body =
        index === 0
          ? clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase()
          : clean.toLowerCase();
      return word.replace(clean, body);
    })
    .join(' ');
}

/**
 * Solo oculta ítems vacíos o que son exactamente el nombre/categoría del producto.
 * Nada de heurísticas: un accesorio real nunca se pierde en ninguna ficha.
 */
export function isRedundantInclude(
  item: string,
  product: { name: string; category?: { name: string } }
): boolean {
  const includeNorm = normalizeSearchText(item);
  if (!includeNorm) return true;

  const nameNorm = normalizeSearchText(product.name || '');
  const catNorm = normalizeSearchText(product.category?.name || '');

  return includeNorm === nameNorm || (!!catNorm && includeNorm === catNorm);
}

/**
 * Etiqueta legible para categorías: "Auriculares", "Computadora Gamer".
 * No grita en mayúsculas ni deja nombres pegados.
 */
export function formatCategoryLabel(raw: string | null | undefined): string {
  if (!raw?.trim()) return '';

  const spaced = raw.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const keySpaced = normalizeSearchText(spaced);
  const keyGlued = keySpaced.replace(/\s+/g, '');

  if (LABEL_BY_KEY[keySpaced]) return LABEL_BY_KEY[keySpaced];
  if (LABEL_BY_KEY[keyGlued]) return LABEL_BY_KEY[keyGlued];

  const looksGlued =
    !/\s/.test(spaced) &&
    (spaced === spaced.toUpperCase() || /^[a-z0-9]+$/i.test(spaced));

  const words = looksGlued
    ? splitGluedWord(spaced)
    : spaced.split(' ').filter(Boolean);

  const labeled = words.map((w) => {
    const k = normalizeSearchText(w);
    return LABEL_BY_KEY[k] ?? titleCaseWord(w);
  });

  const joined = labeled.join(' ');
  const joinedKey = normalizeSearchText(joined);
  return LABEL_BY_KEY[joinedKey] ?? joined;
}
