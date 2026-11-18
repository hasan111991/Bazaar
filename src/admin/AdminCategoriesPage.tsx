import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { getCategories, saveCategory, deleteCategory } from '../services/storeService';
import { Category } from '../types';
import { useToast } from '../components/common/Toast';
import { FALLBACK_PRODUCT_IMAGE } from '../data/seedData';

export const AdminCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [order, setOrder] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getCategories();
      setCategories(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAdd = () => {
    setEditingCat(null);
    setName('');
    setSlug('');
    setDescription('');
    setImageUrl(FALLBACK_PRODUCT_IMAGE);
    setOrder(categories.length + 1);
    setIsModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCat(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setImageUrl(cat.imageUrl || '');
    setOrder(cat.order || 1);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, catName: string) => {
    if (!window.confirm(`Delete category "${catName}"?`)) return;
    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      showToast('Category deleted', 'info');
    } catch {
      showToast('Could not delete category', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await saveCategory({
        id: editingCat?.id,
        name: name.trim(),
        slug: slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        order: Number(order),
      });
      showToast(editingCat ? 'Category updated!' : 'Category created!', 'success');
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save category', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Category Management
          </h1>
          <p className="text-xs text-slate-500">
            Organize products into intuitive collections for shoppers
          </p>
        </div>

        <button
          onClick={openAdd}
          className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading categories...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="aspect-video w-full rounded-2xl overflow-hidden mb-3 bg-slate-50 border">
                  <img
                    src={cat.imageUrl || FALLBACK_PRODUCT_IMAGE}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
                    }}
                    alt={cat.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-sm text-slate-900 truncate">{cat.name}</h3>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono shrink-0">
                    Order: {cat.order}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{cat.description}</p>
                <span className="text-[10px] text-emerald-800 font-mono mt-1 block">/{cat.slug}</span>
              </div>

              <div className="pt-3 border-t border-slate-100 mt-4 flex justify-end gap-2">
                <button
                  onClick={() => openEdit(cat)}
                  className="p-1.5 text-slate-500 hover:text-emerald-800 hover:bg-slate-100 rounded-lg transition"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(cat.id, cat.name)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900">
                {editingCat ? 'Edit Category' : 'Create Category'}
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Handmade Footwear"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingCat) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Slug</label>
                <input
                  type="text"
                  placeholder="e.g. handmade-footwear"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Image URL</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border rounded-xl"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-900 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
