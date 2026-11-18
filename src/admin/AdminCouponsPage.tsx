import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Edit } from 'lucide-react';
import { getCoupons, saveCoupon, deleteCoupon } from '../services/storeService';
import { Coupon } from '../types';
import { formatPKR } from '../data/seedData';
import { useToast } from '../components/common/Toast';

export const AdminCouponsPage: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // Form Fields
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minOrderValue, setMinOrderValue] = useState<number>(2000);
  const [expiryDate, setExpiryDate] = useState('2027-12-31');
  const [usageLimit, setUsageLimit] = useState<number>(500);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getCoupons();
      setCoupons(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAdd = () => {
    setEditingCoupon(null);
    setCode('');
    setDiscountType('percentage');
    setDiscountValue(10);
    setMinOrderValue(2500);
    setExpiryDate('2027-12-31');
    setUsageLimit(500);
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditingCoupon(c);
    setCode(c.code);
    setDiscountType(c.discountType);
    setDiscountValue(c.discountValue);
    setMinOrderValue(c.minOrderValue);
    setExpiryDate(c.expiryDate || '2027-12-31');
    setUsageLimit(c.usageLimit || 500);
    setIsActive(c.isActive);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, cCode: string) => {
    if (!window.confirm(`Delete coupon "${cCode}"?`)) return;
    try {
      await deleteCoupon(id);
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      showToast('Coupon deleted', 'info');
    } catch {
      showToast('Could not delete coupon', 'error');
    }
  };

  const handleToggleActive = async (c: Coupon) => {
    try {
      await saveCoupon({ ...c, isActive: !c.isActive });
      setCoupons((prev) =>
        prev.map((item) => (item.id === c.id ? { ...item, isActive: !item.isActive } : item))
      );
      showToast(`Coupon ${c.code} ${!c.isActive ? 'activated' : 'deactivated'}`, 'success');
    } catch {
      showToast('Could not toggle coupon state', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSubmitting(true);
    try {
      await saveCoupon({
        id: editingCoupon?.id,
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: Number(discountValue),
        minOrderValue: Number(minOrderValue),
        expiryDate,
        usageLimit: Number(usageLimit),
        usageCount: editingCoupon?.usageCount || 0,
        isActive,
      });
      showToast(editingCoupon ? 'Coupon updated!' : 'New coupon code created!', 'success');
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save coupon', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Coupon & Voucher Management</h1>
          <p className="text-xs text-slate-500">
            Create promotional discount codes and holiday vouchers for customers
          </p>
        </div>

        <button
          onClick={openAdd}
          className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create Coupon
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading coupons...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {coupons.map((c) => (
            <div
              key={c.id}
              className={`p-5 bg-white rounded-3xl border-2 transition shadow-xs flex flex-col justify-between ${
                c.isActive ? 'border-emerald-200' : 'border-slate-200 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <span className="font-mono font-black text-sm sm:text-base text-slate-900 bg-slate-100 px-3 py-1 rounded-xl tracking-wider truncate">
                    {c.code}
                  </span>
                  <button
                    onClick={() => handleToggleActive(c)}
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition shrink-0 ${
                      c.isActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {c.isActive ? 'Active' : 'Disabled'}
                  </button>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <p className="font-bold text-emerald-800 text-sm">
                    {c.discountType === 'percentage'
                      ? `${c.discountValue}% OFF`
                      : `${formatPKR(c.discountValue)} Fixed Discount`}
                  </p>
                  <p>Min Order Value: <strong>{formatPKR(c.minOrderValue)}</strong></p>
                  <p>Usage: <strong>{c.usageCount}</strong> / {c.usageLimit || '∞'} times</p>
                  <p className="text-[11px] text-slate-400">Expires: {c.expiryDate || 'No Expiry'}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 mt-4 flex justify-end gap-3">
                <button
                  onClick={() => openEdit(c)}
                  className="text-xs text-emerald-800 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(c.id, c.code)}
                  className="text-xs text-rose-600 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
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
                {editingCoupon ? `Edit Coupon (${editingCoupon.code})` : 'Create New Coupon'}
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EIDSPECIAL"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs border rounded-xl font-mono uppercase font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border rounded-xl bg-white"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed PKR Amount (Rs.)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Min Order Value (PKR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={minOrderValue}
                    onChange={(e) => setMinOrderValue(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Usage Limit</label>
                <input
                  type="number"
                  min={1}
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(Number(e.target.value))}
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
                  {submitting ? 'Saving...' : editingCoupon ? 'Save Changes' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
