import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Eye, Save, Loader2 } from 'lucide-react';
import {
  getAllPlatformPayments,
  approvePlatformPayment,
  rejectPlatformPayment,
  getPlatformSettings,
  updatePlatformSettings,
} from '../services/platformService';
import { PlatformPayment, PlatformSettings } from '../types';
import { formatPKR, DEFAULT_PLATFORM_SETTINGS } from '../data/seedData';

export const SuperAdminPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<PlatformPayment[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PlatformPayment | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pList, stg] = await Promise.all([getAllPlatformPayments(), getPlatformSettings()]);
      setPayments(pList);
      setSettings(stg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const visible = payments.filter((p) => (filter === 'all' ? true : p.status === filter));

  const handleSaveAccounts = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSavedMsg(false);
    try {
      await updatePlatformSettings(settings);
      setSettingsSavedMsg(true);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Subscription Payment Verification</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Verify EasyPaisa, JazzCash, and Bank IBFT receipts submitted by merchants to activate plans.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize border transition ${
              filter === status
                ? 'bg-[#065F46] text-white border-[#065F46]'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {status} ({status === 'all' ? payments.length : payments.filter((p) => p.status === status).length})
          </button>
        ))}
      </div>

      {/* Payments Queue */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center text-xs text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#065F46]" /> Loading payment proofs...
          </div>
        ) : visible.length === 0 ? (
          <div className="py-14 text-center text-xs text-slate-500">
            No {filter} subscription payment requests.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visible.map((p) => (
              <div key={p.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900">{p.shopName}</span>
                    <span className="font-mono text-slate-400">(/s/{p.shopSlug})</span>
                    <span
                      className={`font-bold uppercase text-[11px] ${
                        p.status === 'approved'
                          ? 'text-emerald-700'
                          : p.status === 'rejected'
                          ? 'text-red-600'
                          : 'text-amber-700'
                      }`}
                    >
                      · {p.status}
                    </span>
                  </div>
                  <p className="text-slate-700">
                    Plan: <strong>{p.planName}</strong> ({p.billingCycle}) · Amount:{' '}
                    <strong className="tabular-nums">{formatPKR(p.amount)}</strong>
                  </p>
                  <p className="text-slate-500">
                    Method: <strong className="uppercase">{p.method}</strong> · TID:{' '}
                    <code className="font-mono text-slate-800">{p.transactionId}</code> · Sender: {p.senderNumber}
                  </p>
                  {p.rejectionReason && (
                    <p className="text-red-600 font-medium">Rejection Note: {p.rejectionReason}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {p.proofUrl && (
                    <button
                      type="button"
                      onClick={() => setProofPreview(p.proofUrl)}
                      className="px-3 py-2 border border-slate-200 rounded-lg font-semibold flex items-center gap-1 hover:bg-slate-50"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Receipt
                    </button>
                  )}
                  {p.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => approvePlatformPayment(p.id).then(loadData)}
                        className="px-3.5 py-2 bg-[#065F46] hover:bg-emerald-900 text-white rounded-lg font-bold flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve &amp; Activate
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectTarget(p)}
                        className="px-3.5 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-bold flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Platform Billing Accounts Configuration */}
      <form onSubmit={handleSaveAccounts} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Platform Billing Accounts (Shown to Shop Owners)</h3>
            <p className="text-xs text-slate-500">Shop owners send subscription fees to these EasyPaisa, JazzCash, and Bank accounts.</p>
          </div>
          <button
            type="submit"
            disabled={savingSettings}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> {savingSettings ? 'Saving...' : 'Save Accounts'}
          </button>
        </div>

        {settingsSavedMsg && (
          <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg">
            Platform payment account details updated successfully.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 border border-slate-200 rounded-xl space-y-2">
            <p className="font-bold text-slate-900">EasyPaisa Receiving Account</p>
            <input
              type="text"
              value={settings.easypaisaDetails.accountTitle}
              onChange={(e) => setSettings({ ...settings, easypaisaDetails: { ...settings.easypaisaDetails, accountTitle: e.target.value } })}
              placeholder="Account Title"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
            <input
              type="text"
              value={settings.easypaisaDetails.accountNumber}
              onChange={(e) => setSettings({ ...settings, easypaisaDetails: { ...settings.easypaisaDetails, accountNumber: e.target.value } })}
              placeholder="0345 1234567"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="p-4 border border-slate-200 rounded-xl space-y-2">
            <p className="font-bold text-slate-900">JazzCash Receiving Account</p>
            <input
              type="text"
              value={settings.jazzcashDetails.accountTitle}
              onChange={(e) => setSettings({ ...settings, jazzcashDetails: { ...settings.jazzcashDetails, accountTitle: e.target.value } })}
              placeholder="Account Title"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
            <input
              type="text"
              value={settings.jazzcashDetails.accountNumber}
              onChange={(e) => setSettings({ ...settings, jazzcashDetails: { ...settings.jazzcashDetails, accountNumber: e.target.value } })}
              placeholder="0300 1234567"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="p-4 border border-slate-200 rounded-xl space-y-2">
            <p className="font-bold text-slate-900">Bank Transfer / IBFT</p>
            <input
              type="text"
              value={settings.bankDetails.bankName}
              onChange={(e) => setSettings({ ...settings, bankDetails: { ...settings.bankDetails, bankName: e.target.value } })}
              placeholder="Bank Name"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
            <input
              type="text"
              value={settings.bankDetails.accountNumber}
              onChange={(e) => setSettings({ ...settings, bankDetails: { ...settings.bankDetails, accountNumber: e.target.value } })}
              placeholder="Account Number"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
            <input
              type="text"
              value={settings.bankDetails.iban}
              onChange={(e) => setSettings({ ...settings, bankDetails: { ...settings.bankDetails, iban: e.target.value } })}
              placeholder="IBAN"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
        </div>
      </form>

      {/* Receipt Lightbox */}
      {proofPreview && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/75 flex items-center justify-center p-4"
          onClick={() => setProofPreview(null)}
        >
          <div className="bg-white rounded-2xl p-3 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <img src={proofPreview} alt="Payment Receipt" className="w-full max-h-[75vh] object-contain rounded-xl" />
            <button
              type="button"
              onClick={() => setProofPreview(null)}
              className="mt-3 w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Reject Payment ({rejectTarget.shopName})</h3>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason shown to shop owner (e.g., TID not found in ledger)..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  rejectPlatformPayment(rejectTarget.id, rejectReason).then(() => {
                    setRejectTarget(null);
                    setRejectReason('');
                    loadData();
                  });
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
