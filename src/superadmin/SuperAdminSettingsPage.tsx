import React, { useEffect, useState } from 'react';
import { Save, Loader2, CheckCircle2 } from 'lucide-react';
import { getPlatformSettings, updatePlatformSettings } from '../services/platformService';
import { PlatformSettings } from '../types';
import { DEFAULT_PLATFORM_SETTINGS } from '../data/seedData';

export const SuperAdminSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const stg = await getPlatformSettings();
        setSettings(stg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedBanner(false);
    try {
      await updatePlatformSettings({
        ...settings,
        gracePeriodDays: Math.max(0, Number(settings.gracePeriodDays ?? 5)),
      });
      setSavedBanner(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex justify-center text-xs text-slate-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#065F46]" /> Loading platform configuration...
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Platform Settings &amp; Grace Period</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure SaaS branding, support contacts, renewal grace window, and receiving accounts.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-[#065F46] hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 self-start"
        >
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Platform Settings'}
        </button>
      </div>

      {savedBanner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Platform settings saved to Firestore.
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Platform Brand Name</label>
          <input
            type="text"
            required
            value={settings.platformName}
            onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Support Email</label>
          <input
            type="email"
            required
            value={settings.supportEmail}
            onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Support Phone</label>
          <input
            type="text"
            value={settings.supportPhone}
            onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">WhatsApp Number</label>
          <input
            type="text"
            value={settings.whatsappNumber}
            onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Subscription Renewal Grace Period (Days)</label>
          <input
            type="number"
            min={0}
            max={60}
            value={settings.gracePeriodDays ?? 5}
            onChange={(e) => setSettings({ ...settings, gracePeriodDays: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Paid shops remain operational during this grace window after expiry before reverting to read-only notice.
          </p>
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Platform Tagline</label>
          <input
            type="text"
            value={settings.tagline || ''}
            onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 text-xs">
        <h3 className="text-sm font-extrabold text-slate-900">SaaS Receiving Accounts</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-slate-200 rounded-xl space-y-2">
            <p className="font-bold text-slate-900">EasyPaisa</p>
            <input
              type="text"
              value={settings.easypaisaDetails.accountTitle}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  easypaisaDetails: { ...settings.easypaisaDetails, accountTitle: e.target.value },
                })
              }
              placeholder="Account Title"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
            <input
              type="text"
              value={settings.easypaisaDetails.accountNumber}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  easypaisaDetails: { ...settings.easypaisaDetails, accountNumber: e.target.value },
                })
              }
              placeholder="Account Number"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="p-4 border border-slate-200 rounded-xl space-y-2">
            <p className="font-bold text-slate-900">JazzCash</p>
            <input
              type="text"
              value={settings.jazzcashDetails.accountTitle}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  jazzcashDetails: { ...settings.jazzcashDetails, accountTitle: e.target.value },
                })
              }
              placeholder="Account Title"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
            <input
              type="text"
              value={settings.jazzcashDetails.accountNumber}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  jazzcashDetails: { ...settings.jazzcashDetails, accountNumber: e.target.value },
                })
              }
              placeholder="Account Number"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="p-4 border border-slate-200 rounded-xl space-y-2">
            <p className="font-bold text-slate-900">Bank Transfer (IBFT)</p>
            <input
              type="text"
              value={settings.bankDetails.bankName}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  bankDetails: { ...settings.bankDetails, bankName: e.target.value },
                })
              }
              placeholder="Bank Name"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
            <input
              type="text"
              value={settings.bankDetails.accountNumber}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  bankDetails: { ...settings.bankDetails, accountNumber: e.target.value },
                })
              }
              placeholder="Account Number"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
            <input
              type="text"
              value={settings.bankDetails.iban}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  bankDetails: { ...settings.bankDetails, iban: e.target.value },
                })
              }
              placeholder="IBAN"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
        </div>
      </div>
    </form>
  );
};
