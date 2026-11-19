import React, { useEffect, useState } from 'react';
import { Plus, Truck, Loader2, X, Banknote } from 'lucide-react';
import { useDashboard } from './DashboardContext';
import {
  getShopSuppliers,
  saveShopSupplier,
  recordSupplierPayment,
} from '../services/retailService';
import { Supplier } from '../types';
import { formatPKR } from '../data/seedData';
import { PlanFeatureGate } from '../components/common/PlanFeatureGate';

export const ShopSuppliersPage: React.FC = () => {
  const { shopId, isReadOnly } = useDashboard();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Supplier> | null>(null);
  const [paySupplier, setPaySupplier] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSuppliers = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      setSuppliers(await getShopSuppliers(shopId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [shopId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || isReadOnly) return;
    setSaving(true);
    try {
      await saveShopSupplier(shopId, editing);
      setEditing(null);
      await loadSuppliers();
    } finally {
      setSaving(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySupplier || isReadOnly) return;
    setSaving(true);
    try {
      await recordSupplierPayment(shopId, paySupplier.id, Number(payAmount), payNotes.trim());
      setPaySupplier(null);
      setPayAmount('');
      setPayNotes('');
      await loadSuppliers();
    } finally {
      setSaving(false);
    }
  };

  const totalPayables = suppliers.reduce(
    (s, sup) => s + Math.max(0, Number(sup.currentPayableBalance || 0)),
    0
  );

  return (
    <PlanFeatureGate feature="suppliersPurchases">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#065F46]" /> Suppliers &amp; Wholesalers
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Total Supplier Payables Due: <strong className="text-rose-700">{formatPKR(totalPayables)}</strong>
            </p>
          </div>
          {!isReadOnly && (
            <button
              type="button"
              onClick={() =>
                setEditing({ name: '', phone: '', email: '', address: '', openingBalance: 0 })
              }
              className="px-4 py-2.5 bg-[#065F46] hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 self-start"
            >
              <Plus className="w-4 h-4" /> Add Supplier
            </button>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-16 flex justify-center text-xs text-slate-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#065F46]" /> Loading suppliers...
            </div>
          ) : suppliers.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              No wholesalers added yet. Add a supplier before recording purchase bills.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                    <th className="py-3 px-4">Supplier Name</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4 text-right">Payable Balance</th>
                    {!isReadOnly && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suppliers.map((s) => (
                    <tr key={s.id}>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{s.name}</p>
                        {s.address && <p className="text-[11px] text-slate-500">{s.address}</p>}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-mono text-slate-700">{s.phone}</p>
                        {s.email && <p className="text-[11px] text-slate-500">{s.email}</p>}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold tabular-nums">
                        <span className={s.currentPayableBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                          {formatPKR(s.currentPayableBalance)}
                        </span>
                      </td>
                      {!isReadOnly && (
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditing(s)}
                              className="px-2.5 py-1 border border-slate-200 rounded-lg font-semibold hover:bg-slate-50"
                            >
                              Edit
                            </button>
                            {s.currentPayableBalance > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPaySupplier(s);
                                  setPayAmount(String(s.currentPayableBalance));
                                }}
                                className="px-2.5 py-1 bg-[#065F46] text-white rounded-lg font-bold flex items-center gap-1"
                              >
                                <Banknote className="w-3 h-3" /> Pay
                              </button>
                            )}
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

        {editing && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
            <form
              onSubmit={handleSave}
              className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-900">
                  {editing.id ? 'Edit Supplier' : 'Add Supplier'}
                </h3>
                <button type="button" onClick={() => setEditing(null)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Supplier / Company Name *</label>
                <input
                  type="text"
                  required
                  value={editing.name || ''}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  required
                  value={editing.phone || ''}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address / Market</label>
                <input
                  type="text"
                  value={editing.address || ''}
                  onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              {!editing.id && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Opening Payable Balance (PKR)</label>
                  <input
                    type="number"
                    min={0}
                    value={editing.openingBalance ?? 0}
                    onChange={(e) =>
                      setEditing({ ...editing, openingBalance: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#065F46] text-white rounded-lg font-bold"
                >
                  {saving ? 'Saving...' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        )}

        {paySupplier && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
            <form
              onSubmit={handlePayment}
              className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-900">
                  Pay {paySupplier.name}
                </h3>
                <button type="button" onClick={() => setPaySupplier(null)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <p className="text-slate-600">
                Current Payable Balance: <strong className="text-rose-700">{formatPKR(paySupplier.currentPayableBalance)}</strong>
              </p>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount Paid (PKR) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={paySupplier.currentPayableBalance}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Reference / Method</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Cash / Meezan IBFT"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaySupplier(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#065F46] text-white rounded-lg font-bold"
                >
                  {saving ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </PlanFeatureGate>
  );
};
