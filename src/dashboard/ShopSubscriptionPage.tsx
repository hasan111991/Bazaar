import React, { useEffect, useState } from 'react';
import { Check, CheckCircle2, Loader2, X, AlertCircle } from 'lucide-react';
import { useDashboard } from './DashboardContext';
import {
  getSubscriptionPlans,
  getPlatformSettings,
  getPaymentsByShop,
  submitSubscriptionPayment,
} from '../services/platformService';
import { SubscriptionPlan, PlatformSettings, PlatformPayment, BillingCycle } from '../types';
import { formatPKR, DEFAULT_PLATFORM_SETTINGS } from '../data/seedData';
import { ImageUploader } from '../components/common/ImageUploader';
import { useAuth } from '../context/AuthContext';

export const ShopSubscriptionPage: React.FC = () => {
  const { shopId, shop, plan: currentPlan, isReadOnly } = useDashboard();
  const { currentUser } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  const [payments, setPayments] = useState<PlatformPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [method, setMethod] = useState<'easypaisa' | 'jazzcash' | 'bank_transfer'>('easypaisa');
  const [transactionId, setTransactionId] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [proofImages, setProofImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submittedMsg, setSubmittedMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadBilling = async () => {
    if (!shopId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const [pList, stg, pays] = await Promise.all([
        getSubscriptionPlans(true),
        getPlatformSettings(),
        getPaymentsByShop(shopId),
      ]);
      setPlans(pList);
      setPlatformSettings(stg);
      setPayments(pays);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load subscription billing details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBilling();
  }, [shopId]);

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !shop || isReadOnly) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const amount = billingCycle === 'yearly' ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice;
      await submitSubscriptionPayment({
        shopId: shop.id,
        shopName: shop.name,
        shopSlug: shop.slug,
        ownerId: currentUser?.uid || shop.ownerId,
        ownerEmail: currentUser?.email || shop.ownerEmail,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        billingCycle,
        amount,
        method,
        transactionId: transactionId.trim(),
        senderNumber: senderNumber.trim(),
        proofUrl: proofImages[0] || '',
      });
      setSelectedPlan(null);
      setTransactionId('');
      setSenderNumber('');
      setProofImages([]);
      setSubmittedMsg(true);
      await loadBilling();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not submit payment proof.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex justify-center text-xs text-slate-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#065F46]" /> Loading subscription details...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Subscription Plan &amp; Billing</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          View plan quotas, submit subscription payment proofs, and track Super Admin approvals.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
        </div>
      )}

      {submittedMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Payment proof submitted! Super Admin will verify your TID and activate your plan shortly.
        </div>
      )}

      {/* Active Subscription Summary */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-slate-500 block">Current Tier</span>
          <strong className="text-base font-extrabold text-slate-900">{currentPlan.name}</strong>
        </div>
        <div>
          <span className="text-slate-500 block">Status</span>
          <strong className="text-base font-extrabold uppercase text-[#065F46]">
            {shop?.subscription?.status || 'active'}
          </strong>
        </div>
        <div>
          <span className="text-slate-500 block">Plan Limits</span>
          <strong className="text-slate-900 tabular-nums">
            {currentPlan.maxProducts === -1 ? 'Unlimited' : currentPlan.maxProducts} prod · {currentPlan.maxStorageMB} MB · {currentPlan.maxStaff} staff
          </strong>
        </div>
        <div>
          <span className="text-slate-500 block">Renewal / Expiry Date</span>
          <strong className="text-slate-900">
            {shop?.subscription?.expiryDate
              ? new Date(shop.subscription.expiryDate).toLocaleDateString()
              : 'N/A'}
          </strong>
        </div>
      </div>

      {/* Upgrade Plans Grid */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-slate-900">Available Plans</h3>
        <div className="inline-flex border border-slate-200 bg-white rounded-lg p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-3 py-1 rounded-md ${billingCycle === 'monthly' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            className={`px-3 py-1 rounded-md ${billingCycle === 'yearly' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
          >
            Yearly
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p) => {
          const price = billingCycle === 'yearly' ? p.yearlyPrice : p.monthlyPrice;
          const isCurrent = p.id === currentPlan.id;
          return (
            <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4 text-xs">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-extrabold text-slate-900">{p.name}</h4>
                  {isCurrent && <span className="text-[11px] font-bold text-[#065F46]">ACTIVE</span>}
                </div>
                <p className="text-slate-500">{p.description}</p>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums pt-1">
                  {price === 0 ? 'Free' : `${formatPKR(price)} / ${billingCycle === 'yearly' ? 'yr' : 'mo'}`}
                </p>
                <ul className="space-y-1.5 text-slate-700 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-[#065F46]" />
                    {p.maxProducts === -1 ? 'Unlimited Active Products' : `Up to ${p.maxProducts} Active Products`}
                  </li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#065F46]" /> {p.maxStorageMB} MB Cloud Storage</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#065F46]" /> {p.maxStaff} Team Members</li>
                </ul>
              </div>
              {!isReadOnly && price > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedPlan(p)}
                  className="w-full py-2.5 bg-[#065F46] hover:bg-emerald-900 text-white rounded-xl font-bold"
                >
                  {isCurrent ? 'Renew Plan' : `Upgrade to ${p.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Payment History */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 text-xs">
        <h3 className="text-sm font-extrabold text-slate-900">Submitted Subscription Payments</h3>
        {payments.length === 0 ? (
          <p className="text-slate-500">No subscription payment requests submitted yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {payments.map((pay) => (
              <div key={pay.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">
                    {pay.planName} ({pay.billingCycle}) — {formatPKR(pay.amount)}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {pay.method.toUpperCase()} · TID: {pay.transactionId} · {new Date(pay.createdAt).toLocaleDateString()}
                  </p>
                  {pay.rejectionReason && (
                    <p className="text-red-600 font-medium mt-0.5">Reason: {pay.rejectionReason}</p>
                  )}
                </div>
                <span
                  className={`font-bold uppercase text-[11px] ${
                    pay.status === 'approved' ? 'text-emerald-700' : pay.status === 'rejected' ? 'text-red-600' : 'text-amber-700'
                  }`}
                >
                  {pay.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Payment Proof Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleSubmitProof} className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 my-8 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                Pay for {selectedPlan.name} ({billingCycle})
              </h3>
              <button type="button" onClick={() => setSelectedPlan(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="font-bold text-emerald-900">
                Amount Payable: {formatPKR(billingCycle === 'yearly' ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice)}
              </p>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Transfer to one of the platform receiving accounts below and upload your screenshot proof.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMethod('easypaisa')}
                className={`p-2.5 rounded-xl border text-left ${method === 'easypaisa' ? 'border-[#065F46] bg-emerald-50/40' : 'border-slate-200'}`}
              >
                <p className="font-bold">EasyPaisa</p>
                <p className="text-[11px] text-slate-600">{platformSettings.easypaisaDetails.accountNumber}</p>
              </button>
              <button
                type="button"
                onClick={() => setMethod('jazzcash')}
                className={`p-2.5 rounded-xl border text-left ${method === 'jazzcash' ? 'border-[#065F46] bg-emerald-50/40' : 'border-slate-200'}`}
              >
                <p className="font-bold">JazzCash</p>
                <p className="text-[11px] text-slate-600">{platformSettings.jazzcashDetails.accountNumber}</p>
              </button>
              <button
                type="button"
                onClick={() => setMethod('bank_transfer')}
                className={`p-2.5 rounded-xl border text-left ${method === 'bank_transfer' ? 'border-[#065F46] bg-emerald-50/40' : 'border-slate-200'}`}
              >
                <p className="font-bold">{platformSettings.bankDetails.bankName}</p>
                <p className="text-[11px] text-slate-600">{platformSettings.bankDetails.accountNumber}</p>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Transaction ID (TID) *"
                className="px-3 py-2 border border-slate-200 rounded-lg font-mono"
              />
              <input
                type="text"
                required
                value={senderNumber}
                onChange={(e) => setSenderNumber(e.target.value)}
                placeholder="Sender Mobile / Account *"
                className="px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>

            <ImageUploader
              shopId={shopId}
              folder="platform_subscription"
              images={proofImages}
              onChange={setProofImages}
              label="Upload Payment Screenshot Proof *"
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setSelectedPlan(null)} className="px-4 py-2 border border-slate-200 rounded-lg font-semibold">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-[#065F46] text-white rounded-lg font-bold"
              >
                {submitting ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
