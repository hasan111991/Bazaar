import React, { useEffect, useState } from 'react';
import { Save, CheckCircle2 } from 'lucide-react';
import { useDashboard } from './DashboardContext';
import { updateShopSettings } from '../services/tenantService';
import { StoreSettings } from '../types';

export const ShopSettingsPage: React.FC = () => {
  const { shopId, settings, refreshDashboard, isReadOnly } = useDashboard();
  const [form, setForm] = useState<StoreSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateShopSettings(shopId, form);
      await refreshDashboard();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Payment, Delivery &amp; Self-Pickup</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure EasyPaisa, JazzCash, Bank Transfer IBFT, shipping charges, and Store Self-Pickup outlet details.
          </p>
        </div>
        {!isReadOnly && (
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-[#065F46] hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 self-start"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        )}
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 font-semibold">
          <CheckCircle2 className="w-4 h-4" /> Store settings saved cleanly to your tenant workspace.
        </div>
      )}

      {/* Contact & Shipping */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="sm:col-span-2 lg:col-span-3 font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
          Contact &amp; Nationwide Shipping Rates
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
          <input
            type="text"
            value={form.contactPhone}
            onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">WhatsApp Order Support Number</label>
          <input
            type="text"
            value={form.whatsappNumber}
            onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Support Email</label>
          <input
            type="email"
            value={form.contactEmail}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Standard Delivery Fee (PKR)</label>
          <input
            type="number"
            min={0}
            value={form.shippingFee}
            onChange={(e) => setForm({ ...form, shippingFee: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Free Shipping Threshold (PKR)</label>
          <input
            type="number"
            min={0}
            value={form.freeShippingThreshold}
            onChange={(e) => setForm({ ...form, freeShippingThreshold: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Store Address</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
        </div>
      </div>

      {/* EasyPaisa, JazzCash & Bank */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">EasyPaisa Wallet</h3>
            <input
              type="checkbox"
              checked={form.easypaisaDetails.enabled}
              onChange={(e) => setForm({ ...form, easypaisaDetails: { ...form.easypaisaDetails, enabled: e.target.checked } })}
            />
          </div>
          <input
            type="text"
            value={form.easypaisaDetails.accountTitle}
            onChange={(e) => setForm({ ...form, easypaisaDetails: { ...form.easypaisaDetails, accountTitle: e.target.value } })}
            placeholder="Account Title"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
          <input
            type="text"
            value={form.easypaisaDetails.accountNumber}
            onChange={(e) => setForm({ ...form, easypaisaDetails: { ...form.easypaisaDetails, accountNumber: e.target.value } })}
            placeholder="0345 1234567"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
          <textarea
            rows={2}
            value={form.easypaisaDetails.instructions || ''}
            onChange={(e) => setForm({ ...form, easypaisaDetails: { ...form.easypaisaDetails, instructions: e.target.value } })}
            placeholder="Checkout instructions"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">JazzCash Wallet</h3>
            <input
              type="checkbox"
              checked={form.jazzcashDetails.enabled}
              onChange={(e) => setForm({ ...form, jazzcashDetails: { ...form.jazzcashDetails, enabled: e.target.checked } })}
            />
          </div>
          <input
            type="text"
            value={form.jazzcashDetails.accountTitle}
            onChange={(e) => setForm({ ...form, jazzcashDetails: { ...form.jazzcashDetails, accountTitle: e.target.value } })}
            placeholder="Account Title"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
          <input
            type="text"
            value={form.jazzcashDetails.accountNumber}
            onChange={(e) => setForm({ ...form, jazzcashDetails: { ...form.jazzcashDetails, accountNumber: e.target.value } })}
            placeholder="0300 1234567"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
          <textarea
            rows={2}
            value={form.jazzcashDetails.instructions || ''}
            onChange={(e) => setForm({ ...form, jazzcashDetails: { ...form.jazzcashDetails, instructions: e.target.value } })}
            placeholder="Checkout instructions"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900">Bank Transfer / IBFT</h3>
          <input
            type="text"
            value={form.bankDetails.bankName}
            onChange={(e) => setForm({ ...form, bankDetails: { ...form.bankDetails, bankName: e.target.value } })}
            placeholder="Bank Name"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
          <input
            type="text"
            value={form.bankDetails.accountTitle}
            onChange={(e) => setForm({ ...form, bankDetails: { ...form.bankDetails, accountTitle: e.target.value } })}
            placeholder="Account Title"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
          <input
            type="text"
            value={form.bankDetails.accountNumber}
            onChange={(e) => setForm({ ...form, bankDetails: { ...form.bankDetails, accountNumber: e.target.value } })}
            placeholder="Account Number"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
          />
          <input
            type="text"
            value={form.bankDetails.iban}
            onChange={(e) => setForm({ ...form, bankDetails: { ...form.bankDetails, iban: e.target.value } })}
            placeholder="PK.. IBAN"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
          />
        </div>
      </div>

      {/* Self-Pickup Service */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Self-Pickup Outlet Service</h3>
            <p className="text-[11px] text-slate-500">Allow local customers to pick up parcels in person with zero courier charges.</p>
          </div>
          <label className="flex items-center gap-2 font-bold">
            <input
              type="checkbox"
              checked={form.selfPickupDetails.enabled}
              onChange={(e) => setForm({ ...form, selfPickupDetails: { ...form.selfPickupDetails, enabled: e.target.checked } })}
            />
            Enable Self-Pickup
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={form.selfPickupDetails.title}
            onChange={(e) => setForm({ ...form, selfPickupDetails: { ...form.selfPickupDetails, title: e.target.value } })}
            placeholder="Outlet Name"
            className="px-3 py-2 border border-slate-200 rounded-lg"
          />
          <input
            type="text"
            value={form.selfPickupDetails.city}
            onChange={(e) => setForm({ ...form, selfPickupDetails: { ...form.selfPickupDetails, city: e.target.value } })}
            placeholder="City"
            className="px-3 py-2 border border-slate-200 rounded-lg"
          />
          <input
            type="text"
            value={form.selfPickupDetails.address}
            onChange={(e) => setForm({ ...form, selfPickupDetails: { ...form.selfPickupDetails, address: e.target.value } })}
            placeholder="Street Address"
            className="px-3 py-2 border border-slate-200 rounded-lg"
          />
          <input
            type="text"
            value={form.selfPickupDetails.timings}
            onChange={(e) => setForm({ ...form, selfPickupDetails: { ...form.selfPickupDetails, timings: e.target.value } })}
            placeholder="Opening Hours"
            className="px-3 py-2 border border-slate-200 rounded-lg"
          />
        </div>
      </div>
    </form>
  );
};
