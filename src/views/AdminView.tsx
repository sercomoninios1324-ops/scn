

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Lock, LayoutGrid, FileEdit, Trash2, Plus, Settings,
  Eye, EyeOff, Star, Zap, Save, FolderPlus, Upload,
  Trash, ChevronUp, ChevronDown, CheckSquare, Square, LogOut,
  ExternalLink, Tags, Pencil, Check, X, ArrowLeft, ImageOff,
} from 'lucide-react';
import { Product, Category, SiteSettings } from '../types';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { apiFetch, safeJson, setDevAdminToken } from '../lib/api';
import CatalogImage from '../components/CatalogImage';


interface AdminViewProps {
  products: (Product & { images: { id?: string; storage_path: string; is_cover: boolean; position: number }[]; category?: { name: string } })[];
  categories: Category[];
  siteSettings: SiteSettings;
  isAdminLoggedIn: boolean;
  isAdminChecking?: boolean;
  onLoginSuccess: () => void;
  onLogout: () => Promise<void> | void;
  onRefreshData: () => void;
}

type StatusFilter = 'all' | 'active' | 'paused' | 'featured' | 'offer' | 'noimage';
type Toast = { type: 'success' | 'error'; message: string } | null;

export default function AdminView({
  products,
  categories,
  siteSettings,
  isAdminLoggedIn,
  isAdminChecking = false,
  onLoginSuccess,
  onLogout,
  onRefreshData
}: AdminViewProps) {
  const [toast, setToast] = useState<Toast>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = (type: 'success' | 'error', message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), type === 'error' ? 6000 : 3000);
  };
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);


  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'settings'>('products');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [renamingCatId, setRenamingCatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [catTabNewName, setCatTabNewName] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [newCatName, setNewCatName] = useState('');
  const [isCreatingCat, setIsCreatingCat] = useState(false);
  const [catError, setCatError] = useState('');

  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCompareAtPrice, setFormCompareAtPrice] = useState('');
  const [formShortDesc, setFormShortDesc] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formIsPush, setFormIsPush] = useState(false);
  const [formIncludes, setFormIncludes] = useState<string[]>([]);
  const [newIncludeItem, setNewIncludeItem] = useState('');

  const [formImages, setFormImages] = useState<{ id?: string; storage_path: string; is_cover: boolean; position: number }[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const isUploading = uploadingCount > 0;
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
      const supabase = isSupabaseConfigured ? await getSupabase() : null;
      if (supabase) {
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
    setFormCompareAtPrice('');
    setFormShortDesc('');
    setFormDesc('');
    setFormCategory(categories[0]?.id || '');
    setFormSku('SKU-' + Math.floor(Math.random() * 1000000));
    setFormStock('10');
    setFormIsActive(true);
    setFormIsFeatured(false);
    setFormIsPush(false);
    setFormIncludes([]);
    setFormImages([]);
    setIsEditing(true);
    window.scrollTo({ top: 0 });
  };

  const handleStartEdit = (prod: any) => {
    setEditingProduct(prod);
    setFormName(prod.name || '');
    setFormPrice(String(prod.price) || '');
    setFormCompareAtPrice(
      prod.compare_at_price != null && Number(prod.compare_at_price) > 0
        ? String(prod.compare_at_price)
        : ''
    );
    setFormShortDesc(prod.short_description || '');
    setFormDesc(prod.description || '');
    setFormCategory(prod.category_id || '');
    setFormSku(prod.sku || '');
    setFormStock(String(prod.stock) || '0');
    setFormIsActive(prod.is_active);
    setFormIsFeatured(prod.is_featured);
    setFormIsPush(!!prod.is_push);
    setFormIncludes(Array.isArray(prod.includes) ? [...prod.includes] : []);
    setFormImages(Array.isArray(prod.images) ? [...prod.images] : []);
    setIsEditing(true);
    window.scrollTo({ top: 0 });
  };

  const handleProductSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingProduct || isUploading) return;
    if (!formName || !formPrice || !formCategory) {
      notify('error', 'Completá los campos obligatorios: nombre, precio y categoría.');
      return;
    }
    if (Number(formPrice) <= 0) {
      notify('error', 'El precio tiene que ser mayor a 0.');
      return;
    }

    const compareAt = formCompareAtPrice.trim() === '' ? null : Number(formCompareAtPrice);
    const payload = {
      name: formName,
      short_description: formShortDesc,
      description: formDesc,
      price: Number(formPrice),
      compare_at_price:
        compareAt != null && Number.isFinite(compareAt) && compareAt > 0 ? compareAt : null,
      category_id: formCategory,
      sku: formSku,
      stock: Number(formStock),
      is_active: formIsActive,
      is_featured: formIsFeatured,
      is_push: formIsPush,
      includes: formIncludes,
      images: formImages
    };

    setIsSavingProduct(true);
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
      notify('success', editingProduct ? 'Producto actualizado.' : 'Producto creado.');
      onRefreshData();
    } catch (err: any) {
      notify('error', err.message);
    } finally {
      setIsSavingProduct(false);
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

      notify('success', `"${name}" se dio de baja.`);
      onRefreshData();
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleToggleBoolean = async (
    prod: Product,
    field: 'is_active' | 'is_featured' | 'is_push'
  ) => {
    try {
      const current = field === 'is_push' ? !!prod.is_push : !!prod[field];
      const res = await apiFetch(`/api/products/${prod.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          [field]: !current,
        }),
      });
      if (!res.ok) {
        const data = (await safeJson(res).catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || 'No se pudo actualizar el producto');
      }
      onRefreshData();
    } catch (err: any) {
      notify('error', err.message);
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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
      reader.readAsDataURL(file);
    });

  /** Sube una o varias fotos en orden. Updates funcionales: portada y orden quedan bien. */
  const processFiles = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (images.length < files.length) {
      notify('error', 'Solo se pueden subir imágenes (JPG, PNG, WebP o GIF).');
    }
    for (const file of images) {
      if (file.size > 8 * 1024 * 1024) {
        notify('error', `"${file.name}" pesa más de 8 MB.`);
        continue;
      }
      setUploadingCount((n) => n + 1);
      try {
        const base64 = await readAsDataUrl(file);
        const res = await apiFetch('/api/admin/upload', {
          method: 'POST',
          body: JSON.stringify({ base64, fileName: file.name }),
        });
        const data = (await safeJson(res)) as { error?: string; url?: string };
        if (!res.ok || !data.url) throw new Error(data.error || 'Fallo de subida');
        const url = data.url;
        setFormImages((prev) => [
          ...prev,
          { storage_path: url, is_cover: prev.length === 0, position: prev.length + 1 },
        ]);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error desconocido';
        notify('error', `No se pudo subir "${file.name}": ${message}`);
      } finally {
        setUploadingCount((n) => n - 1);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      void processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      void processFiles(Array.from(e.target.files));
    }
    e.target.value = '';
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
      notify('success', 'Configuración guardada.');
      onRefreshData();

      setTimeout(() => setSettingsSaveStatus('idle'), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar configuración';
      setSettingsSaveStatus('error');
      notify('error', message);
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

  const productCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) map.set(p.category_id, (map.get(p.category_id) || 0) + 1);
    return map;
  }, [products]);

  const statusCounts = useMemo(
    () => ({
      all: products.length,
      active: products.filter((p) => p.is_active).length,
      paused: products.filter((p) => !p.is_active).length,
      featured: products.filter((p) => p.is_featured).length,
      offer: products.filter((p) => p.compare_at_price != null && Number(p.compare_at_price) > p.price).length,
      noimage: products.filter((p) => !p.images?.length).length,
    }),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !(p.sku || '').toLowerCase().includes(q)) return false;
      if (categoryFilter && p.category_id !== categoryFilter) return false;
      switch (statusFilter) {
        case 'active': return p.is_active;
        case 'paused': return !p.is_active;
        case 'featured': return p.is_featured;
        case 'offer': return p.compare_at_price != null && Number(p.compare_at_price) > p.price;
        case 'noimage': return !p.images?.length;
        default: return true;
      }
    });
  }, [products, searchTerm, categoryFilter, statusFilter]);

  const handleCategoryTabCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = catTabNewName.trim();
    if (!name) return;
    try {
      const res = await apiFetch('/api/categories', { method: 'POST', body: JSON.stringify({ name }) });
      const data = (await safeJson(res)) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'No se pudo crear la categoría');
      setCatTabNewName('');
      notify('success', `Categoría "${name}" creada.`);
      onRefreshData();
    } catch (err: unknown) {
      notify('error', err instanceof Error ? err.message : 'No se pudo crear la categoría');
    }
  };

  const handleRenameCategory = async (id: string) => {
    const name = renameValue.trim();
    if (!name) return;
    try {
      const res = await apiFetch(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify({ name }) });
      const data = (await safeJson(res)) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'No se pudo renombrar');
      setRenamingCatId(null);
      notify('success', 'Categoría renombrada.');
      onRefreshData();
    } catch (err: unknown) {
      notify('error', err instanceof Error ? err.message : 'No se pudo renombrar');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`¿Borrar la categoría "${name}"? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
      const data = (await safeJson(res)) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'No se pudo borrar');
      notify('success', `Categoría "${name}" borrada.`);
      onRefreshData();
    } catch (err: unknown) {
      notify('error', err instanceof Error ? err.message : 'No se pudo borrar');
    }
  };

  const handleLogoutClick = async () => {
    await onLogout();
  };

  const toastNode = toast ? (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-start gap-3 rounded-xl border p-3.5 text-sm font-semibold shadow-xl sm:inset-x-auto sm:right-6 sm:bottom-6 ${
        toast.type === 'error'
          ? 'border-rose-500/30 bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200'
          : 'border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200'
      }`}
    >
      <span className="flex-1">{toast.message}</span>
      <button type="button" onClick={() => setToast(null)} aria-label="Cerrar aviso" className="-m-1 p-1 opacity-70 hover:opacity-100 cursor-pointer">
        <X size={16} />
      </button>
    </div>
  ) : null;

  const statusChips: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'active', label: 'Activos' },
    { key: 'paused', label: 'Pausados' },
    { key: 'featured', label: 'Destacados' },
    { key: 'offer', label: 'En oferta' },
    { key: 'noimage', label: 'Sin foto' },
  ];


  if (!isAdminLoggedIn && isAdminChecking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" role="status">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-scn-primary border-t-transparent" />
        <span className="sr-only">Verificando sesión…</span>
      </div>
    );
  }

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
            <Link to="/" className="inline-block pt-1 text-2xs font-semibold text-scn-text-secondary hover:text-scn-primary">
              ← Volver al sitio
            </Link>
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
                autoComplete="username"
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
                autoComplete="current-password"
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
              {editingProduct ? 'Editar producto' : 'Nuevo producto'}
            </h1>
            <p className="text-3xs text-scn-text-secondary">
              {editingProduct ? (
                <a
                  href={`/producto/${editingProduct.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-scn-primary hover:underline"
                >
                  Ver en el sitio <ExternalLink size={11} />
                </a>
              ) : (
                'Completá los campos para dar de alta un producto'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm('¿Salir sin guardar? Se pierden los cambios que no guardaste.')) setIsEditing(false);
            }}
            className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-scn-text-secondary hover:text-scn-text-title border border-scn-border rounded-lg px-3.5 py-2 hover:bg-scn-bg-section cursor-pointer"
          >
            <ArrowLeft size={14} />
            Volver
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
                  <label className="text-3xs font-bold uppercase tracking-wider text-scn-text-title">
                    Precio anterior (opcional)
                  </label>
                  <input
                    id="form-product-compare-at"
                    type="number"
                    min="0"
                    placeholder="109999"
                    value={formCompareAtPrice}
                    onChange={(e) => setFormCompareAtPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-scn-border bg-scn-bg-section text-xs text-scn-text-title font-mono font-semibold"
                  />
                  <p className="text-4xs text-scn-text-secondary leading-snug">
                    Si es mayor al precio, se muestra badge Oferta y precio tachado.
                  </p>
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
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <label htmlFor="form-file-input" className="cursor-pointer space-y-2 block">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-scn-primary/10 text-scn-primary">
                    <Upload size={20} />
                  </div>
                  <div className="text-xs font-bold text-scn-text-title">
                    Tocá para elegir fotos <span className="hidden sm:inline">o arrastralas acá</span>
                  </div>
                  <p className="text-4xs text-scn-text-secondary">JPG, PNG, WebP o GIF · hasta 8 MB c/u · podés elegir varias. Se optimizan solas.</p>
                </label>
              </div>


              {isUploading && (
                <p className="text-4xs text-scn-primary font-bold animate-pulse">
                  Subiendo {uploadingCount} {uploadingCount === 1 ? 'foto' : 'fotos'}…
                </p>
              )}


              {formImages.length > 0 && (
                <div id="form-images-list" className="space-y-2 pt-2">
                  <label className="text-4xs font-bold uppercase text-scn-text-secondary">Fotos (la primera con ★ es la portada; usá las flechas para ordenar)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {formImages.map((img, index) => (
                      <div
                        key={index}
                        className={`flex items-center space-x-3 rounded-xl border p-2 bg-scn-bg-card transition-all ${
                          img.is_cover ? 'border-scn-primary ring-2 ring-scn-primary/10' : 'border-scn-border'
                        }`}
                      >
                        <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-scn-bg-section">
                          <CatalogImage src={img.storage_path} width={160} alt="Vista previa" className="h-full w-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-4xs text-scn-text-secondary">Foto {index + 1}</p>
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
                            aria-label="Subir foto"
                            className="flex h-8 w-8 items-center justify-center border border-scn-border rounded-md text-scn-text-secondary disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveImage(index, 'down')}
                            disabled={index === formImages.length - 1}
                            aria-label="Bajar foto"
                            className="flex h-8 w-8 items-center justify-center border border-scn-border rounded-md text-scn-text-secondary disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          aria-label="Quitar foto"
                          className="flex h-9 w-9 items-center justify-center text-rose-500 hover:bg-rose-500/10 rounded-md cursor-pointer shrink-0"
                        >
                          <Trash size={15} />
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
                Inventario
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
                  <span className="text-4xs text-scn-text-secondary">Aparece en Destacados del inicio</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormIsFeatured(!formIsFeatured)}
                  className="text-amber-500 cursor-pointer hover:scale-105 transition-transform"
                >
                  {formIsFeatured ? <CheckSquare size={22} /> : <Square size={22} />}
                </button>
              </div>

              <div className="flex items-center justify-between border-t border-scn-border/50 pt-3">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-scn-text-title">Producto de empuje</span>
                  <span className="text-4xs text-scn-text-secondary">Tarjeta “Hoy en SCN” del inicio (solo uno)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormIsPush(!formIsPush)}
                  className="text-scn-primary cursor-pointer hover:scale-105 transition-transform"
                >
                  {formIsPush ? <CheckSquare size={22} /> : <Square size={22} />}
                </button>
              </div>
            </div>


            <button
              id="form-save-btn"
              type="submit"
              disabled={isSavingProduct || isUploading}
              className="w-full rounded-xl bg-scn-primary py-4 font-sans text-sm font-bold text-white shadow-lg shadow-scn-primary/20 hover:bg-scn-hover transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
            >
              {isSavingProduct ? 'Guardando…' : isUploading ? 'Esperá a que suban las fotos…' : 'Guardar producto'}
            </button>

          </div>

        </form>
        {toastNode}
      </div>
    );
  }

  return (
    <div id="admin-dashboard-container" className="page-enter mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20 pt-8 space-y-6">


      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-scn-border pb-4">
        <div>
          <h1 id="admin-title" className="font-display text-2xl font-extrabold text-scn-text-title tracking-tight">
            Panel SCN
          </h1>
          <p className="text-xs text-scn-text-secondary mt-0.5">
            Productos, fotos, precios y datos de contacto del sitio.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-scn-border px-3 text-xs font-semibold text-scn-text-normal hover:bg-scn-bg-section"
            >
              <ExternalLink size={13} /> Ver sitio
            </Link>
            <button
              type="button"
              onClick={handleLogoutClick}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-scn-border px-3 text-xs font-semibold text-scn-text-normal hover:border-rose-500/40 hover:text-rose-500 cursor-pointer"
            >
              <LogOut size={13} /> Cerrar sesión
            </button>
          </div>
        </div>


        <div className="flex w-full items-center gap-1 overflow-x-auto bg-scn-bg-section border border-scn-border rounded-xl p-1 sm:w-auto">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex shrink-0 items-center space-x-1 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'bg-scn-bg-card text-scn-primary shadow-xs'
                : 'text-scn-text-normal hover:text-scn-text-title'
            }`}
          >
            <LayoutGrid size={13} />
            <span>Productos</span>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex shrink-0 items-center space-x-1 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-scn-bg-card text-scn-primary shadow-xs'
                : 'text-scn-text-normal hover:text-scn-text-title'
            }`}
          >
            <Tags size={13} />
            <span>Categorías</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex shrink-0 items-center space-x-1 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-scn-bg-card text-scn-primary shadow-xs'
                : 'text-scn-text-normal hover:text-scn-text-title'
            }`}
          >
            <Settings size={13} />
            <span>Configuración</span>
          </button>
        </div>
      </div>


      {activeTab === 'products' && (
        <div id="admin-products-tab" className="space-y-4">


          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">


            <div className="flex w-full flex-col gap-2 sm:flex-row sm:max-w-xl">
              <input
                id="admin-search-products"
                type="search"
                placeholder="Buscar por nombre o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-scn-border bg-scn-bg-card text-xs placeholder-scn-text-secondary"
              />
              <select
                aria-label="Filtrar por categoría"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-scn-border bg-scn-bg-card text-xs font-semibold text-scn-text-title sm:w-48"
              >
                <option value="">Todas las categorías</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
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

          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filtrar por estado">
            {statusChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                aria-pressed={statusFilter === chip.key}
                onClick={() => setStatusFilter(chip.key)}
                className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === chip.key
                    ? 'bg-scn-primary text-white'
                    : 'border border-scn-border bg-scn-bg-card text-scn-text-normal hover:text-scn-text-title'
                }`}
              >
                {chip.label}
                <span className={`tabular-nums ${statusFilter === chip.key ? 'text-white/80' : 'text-scn-text-secondary'}`}>
                  {statusCounts[chip.key]}
                </span>
              </button>
            ))}
          </div>

          {/* Celular: tarjetas */}
          <ul className="space-y-3 md:hidden">
            {filteredProducts.length === 0 ? (
              <li className="rounded-2xl border border-scn-border bg-scn-bg-card p-8 text-center text-xs text-scn-text-secondary">
                No hay productos con estos filtros.
              </li>
            ) : (
              filteredProducts.map((prod) => {
                const cover = prod.images.find((img) => img.is_cover)?.storage_path || prod.images[0]?.storage_path;
                return (
                  <li key={prod.id} className={`rounded-2xl border border-scn-border bg-scn-bg-card p-3 ${prod.is_active ? '' : 'opacity-70'}`}>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(prod)}
                        className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-scn-border bg-scn-bg-section cursor-pointer"
                        aria-label={`Editar ${prod.name}`}
                      >
                        {cover ? (
                          <CatalogImage src={cover} width={160} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-scn-text-secondary"><ImageOff size={18} /></span>
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <button type="button" onClick={() => handleStartEdit(prod)} className="block w-full text-left cursor-pointer">
                          <span className="line-clamp-2 text-sm font-bold leading-snug text-scn-text-title">{prod.name}</span>
                        </button>
                        <p className="mt-0.5 truncate text-4xs text-scn-text-secondary">
                          {prod.category?.name || 'Sin categoría'} · Stock {prod.stock}
                        </p>
                        <p className="mt-1 font-mono text-sm font-bold text-scn-primary">{formatPrice(prod.price)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-scn-border/60 pt-3">
                      <button
                        type="button"
                        onClick={() => handleToggleBoolean(prod, 'is_active')}
                        className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold cursor-pointer ${
                          prod.is_active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        {prod.is_active ? <Eye size={13} /> : <EyeOff size={13} />}
                        {prod.is_active ? 'Activo' : 'Pausado'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleBoolean(prod, 'is_featured')}
                        aria-pressed={prod.is_featured}
                        className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold cursor-pointer ${
                          prod.is_featured ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-scn-bg-section text-scn-text-secondary'
                        }`}
                      >
                        <Star size={13} className={prod.is_featured ? 'fill-current' : ''} /> Destacado
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleBoolean(prod, 'is_push')}
                        aria-pressed={!!prod.is_push}
                        className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold cursor-pointer ${
                          prod.is_push ? 'bg-scn-primary/15 text-scn-primary' : 'bg-scn-bg-section text-scn-text-secondary'
                        }`}
                      >
                        <Zap size={13} className={prod.is_push ? 'fill-current' : ''} /> Hoy
                      </button>
                      <div className="ml-auto flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(prod)}
                          aria-label={`Editar ${prod.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-scn-text-secondary hover:bg-scn-primary/10 hover:text-scn-primary cursor-pointer"
                        >
                          <FileEdit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                          aria-label={`Dar de baja ${prod.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-scn-text-secondary hover:bg-rose-500/10 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>

          {/* PC: tabla */}
          <div className="hidden overflow-hidden rounded-2xl border border-scn-border bg-scn-bg-card shadow-sm transition-colors md:block">
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
                    <th className="p-4 text-center">Empuje</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-scn-border text-xs">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-scn-text-secondary italic">
                        No hay productos con estos filtros.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((prod) => {
                      const cover = prod.images.find(img => img.is_cover)?.storage_path || prod.images[0]?.storage_path;
                      return (
                        <tr key={prod.id} className="hover:bg-scn-bg-section/20 transition-colors">


                          <td className="p-4">
                            <div className="h-10 w-10 rounded-lg overflow-hidden border border-scn-border bg-scn-bg-section shrink-0">
                              {cover ? (
                                <CatalogImage src={cover} width={160} alt={prod.name} className="h-full w-full object-cover" />
                              ) : null}
                            </div>
                          </td>


                          <td className="p-4 font-medium">
                            <div className="flex flex-col">
                              <span className="text-scn-text-title font-bold text-xs">{prod.name}</span>
                              <span className="text-4xs text-scn-text-secondary font-mono">SKU: {prod.sku || 'N/D'}</span>
                            </div>
                          </td>


                          <td className="p-4 text-scn-text-normal font-semibold">
                            {prod.category?.name || 'Sin categoría'}
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

                          <td className="p-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleBoolean(prod, 'is_push')}
                              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-4xs font-bold cursor-pointer transition-all ${
                                prod.is_push
                                  ? 'bg-scn-primary/15 text-scn-primary hover:bg-scn-primary/20'
                                  : 'bg-scn-bg-section text-scn-text-secondary hover:bg-scn-primary/10 hover:text-scn-primary'
                              }`}
                              title="Producto de empuje en el hero"
                            >
                              <Zap size={10} className={prod.is_push ? 'fill-scn-primary text-scn-primary' : ''} />
                              <span>{prod.is_push ? 'Hero' : 'No'}</span>
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


      {activeTab === 'categories' && (
        <div id="admin-categories-tab" className="mx-auto max-w-2xl space-y-4">
          <form onSubmit={handleCategoryTabCreate} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              placeholder="Nueva categoría (ej. Parlantes)"
              value={catTabNewName}
              onChange={(e) => setCatTabNewName(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-scn-border bg-scn-bg-card text-xs"
            />
            <button
              type="submit"
              disabled={!catTabNewName.trim()}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-scn-primary px-5 text-xs font-bold text-white hover:bg-scn-hover disabled:opacity-50 cursor-pointer"
            >
              <Plus size={15} /> Crear categoría
            </button>
          </form>

          <ul className="divide-y divide-scn-border overflow-hidden rounded-2xl border border-scn-border bg-scn-bg-card">
            {categories.length === 0 ? (
              <li className="p-8 text-center text-xs text-scn-text-secondary">Todavía no hay categorías.</li>
            ) : (
              categories.map((cat) => {
                const count = productCountByCategory.get(cat.id) || 0;
                const isRenaming = renamingCatId === cat.id;
                return (
                  <li key={cat.id} className="flex items-center gap-3 p-3 sm:p-4">
                    {isRenaming ? (
                      <form
                        className="flex flex-1 items-center gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void handleRenameCategory(cat.id);
                        }}
                      >
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          aria-label="Nuevo nombre"
                          className="min-w-0 flex-1 px-3 py-2 rounded-lg border border-scn-border bg-scn-bg-section text-xs"
                        />
                        <button type="submit" aria-label="Guardar nombre" className="flex h-9 w-9 items-center justify-center rounded-lg bg-scn-primary text-white cursor-pointer">
                          <Check size={16} />
                        </button>
                        <button type="button" onClick={() => setRenamingCatId(null)} aria-label="Cancelar" className="flex h-9 w-9 items-center justify-center rounded-lg border border-scn-border text-scn-text-secondary cursor-pointer">
                          <X size={16} />
                        </button>
                      </form>
                    ) : (
                      <>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-scn-text-title">{cat.name}</p>
                          <p className="text-4xs text-scn-text-secondary">
                            {count === 0 ? 'Sin productos' : `${count} producto${count === 1 ? '' : 's'}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingCatId(cat.id);
                            setRenameValue(cat.name);
                          }}
                          aria-label={`Renombrar ${cat.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-scn-text-secondary hover:bg-scn-primary/10 hover:text-scn-primary cursor-pointer"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          disabled={count > 0}
                          title={count > 0 ? 'Mové sus productos a otra categoría antes de borrarla' : 'Borrar'}
                          aria-label={`Borrar ${cat.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-scn-text-secondary hover:bg-rose-500/10 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-scn-text-secondary cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </li>
                );
              })
            )}
          </ul>
          <p className="text-4xs text-scn-text-secondary">
            Solo se pueden borrar categorías vacías. Renombrar no cambia los links de los productos.
          </p>
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
                Configuración guardada.
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
                  placeholder="tu-correo@gmail.com"
                  value={settingsEmail}
                  onChange={(e) => setSettingsEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-scn-border bg-scn-bg-section text-xs"
                />
              </div>

            </div>

            <div className="space-y-4 border-t border-scn-border pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-scn-text-title">Texto del inicio</h3>

              <div className="space-y-1">
                <label className="text-3xs font-bold uppercase tracking-wider text-scn-text-title">Frase debajo de “SEAMOS COMO NIÑOS”</label>
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
                Al guardar, el sitio usa estos datos en el inicio, el pie de página y los botones de WhatsApp. Los visitantes pueden tardar hasta 1 minuto en verlo.
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

      {toastNode}
    </div>
  );
}
