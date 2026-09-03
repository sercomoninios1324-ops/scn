

import React, { useState, useEffect } from 'react';
import { 
  Lock, LayoutGrid, FileEdit, Trash2, Plus, Settings, 
  Eye, EyeOff, Star, HelpCircle, Save, FolderPlus, Upload, 
  Trash, ChevronUp, ChevronDown, CheckSquare, Square, RefreshCw 
} from 'lucide-react';
import { Product, Category, SiteSettings } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { apiFetch, safeJson, setDevAdminToken } from '../lib/api';


interface AdminViewProps {
  products: (Product & { images: { id?: string; storage_path: string; is_cover: boolean; position: number }[]; category?: { name: string } })[];
  categories: Category[];
  siteSettings: SiteSettings;
  isAdminLoggedIn: boolean;
  onLoginSuccess: () => void;
  onRefreshData: () => void;
}

export default function AdminView({
  products,
  categories,
  siteSettings,
  isAdminLoggedIn,
  onLoginSuccess,
  onRefreshData
}: AdminViewProps) {
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<'products' | 'settings'>('products');

  const [isEditing, setIsEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newCatName, setNewCatName] = useState('');
  const [isCreatingCat, setIsCreatingCat] = useState(false);
  const [catError, setCatError] = useState('');

  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formShortDesc, setFormShortDesc] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formIncludes, setFormIncludes] = useState<string[]>([]);
  const [newIncludeItem, setNewIncludeItem] = useState('');
  
  const [formImages, setFormImages] = useState<{ id?: string; storage_path: string; is_cover: boolean; position: number }[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const [settingsWhatsapp, setSettingsWhatsapp] = useState('');
  const [settingsInstagram, setSettingsInstagram] = useState('');
  const [settingsEmail, setSettingsEmail] = useState('');
  const [settingsHeroTitle, setSettingsHeroTitle] = useState('');
  const [settingsHeroSubtitle, setSettingsHeroSubtitle] = useState('');
  const [settingsSaveStatus, setSettingsSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (siteSettings) {
      setSettingsWhatsapp(siteSettings.whatsapp_number || '');
      setSettingsInstagram(siteSettings.instagram_url || '');
      setSettingsEmail(siteSettings.email || '');
      setSettingsHeroTitle(siteSettings.hero_title || '');
      setSettingsHeroSubtitle(siteSettings.hero_subtitle || '');
    }
  }, [siteSettings, isAdminLoggedIn]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError || !data.session) {
          throw new Error(signInError?.message || 'Credenciales inválidas');
        }

        const accessToken = data.session.access_token;
        const meRes = await fetch('/api/admin/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!meRes.ok) {
          await supabase.auth.signOut();
          const errBody = (await safeJson(meRes).catch(() => null)) as {
            error?: string;
            detail?: string;
            userId?: string;
          } | null;
          const parts = [
            errBody?.error || 'Tu cuenta no tiene permisos de administrador',
            errBody?.detail,
            errBody?.userId ? `user_id: ${errBody.userId}` : null,
          ].filter(Boolean);
          throw new Error(parts.join(' — '));
        }

        onLoginSuccess();
      } else {
        const res = await fetch('/api/admin/dev-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = (await safeJson(res)) as {
          error?: string;
          token?: string;
        };

        if (!res.ok) {
          throw new Error(data.error || 'Credenciales inválidas');
        }

        if (data.token) {
          setDevAdminToken(data.token);
        }
        onLoginSuccess();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setLoginError(message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAddNewProduct = () => {
    setEditingProduct(null);
    setFormName('');
    setFormPrice('');
    setFormShortDesc('');
    setFormDesc('');
    setFormCategory(categories[0]?.id || '');
    setFormSku('SKU-' + Math.floor(Math.random() * 1000000));
    setFormStock('10');
    setFormIsActive(true);
    setFormIsFeatured(false);
    setFormIncludes([]);
    setFormImages([]);
    setIsEditing(true);
  };

  const handleStartEdit = (prod: any) => {
    setEditingProduct(prod);
    setFormName(prod.name || '');
    setFormPrice(String(prod.price) || '');
    setFormShortDesc(prod.short_description || '');
    setFormDesc(prod.description || '');
    setFormCategory(prod.category_id || '');
    setFormSku(prod.sku || '');
    setFormStock(String(prod.stock) || '0');
    setFormIsActive(prod.is_active);
    setFormIsFeatured(prod.is_featured);
    setFormIncludes(Array.isArray(prod.includes) ? [...prod.includes] : []);
    setFormImages(Array.isArray(prod.images) ? [...prod.images] : []);
    setIsEditing(true);
  };

  const handleProductSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPrice || !formCategory) {
      alert('Por favor completa los campos obligatorios: Nombre, Precio y Categoría');
      return;
    }

    const payload = {
      name: formName,
      short_description: formShortDesc,
      description: formDesc,
      price: Number(formPrice),
      category_id: formCategory,
      sku: formSku,
      stock: Number(formStock),
      is_active: formIsActive,
      is_featured: formIsFeatured,
      includes: formIncludes,
      images: formImages
    };

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await safeJson(res)) as { error?: string };
        throw new Error(data.error || 'Error al guardar el producto');
      }

      setIsEditing(false);
      onRefreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`¿Seguro que querés dar de baja el producto "${name}"?`)) {
      return;
    }

    try {
      const res = await apiFetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Error al dar de baja el producto');
      }

      onRefreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleBoolean = async (prod: Product, field: 'is_active' | 'is_featured') => {
    try {
      const res = await apiFetch(`/api/products/${prod.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          [field]: !prod[field],
        }),
      });
      if (!res.ok) throw new Error('Error de actualización rápida');
      onRefreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddIncludeItem = () => {
    if (newIncludeItem.trim() === '') return;
    setFormIncludes(prev => [...prev, newIncludeItem.trim()]);
    setNewIncludeItem('');
  };

  const handleRemoveIncludeItem = (index: number) => {
    setFormIncludes(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleCreateCategory = async () => {
    setCatError('');
    if (newCatName.trim() === '') return;

    try {
      const res = await apiFetch('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      const data = (await safeJson(res)) as { error?: string; id?: string };

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear la categoría');
      }

      setFormCategory(data.id);
      setNewCatName('');
      setIsCreatingCat(false);
      onRefreshData();
    } catch (err: any) {
      setCatError(err.message);
    }
  };

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim() === '') return;
    const newImg = {
      storage_path: imageUrlInput.trim(),
      is_cover: formImages.length === 0, // Cover if first
      position: formImages.length + 1
    };
    setFormImages(prev => [...prev, newImg]);
    setImageUrlInput('');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const res = await apiFetch('/api/admin/upload', {
            method: 'POST',
            body: JSON.stringify({
              base64,
              fileName: file.name,
            }),
          });
          const data = (await safeJson(res)) as { error?: string; url?: string };

          if (!res.ok) {
            throw new Error(data.error || 'Fallo de subida');
          }

          const newImg = {
            storage_path: data.url!,
            is_cover: formImages.length === 0,
            position: formImages.length + 1,
          };
          setFormImages((prev) => [...prev, newImg]);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Error desconocido';
          alert('Error al subir la imagen: ' + message);
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      alert('Error al subir la imagen: ' + message);
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleSetCoverImage = (index: number) => {
    setFormImages(prev => 
      prev.map((img, idx) => ({
        ...img,
        is_cover: idx === index
      }))
    );
  };

  const handleRemoveImage = (index: number) => {
    setFormImages(prev => {
      const filtered = prev.filter((_, idx) => idx !== index);
      if (filtered.length > 0 && !filtered.some(img => img.is_cover)) {
        filtered[0].is_cover = true;
      }
      return filtered.map((img, idx) => ({ ...img, position: idx + 1 }));
    });
  };

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === formImages.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newImages = [...formImages];
    const temp = newImages[index];
    newImages[index] = newImages[targetIndex];
    newImages[targetIndex] = temp;

    setFormImages(newImages.map((img, idx) => ({ ...img, position: idx + 1 })));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaveStatus('saving');

    try {
      const res = await apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          whatsapp_number: settingsWhatsapp,
          instagram_url: settingsInstagram,
          email: settingsEmail,
          hero_title: settingsHeroTitle,
          hero_subtitle: settingsHeroSubtitle,
        }),
      });

      if (!res.ok) {
        const data = (await safeJson(res)) as { error?: string };
        throw new Error(data.error || 'Error al guardar configuración');
      }
      setSettingsSaveStatus('success');
      onRefreshData();

      setTimeout(() => setSettingsSaveStatus('idle'), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar configuración';
      setSettingsSaveStatus('error');
      alert(message);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );


  if (!isAdminLoggedIn) {
    return (
      <div id="admin-login-screen" className="page-enter mx-auto max-w-md px-4 py-20">
        <div className="rounded-2xl border border-scn-border bg-scn-bg-card p-8 shadow-md space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-scn-primary/10 text-scn-primary">
              <Lock size={22} />
            </div>
            <h1 className="font-display text-xl font-extrabold text-scn-text-title">
              Acceso personal
            </h1>
            <p className="text-2xs text-scn-text-normal">
              Ingresá con tu cuenta.
            </p>
          </div>

          <form id="admin-login-form" onSubmit={handleLoginSubmit} className="space-y-4">
            {loginError && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-2xs text-rose-500 font-semibold text-center">
                {loginError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-2xs font-bold text-scn-text-title">Correo Electrónico</label>
              <input
                id="admin-email"
                type="email"
                required
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-scn-border bg-scn-bg-section text-xs placeholder-scn-text-secondary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-2xs font-bold text-scn-text-title">Contraseña</label>
              <input
                id="admin-password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-scn-border bg-scn-bg-section text-xs placeholder-scn-text-secondary"
              />
            </div>

            <button
              id="admin-login-btn"
              type="submit"
              disabled={isLoggingIn}
              className="w-full rounded-xl bg-scn-primary py-3 font-sans text-xs font-bold text-white shadow-md hover:bg-scn-hover transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isLoggingIn ? 'Iniciando sesión...' : 'Ingresar al Panel'}
            </button>
          </form>


        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div id="product-editor-container" className="page-enter mx-auto max-w-4xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between border-b border-scn-border pb-4">
          <div>
            <h1 className="font-display text-xl font-extrabold text-scn-text-title">
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto Electrónico'}
            </h1>
            <p className="text-3xs text-scn-text-secondary">
              {editingProduct ? `Editando ID: ${editingProduct.id}` : 'Completá los campos para dar de alta un producto'}
            </p>
          </div>
          <button
            onClick={() => setIsEditing(false)}
            className="text-xs font-semibold text-scn-text-secondary hover:text-scn-text-title border border-scn-border rounded-lg px-3.5 py-1.5 hover:bg-scn-bg-section cursor-pointer"
          >
            Volver sin guardar
          </button>
        </div>

        <form id="product-crud-form" onSubmit={handleProductSave} className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          
          <div className="md:col-span-8 space-y-5">
            <div className="rounded-2xl border border-scn-border bg-scn-bg-card p-6 space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-3xs font-bold uppercase tracking-wider text-scn-text-title">Nombre del Producto <span className="text-rose-500">*</span></label>
                  <input
                    id="form-product-name"
                    type="text"
                    required
                    placeholder="Ej. Auriculares Bluetooth SCN"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-scn-border bg-scn-bg-section text-xs text-scn-text-title font-medium"
                  />
                </div>

                
                <div className="space-y-1">
                  <label className="text-3xs font-bold uppercase tracking-wider text-scn-text-title">Precio (ARS) <span className="text-rose-500">*</span></label>
                  <input
                    id="form-product-price"
                    type="number"
                    required
                    min="0"
                    placeholder="89999"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-scn-border bg-scn-bg-section text-xs text-scn-text-title font-mono font-semibold"
                  />
                </div>

                
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-3xs font-bold uppercase tracking-wider text-scn-text-title">Categoría <span className="text-rose-500">*</span></label>
                    <button
                      type="button"
                      onClick={() => setIsCreatingCat(!isCreatingCat)}
                      className="text-4xs font-bold text-scn-primary hover:underline flex items-center space-x-0.5 cursor-pointer"
                    >
                      <FolderPlus size={8} />
                      <span>Nueva Categoría</span>
                    </button>
                  </div>

                  {isCreatingCat ? (
                    <div className="flex space-x-1.5 items-center">
                      <input
                        id="new-category-inline-input"
                        type="text"
                        placeholder="Ej. Computación"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-scn-border bg-scn-bg-section text-3xs"
                      />
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        className="bg-scn-primary text-white text-4xs font-bold px-2 py-1.5 rounded-lg cursor-pointer hover:bg-scn-hover"
                      >
                        Crear
                      </button>
                    </div>
                  ) : (
                    <select
                      id="form-product-category"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-scn-border bg-scn-bg-section text-xs font-semibold text-scn-text-title"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  )}
                  {catError && <p className="text-4xs text-rose-500 mt-1">{catError}</p>}
                </div>
              </div>

              
              <div className="space-y-1">
                <label className="text-3xs font-bold uppercase tracking-wider text-scn-text-title">Descripción Corta</label>
                <input
                  id="form-product-short-desc"
                  type="text"
                  placeholder="Ej. Parlante impermeable portátil de 20W de excelente sonido"
                  value={formShortDesc}
                  onChange={(e) => setFormShortDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-scn-border bg-scn-bg-section text-xs"
                />
              </div>

              
              <div className="space-y-1">
                <label className="text-3xs font-bold uppercase tracking-wider text-scn-text-title">Descripción Detallada / Especificaciones</label>
                <textarea
                  id="form-product-desc"
                  rows={4}
                  placeholder="Características, batería, sonido, conectividad..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-scn-border bg-scn-bg-section text-xs"
                />
              </div>

            </div>

            
            <div className="rounded-2xl border border-scn-border bg-scn-bg-card p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-scn-text-title border-b border-scn-border pb-2">
                ¿Qué incluye en la caja?
              </h3>
              
              <div className="flex space-x-2">
                <input
                  id="form-include-input"
                  type="text"
                  placeholder="Ej. Cable USB-C de 1 metro"
                  value={newIncludeItem}
                  onChange={(e) => setNewIncludeItem(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-scn-border bg-scn-bg-section text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddIncludeItem}
                  className="rounded-lg bg-scn-primary text-white px-4 py-2 text-xs font-semibold hover:bg-scn-hover transition-colors cursor-pointer"
                >
                  Agregar
                </button>
              </div>

              {formIncludes.length === 0 ? (
                <p className="text-4xs text-scn-text-secondary italic">No se agregaron ítems que incluye la caja todavía.</p>
              ) : (
                <div id="form-includes-tags" className="flex flex-wrap gap-2 pt-1">
                  {formIncludes.map((item, index) => (
                    <span key={index} className="inline-flex items-center space-x-1.5 rounded-lg bg-scn-primary/10 border border-scn-primary/20 px-2.5 py-1 text-xs font-semibold text-scn-primary">
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveIncludeItem(index)}
                        className="text-scn-primary hover:text-rose-500 font-bold ml-1 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            
            <div className="rounded-2xl border border-scn-border bg-scn-bg-card p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-scn-text-title border-b border-scn-border pb-2">
                Galería de Imágenes del Producto
              </h3>

              
              <div
                id="drag-and-drop-box"
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  dragActive ? 'border-scn-primary bg-scn-primary/5 scale-98' : 'border-scn-border bg-scn-bg-section/40'
                }`}
              >
                <input
                  type="file"
                  id="form-file-input"
                  multiple={false}
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <label htmlFor="form-file-input" className="cursor-pointer space-y-2 block">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-scn-primary/10 text-scn-primary">
                    <Upload size={20} />
                  </div>
                  <div className="text-xs font-bold text-scn-text-title">
                    Arrastrá y soltá una imagen acá, o <span className="text-scn-primary underline">buscala en tu disco</span>
                  </div>
                  <p className="text-4xs text-scn-text-secondary">Soporta PNG, JPG, WEBP de alta resolución</p>
                </label>
              </div>

              
              <div className="flex space-x-2">
                <input
                  id="form-image-url-input"
                  type="text"
                  placeholder="O pegá la URL directa de la imagen (ej. Unsplash)"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-scn-border bg-scn-bg-section text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="rounded-lg border border-scn-border bg-scn-bg-card text-scn-text-normal px-4 py-2 text-xs font-semibold hover:bg-scn-bg-section cursor-pointer"
                >
                  Cargar URL
                </button>
              </div>

              {isUploading && (
                <p className="text-4xs text-scn-primary font-bold animate-pulse">Procesando y subiendo imagen...</p>
              )}

              
              {formImages.length > 0 && (
                <div id="form-images-list" className="space-y-2 pt-2">
                  <label className="text-4xs font-bold uppercase text-scn-text-secondary">Imágenes de la galería (Arrastrá/Reordená):</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {formImages.map((img, index) => (
                      <div
                        key={index}
                        className={`flex items-center space-x-3 rounded-xl border p-2 bg-scn-bg-card transition-all ${
                          img.is_cover ? 'border-scn-primary ring-2 ring-scn-primary/10' : 'border-scn-border'
                        }`}
                      >
                        <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-scn-bg-section">
                          <img src={img.storage_path} alt="Vista previa" className="h-full w-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-4xs text-scn-text-secondary truncate">{img.storage_path}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <button
                              type="button"
                              onClick={() => handleSetCoverImage(index)}
                              className={`text-4xs font-bold transition-colors cursor-pointer ${
                                img.is_cover ? 'text-scn-primary' : 'text-scn-text-secondary hover:text-scn-primary'
                              }`}
                            >
                              {img.is_cover ? '★ Portada Principal' : '☆ Marcar Portada'}
                            </button>
                          </div>
                        </div>
                        
                        
                        <div className="flex flex-col space-y-1">
                          <button
                            type="button"
                            onClick={() => handleMoveImage(index, 'up')}
                            disabled={index === 0}
                            className="p-1 border border-scn-border rounded text-scn-text-secondary disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronUp size={10} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveImage(index, 'down')}
                            disabled={index === formImages.length - 1}
                            className="p-1 border border-scn-border rounded text-scn-text-secondary disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronDown size={10} />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded cursor-pointer shrink-0"
                        >
                          <Trash size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          
          <div className="md:col-span-4 space-y-5">
            
            <div className="rounded-2xl border border-scn-border bg-scn-bg-card p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-scn-text-title border-b border-scn-border pb-2">
                Logística (Futuro E-com)
              </h3>

              
              <div className="space-y-1">
                <label className="text-3xs font-bold uppercase tracking-wider text-scn-text-title">SKU / Referencia</label>
                <input
                  id="form-product-sku"
                  type="text"
                  placeholder="Ej. CEL-SCN-X1"
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-scn-border bg-scn-bg-section text-xs font-mono"
                />
              </div>

              
              <div className="space-y-1">
                <label className="text-3xs font-bold uppercase tracking-wider text-scn-text-title">Cantidad en Stock</label>
                <input
                  id="form-product-stock"
                  type="number"
                  min="0"
                  placeholder="10"
                  value={formStock}
                  onChange={(e) => setFormStock(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-scn-border bg-scn-bg-section text-xs font-mono"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-scn-border bg-scn-bg-card p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-scn-text-title border-b border-scn-border pb-2">
                Estado y Visibilidad
              </h3>

              
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-scn-text-title">Producto Activo</span>
                  <span className="text-4xs text-scn-text-secondary">Visible en el catálogo público</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormIsActive(!formIsActive)}
                  className="text-scn-primary cursor-pointer hover:scale-105 transition-transform"
                >
                  {formIsActive ? <CheckSquare size={22} /> : <Square size={22} />}
                </button>
              </div>

              
              <div className="flex items-center justify-between border-t border-scn-border/50 pt-3">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-scn-text-title">Destacado</span>
                  <span className="text-4xs text-scn-text-secondary">Se muestra en la Home</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormIsFeatured(!formIsFeatured)}
                  className="text-amber-500 cursor-pointer hover:scale-105 transition-transform"
                >
                  {formIsFeatured ? <CheckSquare size={22} /> : <Square size={22} />}
                </button>
              </div>
            </div>

            
            <button
              id="form-save-btn"
              type="submit"
              className="w-full rounded-xl bg-scn-primary py-4 font-sans text-xs font-bold text-white shadow-lg shadow-scn-primary/20 hover:bg-scn-hover transition-colors cursor-pointer"
            >
              Guardar Cambios del Producto
            </button>

          </div>

        </form>
      </div>
    );
  }

  return (
    <div id="admin-dashboard-container" className="page-enter mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20 pt-8 space-y-6">
      
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-scn-border pb-4">
        <div>
          <h1 id="admin-title" className="font-display text-2xl font-extrabold text-scn-text-title tracking-tight flex items-center space-x-2">
            <span>Panel de Administración</span>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-4xs font-bold text-amber-500 uppercase tracking-wider">MODO DEMO</span>
          </h1>
          <p className="text-xs text-scn-text-secondary mt-0.5">
            Gestioná el catálogo, subí fotos directo, modificá precios y ajustá las redes de SCN.
          </p>
        </div>

        
        <div className="flex items-center space-x-2 bg-scn-bg-section border border-scn-border rounded-xl p-1">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center space-x-1 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'bg-scn-bg-card text-scn-primary shadow-xs'
                : 'text-scn-text-normal hover:text-scn-text-title'
            }`}
          >
            <LayoutGrid size={13} />
            <span>Productos</span>
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center space-x-1 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-scn-bg-card text-scn-primary shadow-xs'
                : 'text-scn-text-normal hover:text-scn-text-title'
            }`}
          >
            <Settings size={13} />
            <span>Configuración del Sitio</span>
          </button>
        </div>
      </div>

      
      {activeTab === 'products' && (
        <div id="admin-products-tab" className="space-y-4">
          
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            
            <div className="relative w-full sm:max-w-xs">
              <input
                id="admin-search-products"
                type="text"
                placeholder="Buscar por nombre o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-scn-border bg-scn-bg-card text-xs placeholder-scn-text-secondary"
              />
            </div>

            
            <button
              id="admin-add-product-btn"
              onClick={handleAddNewProduct}
              className="w-full sm:w-auto flex items-center justify-center space-x-1.5 rounded-xl bg-scn-primary px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-scn-hover transition-colors cursor-pointer"
            >
              <Plus size={15} />
              <span>Agregar Nuevo Producto</span>
            </button>

          </div>

          
          <div className="overflow-hidden rounded-2xl border border-scn-border bg-scn-bg-card shadow-sm transition-colors">
            <div className="overflow-x-auto">
              <table id="admin-products-table" className="w-full text-left border-collapse">
                
                <thead>
                  <tr className="border-b border-scn-border bg-scn-bg-section/50 text-4xs font-bold uppercase tracking-wider text-scn-text-secondary">
                    <th className="p-4 w-16">Miniatura</th>
                    <th className="p-4">Producto</th>
                    <th className="p-4">Categoría</th>
                    <th className="p-4">Precio</th>
                    <th className="p-4 text-center">Estado</th>
                    <th className="p-4 text-center">Destacado</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-scn-border text-xs">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-scn-text-secondary italic">
                        No se encontraron productos en el catálogo.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((prod) => {
                      const cover = prod.images.find(img => img.is_cover)?.storage_path || prod.images[0]?.storage_path;
                      return (
                        <tr key={prod.id} className="hover:bg-scn-bg-section/20 transition-colors">
                          
                          
                          <td className="p-4">
                            <div className="h-10 w-10 rounded-lg overflow-hidden border border-scn-border bg-scn-bg-section shrink-0">
                              <img src={cover} alt={prod.name} className="h-full w-full object-cover" />
                            </div>
                          </td>

                          
                          <td className="p-4 font-medium">
                            <div className="flex flex-col">
                              <span className="text-scn-text-title font-bold text-xs">{prod.name}</span>
                              <span className="text-4xs text-scn-text-secondary font-mono">SKU: {prod.sku || 'N/D'}</span>
                            </div>
                          </td>

                          
                          <td className="p-4 text-scn-text-normal font-semibold">
                            {prod.category?.name || 'Accesorios'}
                          </td>

                          
                          <td className="p-4 font-mono font-bold text-scn-primary">
                            {formatPrice(prod.price)}
                          </td>

                          
                          <td className="p-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleBoolean(prod, 'is_active')}
                              className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-4xs font-bold cursor-pointer transition-all ${
                                prod.is_active 
                                  ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15'
                                  : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/15'
                              }`}
                            >
                              {prod.is_active ? <Eye size={10} /> : <EyeOff size={10} />}
                              <span>{prod.is_active ? 'Activo' : 'Pausado'}</span>
                            </button>
                          </td>

                          
                          <td className="p-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleBoolean(prod, 'is_featured')}
                              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-4xs font-bold cursor-pointer transition-all ${
                                prod.is_featured
                                  ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/15'
                                  : 'bg-scn-bg-section text-scn-text-secondary hover:bg-scn-primary/10 hover:text-scn-primary'
                              }`}
                            >
                              <Star size={10} className={prod.is_featured ? 'fill-amber-500 text-amber-500' : ''} />
                              <span>{prod.is_featured ? 'Sí' : 'No'}</span>
                            </button>
                          </td>

                          
                          <td className="p-4 text-right space-x-1.5">
                            <button
                              id={`edit-prod-btn-${prod.id}`}
                              onClick={() => handleStartEdit(prod)}
                              className="p-1.5 hover:bg-scn-primary/10 rounded text-scn-text-secondary hover:text-scn-primary cursor-pointer inline-flex items-center justify-center"
                              title="Editar"
                            >
                              <FileEdit size={14} />
                            </button>
                            <button
                              id={`delete-prod-btn-${prod.id}`}
                              onClick={() => handleDeleteProduct(prod.id, prod.name)}
                              className="p-1.5 hover:bg-rose-500/10 rounded text-scn-text-secondary hover:text-rose-500 cursor-pointer inline-flex items-center justify-center"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>

              </table>
            </div>
          </div>

        </div>
      )}

      
      {activeTab === 'settings' && (
        <form id="site-settings-form" onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          
          <div className="md:col-span-8 rounded-2xl border border-scn-border bg-scn-bg-card p-6 space-y-6">
            
            <h2 className="font-display text-lg font-bold text-scn-text-title border-b border-scn-border pb-2.5">
              Configuración General
            </h2>

            {settingsSaveStatus === 'success' && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-2xs text-emerald-500 font-semibold text-center">
                ¡Configuración guardada correctamente de forma persistente!
              </div>
            )}
            {settingsSaveStatus === 'error' && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-2xs text-rose-500 font-semibold text-center">
                Error al guardar los cambios en la base de datos.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              
              <div className="space-y-1">
                <label className="text-3xs font-bold uppercase tracking-wider text-scn-text-title">WhatsApp de Ventas <span className="text-rose-500">*</span></label>
                <input
                  id="settings-whatsapp"
                  type="text"
                  required
                  placeholder="Ej. 2915224734"
                  value={settingsWhatsapp}
                  onChange={(e) => setSettingsWhatsapp(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-scn-border bg-scn-bg-section text-xs"
                />
                <p className="text-4xs text-scn-text-secondary">Escribir sin símbolos (+ o -). Código de país primero.</p>
              </div>

              
              <div className="space-y-1">
                <label className="text-3xs font-bold uppercase tracking-wider text-scn-text-title">Enlace Instagram <span className="text-rose-500">*</span></label>
                <input
                  id="settings-instagram"
                  type="text"
                  required
                  placeholder="https://instagram.com/nombre"
                  value={settingsInstagram}
                  onChange={(e) => setSettingsInstagram(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-scn-border bg-scn-bg-section text-xs"
                />
              </div>

              
              <div className="space-y-1">
                <label className="text-3xs font-bold uppercase tracking-wider text-scn-text-title">Correo Oficial <span className="text-rose-500">*</span></label>
                <input
                  id="settings-email"
                  type="email"
                  required
                  placeholder="contacto@seamoscomoninos.com"
                  value={settingsEmail}
                  onChange={(e) => setSettingsEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-scn-border bg-scn-bg-section text-xs"
                />
              </div>

            </div>

            <div className="space-y-4 border-t border-scn-border pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-scn-text-title">Contenido del Home Hero</h3>

              <div className="space-y-1">
                <label className="text-3xs font-bold uppercase tracking-wider text-scn-text-title">Título del Hero</label>
                <input
                  id="settings-hero-title"
                  type="text"
                  placeholder="SCN — Seamos como niños"
                  value={settingsHeroTitle}
                  onChange={(e) => setSettingsHeroTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-scn-border bg-scn-bg-section text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-3xs font-bold uppercase tracking-wider text-scn-text-title">Subtítulo del Hero</label>
                <textarea
                  id="settings-hero-subtitle"
                  rows={3}
                  placeholder="Texto descriptivo para cautivar a tus clientes..."
                  value={settingsHeroSubtitle}
                  onChange={(e) => setSettingsHeroSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-scn-border bg-scn-bg-section text-xs"
                />
              </div>
            </div>

          </div>

          
          <div className="md:col-span-4 rounded-2xl border border-scn-border bg-scn-bg-card p-6 shadow-2xs flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-scn-text-title border-b border-scn-border pb-2">
                Publicar Cambios
              </h3>
              <p className="text-2xs text-scn-text-normal leading-relaxed">
                Al guardar la configuración, los cambios impactarán en tiempo real en la barra de navegación, hero del home, pie de página (footer) y redirección dinámica de mensajes de WhatsApp.
              </p>
            </div>

            <button
              id="settings-save-btn"
              type="submit"
              disabled={settingsSaveStatus === 'saving'}
              className="w-full flex items-center justify-center space-x-1.5 rounded-xl bg-scn-primary py-3.5 font-sans text-xs font-bold text-white shadow-md hover:bg-scn-hover transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Save size={15} />
              <span>{settingsSaveStatus === 'saving' ? 'Guardando...' : 'Guardar Configuración'}</span>
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
