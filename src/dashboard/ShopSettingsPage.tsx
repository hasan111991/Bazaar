import React, { useEffect, useState } from 'react';
import { Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { useDashboard } from './DashboardContext';
import { updateShopSettings } from '../services/tenantService';
import { StoreSettings } from '../types';

export const ShopSettingsPage: React.FC = () => {
  const { shopId, settings, refreshDashboard, isReadOnly } = useDashboard();
  const [form, setForm] = useState<StoreSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setSaving(true);
    setSaved(false);
    setErrorMsg(null);
    try {
      await updateShopSettings(shopId, {
        contactPhone: form.contactPhone,
        whatsappNumber: form.whatsappNumber,
        contactEmail: form.contactEmail,
        address: form.address,
        city: form.city,
        shippingFee: Number(form.shippingFee) || 0,
        freeShippingThreshold: Number(form.freeShippingThreshold) || 0,
        codEnabled: form.codEnabled !== false,
        easypaisaDetails: form.easypaisaDetails,
        jazzcashDetails: form.jazzcashDetails,
        bankDetails: {
          ...form.bankDetails,
          enabled: form.bankDetails?.enabled !== false,
        },
        selfPickupDetails: form.selfPickupDetails,
      });
      await refreshDashboard();
      setSaved(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not save store settings. Please try again.');
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
            Configure COD, EasyPaisa, JazzCash, Bank Transfer IBFT, shipping charges, and Store Self-Pickup outlet details.
          </p>
        </div>
        {!isReadOnly && (
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-[#065F46] hover:bg-emerald-900 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 self-start"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        )}
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> Store settings saved cleanly to your tenant workspace.
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
        </div>
      )}

      {/* Contact & Shipping */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="sm:col-span-2 lg:col-span-3 font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
          Contact Details &amp; Nationwide Shipping Rates
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
          <label className="block font-semibold text-slate-700 mb-1">Store City</label>
          <input
            type="text"
            value={form.city || ''}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="Karachi / Lahore / Islamabad"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block font-semibold text-slate-700 mb-1">Store Street Address</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
        </div>
      </div>

      {/* COD Global Switch */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">Cash on Delivery (COD)</h3>
          <p className="text-[11px] text-slate-500">
            Allow customers to pay cash on delivery to courier riders across Pakistan.
          </p>
        </div>
        <label className="flex items-center gap-2 font-bold cursor-pointer">
          <input
            type="checkbox"
            checked={form.codEnabled !== false}
            onChange={(e) => setForm({ ...form, codEnabled: e.target.checked })}
          />
          Enable COD
        </label>
      </div>

      {/* EasyPaisa, JazzCash & Bank */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">EasyPaisa Wallet</h3>
            <label className="flex items-center gap-1.5 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={form.easypaisaDetails.enabled}
                onChange={(e) =>
                  setForm({ ...form, easypaisaDetails: { ...form.easypaisaDetails, enabled: e.target.checked } })
                }
              />
              Enabled
            </label>
          </div>
          <input
            type="text"
            value={form.easypaisaDetails.accountTitle}
            onChange={(e) =>
              setForm({ ...form, easypaisaDetails: { ...form.easypaisaDetails, accountTitle: e.target.value } })
            }
            placeholder="Account Title"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
          <input
            type="text"
            value={form.easypaisaDetails.accountNumber}
            onChange={(e) =>
              setForm({ ...form, easypaisaDetails: { ...form.easypaisaDetails, accountNumber: e.target.value } })
            }
            placeholder="0345 1234567"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
          <textarea
            rows={2}
            value={form.easypaisaDetails.instructions || ''}
            onChange={(e) =>
              setForm({ ...form, easypaisaDetails: { ...form.easypaisaDetails, instructions: e.target.value } })
            }
            placeholder="Checkout instructions"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">JazzCash Wallet</h3>
            <label className="flex items-center gap-1.5 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={form.jazzcashDetails.enabled}
                onChange={(e) =>
                  setForm({ ...form, jazzcashDetails: { ...form.jazzcashDetails, enabled: e.target.checked } })
                }
              />
              Enabled
            </label>
          </div>
          <input
            type="text"
            value={form.jazzcashDetails.accountTitle}
            onChange={(e) =>
              setForm({ ...form, jazzcashDetails: { ...form.jazzcashDetails, accountTitle: e.target.value } })
            }
            placeholder="Account Title"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
          <input
            type="text"
            value={form.jazzcashDetails.accountNumber}
            onChange={(e) =>
              setForm({ ...form, jazzcashDetails: { ...form.jazzcashDetails, accountNumber: e.target.value } })
            }
            placeholder="0300 1234567"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
          <textarea
            rows={2}
            value={form.jazzcashDetails.instructions || ''}
            onChange={(e) =>
              setForm({ ...form, jazzcashDetails: { ...form.jazzcashDetails, instructions: e.target.value } })
            }
            placeholder="Checkout instructions"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">Bank Transfer / IBFT</h3>
            <label className="flex items-center gap-1.5 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={form.bankDetails.enabled !== false}
                onChange={(e) =>
                  setForm({ ...form, bankDetails: { ...form.bankDetails, enabled: e.target.checked } })
                }
              />
              Enabled
            </label>
          </div>
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
            onChange={(e) =>
              setForm({ ...form, bankDetails: { ...form.bankDetails, accountTitle: e.target.value } })
            }
            placeholder="Account Title"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
          <input
            type="text"
            value={form.bankDetails.accountNumber}
            onChange={(e) =>
              setForm({ ...form, bankDetails: { ...form.bankDetails, accountNumber: e.target.value } })
            }
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
            <p className="text-[11px] text-slate-500">
              Allow local customers to pick up parcels in person with zero courier charges.
            </p>
          </div>
          <label className="flex items-center gap-2 font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={form.selfPickupDetails.enabled}
              onChange={(e) =>
                setForm({ ...form, selfPickupDetails: { ...form.selfPickupDetails, enabled: e.target.checked } })
              }
            />
            Enable Self-Pickup
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={form.selfPickupDetails.title}
            onChange={(e) =>
              setForm({ ...form, selfPickupDetails: { ...form.selfPickupDetails, title: e.target.value } })
            }
            placeholder="Outlet Name"
            className="px-3 py-2 border border-slate-200 rounded-lg"
          />
          <input
            type="text"
            value={form.selfPickupDetails.city}
            onChange={(e) =>
              setForm({ ...form, selfPickupDetails: { ...form.selfPickupDetails, city: e.target.value } })
            }
            placeholder="City"
            className="px-3 py-2 border border-slate-200 rounded-lg"
          />
          <input
            type="text"
            value={form.selfPickupDetails.address}
            onChange={(e) =>
              setForm({ ...form, selfPickupDetails: { ...form.selfPickupDetails, address: e.target.value } })
            }
            placeholder="Street Address"
            className="px-3 py-2 border border-slate-200 rounded-lg"
          />
          <input
            type="text"
            value={form.selfPickupDetails.timings}
            onChange={(e) =>
              setForm({ ...form, selfPickupDetails: { ...form.selfPickupDetails, timings: e.target.value } })
            }
            placeholder="Opening Hours"
            className="px-3 py-2 border border-slate-200 rounded-lg"
          />
          <input
            type="text"
            value={form.selfPickupDetails.contactPhone}
            onChange={(e) =>
              setForm({ ...form, selfPickupDetails: { ...form.selfPickupDetails, contactPhone: e.target.value } })
            }
            placeholder="Pickup Desk Phone Number"
            className="px-3 py-2 border border-slate-200 rounded-lg"
          />
          <input
            type="text"
            value={form.selfPickupDetails.instructions || ''}
            onChange={(e) =>
              setForm({ ...form, selfPickupDetails: { ...form.selfPickupDetails, instructions: e.target.value } })
            }
            placeholder="Customer Pickup Instructions"
            className="px-3 py-2 border border-slate-200 rounded-lg"
          />
        </div>
      </div>
    </form>
  );
};
