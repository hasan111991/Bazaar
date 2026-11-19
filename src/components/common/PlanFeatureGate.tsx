import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowRight, Sparkles } from 'lucide-react';
import { PlanFeatures } from '../../types';
import { useDashboard } from '../../dashboard/DashboardContext';

const FEATURE_META: Partial<
  Record<keyof PlanFeatures, { title: string; requiredPlan: string; summary: string }>
> = {
  pos: {
    title: 'POS & Counter Billing Terminal',
    requiredPlan: 'Business Plan (Rs. 1,499/mo)',
    summary:
      'Ring up walk-in customers with barcode matching, split payments, 58mm/80mm thermal receipt printing, and return/exchange processing.',
  },
  barcode: {
    title: 'Barcode Scanning & SKU Matching',
    requiredPlan: 'Business Plan (Rs. 1,499/mo)',
    summary:
      'Scan hardware USB/Bluetooth barcodes directly at POS checkout and inventory intake.',
  },
  suppliersPurchases: {
    title: 'Suppliers & Purchase Invoices',
    requiredPlan: 'Business Plan (Rs. 1,499/mo)',
    summary:
      'Record wholesaler bills, update weighted/latest cost prices, auto-increment stock, and track supplier payables.',
  },
  khata: {
    title: 'Customer Khata / Credit Ledger',
    requiredPlan: 'Business Plan (Rs. 1,499/mo)',
    summary:
      'Issue store credit safely, track customer recovery payments, and print clean Khata statements.',
  },
  coupons: {
    title: 'Discount Coupons & Promo Vouchers',
    requiredPlan: 'Starter Plan (Rs. 799/mo)',
    summary: 'Create festive promo codes and fixed/percentage cart discounts.',
  },
  banners: {
    title: 'Custom Hero Banners',
    requiredPlan: 'Starter Plan (Rs. 799/mo)',
    summary: 'Promote seasonal sales and store collections with custom storefront hero slides.',
  },
  buyingGuide: {
    title: 'Market Buying Guide',
    requiredPlan: 'Professional Plan (Rs. 2,499/mo)',
    summary: 'Showcase curated buying guides and shopping trend highlights on your catalog.',
  },
  analytics: {
    title: 'Sales & Inventory Analytics',
    requiredPlan: 'Starter Plan (Rs. 799/mo)',
    summary: 'Track store revenue, category mix, and stock valuation metrics.',
  },
  advancedInventory: {
    title: 'Advanced Inventory Audit & Wastage Logs',
    requiredPlan: 'Business Plan (Rs. 1,499/mo)',
    summary: 'Track damaged, wastage, opening, purchase-in, and return movements with valuation.',
  },
  advancedReports: {
    title: 'COGS, Expenses & Net Profit Analytics',
    requiredPlan: 'Business Plan (Rs. 1,499/mo)',
    summary: 'Compare COGS, gross margin, store operating expenses, and net profit.',
  },
  staffAccounts: {
    title: 'Multi-Staff Accounts & Permissions',
    requiredPlan: 'Starter Plan (Rs. 799/mo)',
    summary: 'Invite cashiers, managers, and stock clerks with granular module permissions.',
  },
  customBranding: {
    title: 'Custom Store Branding',
    requiredPlan: 'Free Plan & Above',
    summary: 'Personalize logo, store colors, and storefront headers.',
  },
  selfPickup: {
    title: 'Storefront Self-Pickup',
    requiredPlan: 'Free Plan & Above',
    summary: 'Allow local buyers to reserve items online and collect at your shop counter.',
  },
  customPages: {
    title: 'Custom Storefront CMS Pages',
    requiredPlan: 'Starter Plan (Rs. 799/mo)',
    summary: 'Publish custom About, FAQ, Return Policy, and Terms pages.',
  },
  prioritySupport: {
    title: 'Priority Merchant Support',
    requiredPlan: 'Professional Plan (Rs. 2,499/mo)',
    summary: 'Get accelerated ticket handling and dedicated onboarding assistance.',
  },
};

export const PlanFeatureGate: React.FC<{
  feature: keyof PlanFeatures;
  children: React.ReactNode;
}> = ({ feature, children }) => {
  const { canUseFeature, plan, isSuspended, isExpired } = useDashboard();

  if (canUseFeature(feature)) {
    return <>{children}</>;
  }

  const meta = FEATURE_META[feature] || {
    title: 'Premium Retail Feature',
    requiredPlan: 'Business or Professional Plan',
    summary: 'Upgrade your subscription plan to unlock this capability for your store.',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 max-w-2xl mx-auto text-center space-y-5 shadow-xs my-6">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
        <Lock className="w-7 h-7" />
      </div>

      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-3 py-1 rounded-md border border-amber-200">
          <Sparkles className="w-3.5 h-3.5" />
          {isSuspended
            ? 'Store Suspended'
            : isExpired
            ? 'Subscription Expired'
            : `Included in ${meta.requiredPlan}`}
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">{meta.title}</h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
          {isSuspended
            ? 'This workspace is currently paused. Contact Super Admin support or review your shop status.'
            : isExpired
            ? `Your ${plan.name} subscription has expired beyond the grace period. Renew to restore access.`
            : `${meta.summary} You are currently on ${plan.name}.`}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          to="/dashboard/subscription"
          className="px-6 py-3 bg-[#065F46] hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition"
        >
          Upgrade Plan Now <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to="/dashboard"
          className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
        >
          Back to Overview
        </Link>
      </div>
    </div>
  );
};
