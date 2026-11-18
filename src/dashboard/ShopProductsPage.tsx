import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, X } from 'lucide-react';
import { useDashboard } from './DashboardContext';
import {
  getShopProductsAdmin,
  getShopCategories,
  saveShopProduct,
  deleteShopProduct,
} from '../services/tenantService';
import { Product, Category } from '../types';
import { formatPKR, FALLBACK_PRODUCT_IMAGE } from '../data/seedData';
import { ImageUploader } from '../components/common/ImageUploader';

export const ShopProductsPage: React.FC = () => {
  const { shopId, plan, isReadOnly } = useDashboard();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [saving, setSaving] = useState(false);

  const loadCatalog = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        getShopProductsAdmin(shopId),
        getShopCategories(shopId),
      ]);
      setProducts(prods);
      setCategories(cats);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, [shopId]);

  const filtered = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || isReadOnly) return;
    setSaving(true);
    setError(null);
    try {
      await saveShopProduct(shopId, editing);
      setEditing(null);
      await loadCatalog();
    } catch (err: any) {
      setError(err?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isReadOnly) return;
    if (!confirm('Delete this product from your catalog?')) return;
    await deleteShopProduct(shopId, id);
    await loadCatalog();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Products Management</h2>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            {products.length} of {plan.maxProducts} products used on your {plan.name} plan.
          </p>
        </div>

        {!isReadOnly && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setEditing({
                title: '',
                description: '',
                regularPrice: 0,
                salePrice: undefined,
                stock: 10,
                category: categories[0]?.slug || 'general',
                brand: '',
                sku: `SKU-${Date.now().toString().slice(-5)}`,
                images: [],
                isFeatured: false,
                isPublished: true,
              });
            }}
            className="px-4 py-2.5 bg-[#065F46] hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 self-start"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product title, SKU, or category..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#065F46] focus:outline-none"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center text-xs text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#065F46]" /> Loading catalog...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            No products found. Click &ldquo;Add Product&rdquo; to publish items to your storefront.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Price</th>
                  <th className="py-3 px-4 text-right">Stock</th>
                  <th className="py-3 px-4">Status</th>
                  {!isReadOnly && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.images?.[0] || FALLBACK_PRODUCT_IMAGE}
                          alt={p.title}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                        />
                        <div>
                          <p className="font-bold text-slate-900">{p.title}</p>
                          <p className="text-[11px] font-mono text-slate-400">{p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{p.category}</td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      <span className="font-bold text-slate-900">{formatPKR(p.salePrice ?? p.regularPrice)}</span>
                      {p.salePrice && (
                        <span className="block text-[10px] line-through text-slate-400">{formatPKR(p.regularPrice)}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold tabular-nums">
                      <span className={p.stock <= 5 ? 'text-red-600' : 'text-slate-900'}>{p.stock}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-bold text-[11px] uppercase ${p.isPublished ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {p.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    {!isReadOnly && (
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => { setError(null); setEditing(p); }}
                            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-100"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                {editing.id ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button type="button" onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">{error}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  value={editing.title || ''}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                <select
                  value={editing.category || ''}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                  {categories.length === 0 && <option value="general">General Store</option>}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Brand</label>
                <input
                  type="text"
                  value={editing.brand || ''}
                  onChange={(e) => setEditing({ ...editing, brand: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Regular Price (PKR) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editing.regularPrice || 0}
                  onChange={(e) => setEditing({ ...editing, regularPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sale Price (Optional)</label>
                <input
                  type="number"
                  min={0}
                  value={editing.salePrice || ''}
                  onChange={(e) => setEditing({ ...editing, salePrice: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Stock Quantity *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={editing.stock || 0}
                  onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">SKU</label>
                <input
                  type="text"
                  value={editing.sku || ''}
                  onChange={(e) => setEditing({ ...editing, sku: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <ImageUploader
              shopId={shopId}
              folder="products"
              subPath={editing.id || 'draft'}
              images={editing.images || []}
              onChange={(imgs) => setEditing({ ...editing, images: imgs })}
              multiple
              maxImages={6}
              label="Product Gallery Images (Firebase Storage)"
              allowDataUrlFallback
            />

            <div className="flex items-center gap-6 text-xs pt-2">
              <label className="flex items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  checked={editing.isPublished !== false}
                  onChange={(e) => setEditing({ ...editing, isPublished: e.target.checked })}
                />
                Published to Storefront
              </label>
              <label className="flex items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  checked={Boolean(editing.isFeatured)}
                  onChange={(e) => setEditing({ ...editing, isFeatured: e.target.checked })}
                />
                Featured on Homepage
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-[#065F46] text-white rounded-lg text-xs font-bold"
              >
                {saving ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
