import React, { useState, useEffect } from 'react';
import { Save, Building, Truck, Phone, Smartphone, Store } from 'lucide-react';
import { getStoreSettings, updateStoreSettings } from '../services/storeService';
import { StoreSettings } from '../types';
import { INITIAL_SETTINGS, PAKISTAN_CITIES } from '../data/seedData';
import { useToast } from '../components/common/Toast';
import { useCart } from '../context/CartContext';

export const AdminSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<StoreSettings>(INITIAL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const { refreshSettings } = useCart();

  useEffect(() => {
    getStoreSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateStoreSettings(settings);
      await refreshSettings();
      showToast('Store settings, EasyPaisa, JazzCash & Bank details saved!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Website Settings</h1>
        <p className="text-xs text-slate-500">
          Configure branding, announcement bar, delivery fees, EasyPaisa, JazzCash, and Pakistani bank details
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Brand & Store Identity */}
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-800" /> Store Identity & Announcement
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Store Brand Name *
              </label>
              <input
                type="text"
                required
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Currency Symbol
              </label>
              <input
                type="text"
                value={settings.currencySymbol}
                onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Top Announcement Bar Message
              </label>
              <input
                type="text"
                value={settings.announcement}
                onChange={(e) => setSettings({ ...settings, announcement: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Shipping Rates */}
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-800" /> Shipping & Delivery Charges (PKR)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Standard Shipping Charge (Rs.)
              </label>
              <input
                type="number"
                min={0}
                value={settings.shippingFee}
                onChange={(e) =>
                  setSettings({ ...settings, shippingFee: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Standard courier fee across Pakistan for orders below free shipping threshold.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Free Delivery Threshold (Rs.)
              </label>
              <input
                type="number"
                min={0}
                value={settings.freeShippingThreshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    freeShippingThreshold: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Orders equal or exceeding this total qualify for free shipping.
              </span>
            </div>
          </div>
        </div>

        {/* Self-Pickup Service Settings */}
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-emerald-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-emerald-900 flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-700" /> Self-Pickup Service & Store Outlet
            </h3>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.selfPickupDetails.enabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    selfPickupDetails: {
                      ...settings.selfPickupDetails,
                      enabled: e.target.checked,
                    },
                  })
                }
                className="rounded text-emerald-700"
              />
              Enabled at Checkout
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Outlet / Counter Name
              </label>
              <input
                type="text"
                value={settings.selfPickupDetails.title}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    selfPickupDetails: { ...settings.selfPickupDetails, title: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Outlet City
              </label>
              <select
                value={settings.selfPickupDetails.city}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    selfPickupDetails: { ...settings.selfPickupDetails, city: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
              >
                {PAKISTAN_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Complete Pickup Outlet Address
              </label>
              <input
                type="text"
                value={settings.selfPickupDetails.address}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    selfPickupDetails: { ...settings.selfPickupDetails, address: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pickup Timings / Working Hours
              </label>
              <input
                type="text"
                value={settings.selfPickupDetails.timings}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    selfPickupDetails: { ...settings.selfPickupDetails, timings: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Outlet Desk Contact Phone
              </label>
              <input
                type="text"
                value={settings.selfPickupDetails.contactPhone}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    selfPickupDetails: {
                      ...settings.selfPickupDetails,
                      contactPhone: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Pickup Instructions
              </label>
              <textarea
                rows={2}
                value={settings.selfPickupDetails.instructions || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    selfPickupDetails: {
                      ...settings.selfPickupDetails,
                      instructions: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>
          </div>
        </div>

        {/* EasyPaisa & JazzCash Mobile Wallets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* EasyPaisa */}
          <div className="bg-white p-4 sm:p-6 rounded-3xl border border-emerald-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-[#00A859] flex items-center gap-2">
                <Smartphone className="w-4 h-4" /> EasyPaisa Wallet
              </h3>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.easypaisaDetails.enabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      easypaisaDetails: {
                        ...settings.easypaisaDetails,
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="rounded text-emerald-700"
                />
                Enabled
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Title
                </label>
                <input
                  type="text"
                  value={settings.easypaisaDetails.accountTitle}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      easypaisaDetails: {
                        ...settings.easypaisaDetails,
                        accountTitle: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  EasyPaisa Mobile Account #
                </label>
                <input
                  type="text"
                  value={settings.easypaisaDetails.accountNumber}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      easypaisaDetails: {
                        ...settings.easypaisaDetails,
                        accountNumber: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Checkout Instructions
                </label>
                <textarea
                  rows={2}
                  value={settings.easypaisaDetails.instructions || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      easypaisaDetails: {
                        ...settings.easypaisaDetails,
                        instructions: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>
            </div>
          </div>

          {/* JazzCash */}
          <div className="bg-white p-4 sm:p-6 rounded-3xl border border-rose-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-rose-700 flex items-center gap-2">
                <Smartphone className="w-4 h-4" /> JazzCash Wallet
              </h3>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.jazzcashDetails.enabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      jazzcashDetails: {
                        ...settings.jazzcashDetails,
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="rounded text-rose-700"
                />
                Enabled
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Title
                </label>
                <input
                  type="text"
                  value={settings.jazzcashDetails.accountTitle}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      jazzcashDetails: {
                        ...settings.jazzcashDetails,
                        accountTitle: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  JazzCash Mobile Account #
                </label>
                <input
                  type="text"
                  value={settings.jazzcashDetails.accountNumber}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      jazzcashDetails: {
                        ...settings.jazzcashDetails,
                        accountNumber: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Checkout Instructions
                </label>
                <textarea
                  rows={2}
                  value={settings.jazzcashDetails.instructions || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      jazzcashDetails: {
                        ...settings.jazzcashDetails,
                        instructions: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bank Transfer Information */}
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-800" /> Official Pakistani Bank Account Details
          </h3>
          <p className="text-xs text-slate-500">
            Displayed to customers selecting Bank Transfer / IBFT payment during checkout.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
              <input
                type="text"
                value={settings.bankDetails.bankName}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    bankDetails: { ...settings.bankDetails, bankName: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Title
              </label>
              <input
                type="text"
                value={settings.bankDetails.accountTitle}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    bankDetails: { ...settings.bankDetails, accountTitle: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Number
              </label>
              <input
                type="text"
                value={settings.bankDetails.accountNumber}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    bankDetails: { ...settings.bankDetails, accountNumber: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                IBAN Number
              </label>
              <input
                type="text"
                value={settings.bankDetails.iban}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    bankDetails: { ...settings.bankDetails, iban: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Contact & Support */}
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-800" /> Customer Support Contacts
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hotline Phone Number
              </label>
              <input
                type="text"
                value={settings.contactPhone}
                onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp Support Number
              </label>
              <input
                type="text"
                value={settings.whatsappNumber}
                onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Support Email
              </label>
              <input
                type="email"
                value={settings.contactEmail}
                onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Warehouse / Office Address
              </label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto py-3 px-6 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
