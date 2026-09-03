

import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, ArrowUpDown, ChevronLeft, ChevronRight, RefreshCw, Layers } from 'lucide-react';
import { Product, Category } from '../types';

interface ProductsViewProps {
  products: (Product & { images: { storage_path: string; is_cover: boolean }[]; category?: { name: string } })[];
  categories: Category[];
  isLoading: boolean;
  onRefresh: () => void;
  setCurrentPage: (page: string) => void;
  setSelectedProductSlug: (slug: string) => void;
}

export default function ProductsView({
  products,
  categories,
  isLoading,
  onRefresh,
  setCurrentPage,
  setSelectedProductSlug
}: ProductsViewProps) {
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'name-asc'>('default');
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const itemsPerPage = 8;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPageNum(1);
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentPageNum(1);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as any);
    setCurrentPageNum(1);
  };

  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.short_description.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term)
      );
    }

    if (selectedCategory !== 'all') {
      result = result.filter(p => p.category_id === selectedCategory);
    }

    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'name-asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [products, searchTerm, selectedCategory, sortBy]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPageNum - 1) * itemsPerPage;
    return filteredAndSortedProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedProducts, currentPageNum]);

  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage) || 1;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const handleProductClick = (slug: string) => {
    setSelectedProductSlug(slug);
    setCurrentPage('product_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div id="products-view" className="page-enter mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20 pt-8 space-y-8">
      
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-scn-border pb-6">
        <div>
          <h1 id="catalog-title" className="font-display text-3xl font-extrabold text-scn-text-title tracking-tight">
            Catálogo de Productos
          </h1>
          <p className="text-sm text-scn-text-secondary mt-1">
            Explorá nuestra gama seleccionada y encontrá el dispositivo tecnológico perfecto para vos.
          </p>
        </div>
        <button
          id="catalog-refresh-btn"
          onClick={onRefresh}
          className="self-start flex items-center space-x-1.5 rounded-lg border border-scn-border bg-scn-bg-card px-3.5 py-2 text-xs font-semibold text-scn-text-normal hover:bg-scn-bg-section hover:text-scn-primary transition-colors cursor-pointer"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin text-scn-primary' : ''} />
          <span>Actualizar Catálogo</span>
        </button>
      </div>

      
      <div id="filter-bar" className="grid grid-cols-1 gap-4 lg:grid-cols-12 bg-scn-bg-card border border-scn-border rounded-2xl p-4 shadow-2xs">
        
        
        <div className="relative lg:col-span-5">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-scn-text-secondary" />
          <input
            id="product-search-input"
            type="text"
            placeholder="Buscar por nombre, descripción o SKU..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-scn-border bg-scn-bg-section text-sm text-scn-text-title placeholder-scn-text-secondary transition-all"
          />
        </div>

        
        <div className="lg:col-span-4 flex items-center space-x-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            id="cat-pill-all"
            onClick={() => handleCategoryChange('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-scn-primary text-white shadow-xs shadow-scn-primary/20'
                : 'bg-scn-bg-section text-scn-text-normal border border-scn-border hover:border-scn-primary/30'
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              id={`cat-pill-${cat.id}`}
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-scn-primary text-white shadow-xs shadow-scn-primary/20'
                  : 'bg-scn-bg-section text-scn-text-normal border border-scn-border hover:border-scn-primary/30'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        
        <div className="relative lg:col-span-3 flex items-center space-x-2">
          <ArrowUpDown size={16} className="text-scn-text-secondary shrink-0" />
          <select
            id="product-sort-select"
            value={sortBy}
            onChange={handleSortChange}
            className="w-full py-2.5 px-3 rounded-xl border border-scn-border bg-scn-bg-section text-xs font-semibold text-scn-text-title transition-all"
          >
            <option value="default">Relevancia / Destacados</option>
            <option value="price-asc">Precio: Menor a Mayor</option>
            <option value="price-desc">Precio: Mayor a Menor</option>
            <option value="name-asc">Nombre: A - Z</option>
          </select>
        </div>

      </div>

      
      {isLoading ? (
        /* Loading skeleton state */
        <div id="catalog-skeleton-grid" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="border border-scn-border bg-scn-bg-card rounded-2xl p-3 animate-pulse space-y-4">
              <div className="aspect-square bg-scn-bg-section rounded-xl w-full"></div>
              <div className="space-y-2 py-2">
                <div className="h-4 bg-scn-bg-section rounded w-3/4"></div>
                <div className="h-3 bg-scn-bg-section rounded w-1/2"></div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-scn-border/30">
                <div className="h-4 bg-scn-bg-section rounded w-1/3"></div>
                <div className="h-8 bg-scn-bg-section rounded-lg w-8"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredAndSortedProducts.length === 0 ? (
        /* Empty results state */
        <div id="catalog-empty-state" className="rounded-3xl border border-dashed border-scn-border p-16 text-center bg-scn-bg-card space-y-5 max-w-xl mx-auto">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-scn-primary/10 text-scn-primary">
            <Layers size={32} />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-display text-lg font-bold text-scn-text-title">
              No encontramos productos
            </h3>
            <p className="text-sm text-scn-text-normal">
              Probá cambiando los términos de búsqueda o seleccionando otra categoría de tecnología.
            </p>
          </div>
          <button
            id="catalog-reset-filters-btn"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
              setSortBy('default');
            }}
            className="rounded-xl bg-scn-primary px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-scn-hover transition-colors cursor-pointer"
          >
            Limpiar Filtros
          </button>
        </div>
      ) : (
        /* Main Catalog Grid */
        <div className="space-y-10">
          <div id="products-catalog-grid" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {paginatedProducts.map((product) => {
              const coverImg = product.images.find(img => img.is_cover)?.storage_path || product.images[0]?.storage_path;
              return (
                <div
                  id={`product-card-${product.id}`}
                  key={product.id}
                  onClick={() => handleProductClick(product.slug)}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-scn-border bg-scn-bg-card p-3 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:border-scn-primary/20 cursor-pointer"
                >
                  
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-scn-bg-section">
                    <img
                      src={coverImg}
                      alt={product.name}
                      loading="lazy"
                      className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />
                    {product.category && (
                      <span className="absolute top-2.5 left-2.5 rounded-full bg-scn-bg-card/95 backdrop-blur-xs px-2.5 py-0.5 text-2xs font-semibold text-scn-primary uppercase tracking-wider">
                        {product.category.name}
                      </span>
                    )}
                    {product.stock === 0 ? (
                      <span className="absolute top-2.5 right-2.5 rounded-full bg-rose-500 px-2.5 py-0.5 text-2xs font-semibold text-white tracking-wide">
                        Sin Stock
                      </span>
                    ) : product.stock <= 3 ? (
                      <span className="absolute top-2.5 right-2.5 rounded-full bg-amber-500 px-2.5 py-0.5 text-2xs font-semibold text-white tracking-wide">
                        Últimos {product.stock}!
                      </span>
                    ) : null}
                  </div>

                  
                  <div className="flex flex-1 flex-col justify-between pt-3 pb-1 px-1">
                    <div className="space-y-1">
                      <h3 className="font-display text-sm font-bold text-scn-text-title line-clamp-2 leading-snug group-hover:text-scn-primary transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-2xs text-scn-text-normal line-clamp-2">
                        {product.short_description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-scn-border/50">
                      <div className="flex flex-col">
                        <span className="text-2xs font-medium text-scn-text-secondary leading-none">Precio catálogo</span>
                        <span className="font-mono text-base font-extrabold text-scn-primary mt-0.5">
                          {formatPrice(product.price)}
                        </span>
                      </div>
                      <span className="rounded-lg bg-scn-primary/10 p-2 text-scn-primary group-hover:bg-scn-primary group-hover:text-white transition-all">
                        <ArrowUpDown size={14} className="rotate-90" />
                      </span>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          
          {totalPages > 1 && (
            <div id="catalog-pagination" className="flex items-center justify-center space-x-2 pt-6">
              <button
                id="pagination-prev"
                onClick={() => setCurrentPageNum(prev => Math.max(prev - 1, 1))}
                disabled={currentPageNum === 1}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-scn-border bg-scn-bg-card text-scn-text-normal transition-colors hover:bg-scn-bg-section disabled:opacity-40 disabled:hover:bg-scn-bg-card cursor-pointer"
              >
                <ChevronLeft size={18} />
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: totalPages }).map((_, index) => {
                  const pageNum = index + 1;
                  return (
                    <button
                      id={`pagination-page-${pageNum}`}
                      key={pageNum}
                      onClick={() => setCurrentPageNum(pageNum)}
                      className={`h-10 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        currentPageNum === pageNum
                          ? 'bg-scn-primary text-white shadow-sm shadow-scn-primary/25'
                          : 'border border-scn-border bg-scn-bg-card text-scn-text-normal hover:bg-scn-bg-section'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                id="pagination-next"
                onClick={() => setCurrentPageNum(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPageNum === totalPages}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-scn-border bg-scn-bg-card text-scn-text-normal transition-colors hover:bg-scn-bg-section disabled:opacity-40 disabled:hover:bg-scn-bg-card cursor-pointer"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
