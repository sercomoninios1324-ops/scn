import type { Category, Product } from '../types';

export type CatalogSort = 'default' | 'price-asc' | 'price-desc' | 'name-asc';

export type SearchableProduct = Product & {
  category?: { name: string; slug?: string };
};

export interface SearchCatalogOptions {
  categoryId?: string | null;
  sort?: CatalogSort;
  /** Solo productos con compare_at_price > price */
  onOffer?: boolean;
  /** Solo destacados */
  featured?: boolean;
  /** Solo con stock > 0 */
  inStock?: boolean;
}

export interface RankedProduct<T extends SearchableProduct = SearchableProduct> {
  product: T;
  score: number;
}

const FIELD_WEIGHTS = {
  name: 12,
  category: 9,
  sku: 10,
  short_description: 5,
  includes: 4,
  slug: 3,
  description: 2,
} as const;

/** Lowercase, strip diacritics, collapse whitespace. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeQuery(query: string): string[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  return normalized.split(' ').filter(Boolean);
}

function fieldHitScore(fieldNorm: string, token: string, weight: number): number {
  if (!fieldNorm || !token) return 0;
  if (fieldNorm === token) return weight * 3;
  if (fieldNorm.startsWith(token)) return weight * 2.2;
  if (fieldNorm.includes(` ${token}`) || fieldNorm.includes(token)) return weight;
  return 0;
}

function scoreProduct(product: SearchableProduct, tokens: string[]): number {
  if (tokens.length === 0) return 0;

  const name = normalizeSearchText(product.name || '');
  const sku = normalizeSearchText(product.sku || '');
  const shortDesc = normalizeSearchText(product.short_description || '');
  const description = normalizeSearchText(product.description || '');
  const slug = normalizeSearchText(product.slug || '');
  const categoryName = normalizeSearchText(product.category?.name || '');
  const categorySlug = normalizeSearchText(product.category?.slug || '');
  const includes = normalizeSearchText((product.includes || []).join(' '));

  let total = 0;

  for (const token of tokens) {
    const tokenScore = Math.max(
      fieldHitScore(name, token, FIELD_WEIGHTS.name),
      fieldHitScore(categoryName, token, FIELD_WEIGHTS.category),
      fieldHitScore(categorySlug, token, FIELD_WEIGHTS.category),
      fieldHitScore(sku, token, FIELD_WEIGHTS.sku),
      fieldHitScore(shortDesc, token, FIELD_WEIGHTS.short_description),
      fieldHitScore(includes, token, FIELD_WEIGHTS.includes),
      fieldHitScore(slug, token, FIELD_WEIGHTS.slug),
      fieldHitScore(description, token, FIELD_WEIGHTS.description)
    );

    if (tokenScore <= 0) return 0;
    total += tokenScore;
  }

  if (product.is_featured) total += 1.5;
  if (
    product.compare_at_price != null &&
    product.compare_at_price > product.price
  ) {
    total += 0.75;
  }

  return total;
}

function applySort<T extends SearchableProduct>(
  ranked: RankedProduct<T>[],
  sort: CatalogSort,
  hasQuery: boolean
): RankedProduct<T>[] {
  const list = [...ranked];

  if (sort === 'price-asc') {
    list.sort((a, b) => a.product.price - b.product.price || a.product.name.localeCompare(b.product.name));
  } else if (sort === 'price-desc') {
    list.sort((a, b) => b.product.price - a.product.price || a.product.name.localeCompare(b.product.name));
  } else if (sort === 'name-asc') {
    list.sort((a, b) => a.product.name.localeCompare(b.product.name));
  } else if (hasQuery) {
    list.sort(
      (a, b) =>
        b.score - a.score || a.product.name.localeCompare(b.product.name)
    );
  } else {
    list.sort((a, b) => a.product.name.localeCompare(b.product.name));
  }

  return list;
}

export function searchCatalog<T extends SearchableProduct>(
  products: T[],
  query: string,
  options: SearchCatalogOptions = {}
): RankedProduct<T>[] {
  const {
    categoryId = null,
    sort = 'default',
    onOffer = false,
    featured = false,
    inStock = false,
  } = options;
  const tokens = tokenizeQuery(query);
  const hasQuery = tokens.length > 0;

  let pool = products.filter((p) => p.is_active !== false);
  if (categoryId && categoryId !== 'all') {
    pool = pool.filter((p) => p.category_id === categoryId);
  }
  if (onOffer) {
    pool = pool.filter(
      (p) =>
        p.compare_at_price != null &&
        Number.isFinite(p.compare_at_price) &&
        p.compare_at_price > p.price
    );
  }
  if (featured) {
    pool = pool.filter((p) => p.is_featured);
  }
  if (inStock) {
    pool = pool.filter((p) => p.stock > 0);
  }

  const ranked: RankedProduct<T>[] = pool.map((product) => ({
    product,
    score: hasQuery ? scoreProduct(product, tokens) : 0,
  }));

  const matched = hasQuery ? ranked.filter((r) => r.score > 0) : ranked;
  return applySort(matched, sort, hasQuery);
}

export function suggestCategories(
  categories: Category[],
  query: string,
  limit = 4
): Category[] {
  const tokens = tokenizeQuery(query);
  if (!tokens.length) return [];

  return categories
    .map((cat) => {
      const name = normalizeSearchText(cat.name);
      const slug = normalizeSearchText(cat.slug);
      let score = 0;
      for (const token of tokens) {
        score += Math.max(
          fieldHitScore(name, token, 10),
          fieldHitScore(slug, token, 8)
        );
      }
      return { cat, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.cat.name.localeCompare(b.cat.name))
    .slice(0, limit)
    .map((x) => x.cat);
}

export function parseCatalogSort(value: string | null): CatalogSort {
  if (
    value === 'price-asc' ||
    value === 'price-desc' ||
    value === 'name-asc' ||
    value === 'default'
  ) {
    return value;
  }
  return 'default';
}
