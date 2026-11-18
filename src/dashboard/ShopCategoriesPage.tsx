import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Loader2 } from 'lucide-react';
import { useDashboard } from './DashboardContext';
import {
  getShopCategories,
  saveShopCategory,
  deleteShopCategory,
} from '../services/tenantService';
import { Category } from '../types';
import { FALLBACK_PRODUCT_IMAGE } from '../data/seedData';
import { ImageUploader } from '../components/common/ImageUploader';

export const ShopCategoriesPage: React.FC = () => {
  const { shopId, isReadOnly } = useDashboard();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const [saving, setSaving] = useState(false);

  const loadCats = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      setCategories(await getShopCategories(shopId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCats();
  }, [shopId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || isReadOnly) return;
    setSaving(true);
    try {
      await saveShopCategory(shopId, editing);
      setEditing(null);
      await loadCats();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Categories Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Organize storefront navigation and collections.</p>
        </div>
        {!isReadOnly && (
          <button
            type="button"
            onClick={() => setEditing({ name: '', description: '', imageUrl: '', order: categories.length + 1 })}
            className="px-4 py-2.5 bg-[#065F46] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 self-start"
          >
            <Plus className="w-4 h-4" /> Add Category
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-16 flex justify-center text-xs text-slate-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#065F46]" /> Loading categories...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={cat.imageUrl || FALLBACK_PRODUCT_IMAGE}
                  alt={cat.name}
                  className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{cat.name}</p>
                  <p className="text-[11px] font-mono text-slate-400 truncate">/{cat.slug}</p>
                </div>
              </div>
              {!isReadOnly && (
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditing(cat)}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteShopCategory(shopId, cat.id).then(loadCats)}
                    className="p-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">
              {editing.id ? 'Edit Category' : 'Add Category'}
            </h3>
            <div className="space-y-3 text-xs">
              <input
                type="text"
                required
                value={editing.name || ''}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Category Name"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
              <input
                type="text"
                value={editing.description || ''}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                placeholder="Short description"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
              <ImageUploader
                shopId={shopId}
                folder="categories"
                images={editing.imageUrl ? [editing.imageUrl] : []}
                onChange={(imgs) => setEditing({ ...editing, imageUrl: imgs[0] || '' })}
                label="Category Thumbnail"
                allowDataUrlFallback
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-[#065F46] text-white rounded-lg text-xs font-bold">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
