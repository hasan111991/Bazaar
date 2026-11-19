import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  ArrowRight,
  Check,
  ShieldCheck,
  Smartphone,
  Truck,
  Layers,
  MapPin,
  BarChart3,
  Lock,
  ExternalLink,
} from 'lucide-react';
import heroSaasImg from '../assets/images/hero_saas_commerce_1795028612666.jpg';
import { SubscriptionPlan, ShopPublic } from '../types';
import { formatPKR, DEFAULT_SHOP_ID } from '../data/seedData';
import { getSubscriptionPlans, getActiveDirectoryShopsPublic } from '../services/platformService';
import { useAuth } from '../context/AuthContext';

export const PlatformLandingPage: React.FC = () => {
  const { currentUser, isSuperAdmin, shopMemberships } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [shops, setShops] = useState<ShopPublic[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    getSubscriptionPlans(true).then(setPlans).catch(() => {});
    getActiveDirectoryShopsPublic().then(setShops).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-[#FAF9F6]/90 backdrop-blur border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#065F46] text-white flex items-center justify-center font-extrabold text-sm">
              B
            </div>
            <div className="leading-tight">
              <span className="font-extrabold text-base tracking-tight text-slate-900">
                BazaarPK Cloud
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Commerce OS Pakistan
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => document.getElementById('capabilities')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-slate-900 transition cursor-pointer"
            >
              Capabilities
            </button>
            <button
              type="button"
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-slate-900 transition cursor-pointer"
            >
              Pricing (PKR)
            </button>
            <button
              type="button"
              onClick={() => document.getElementById('stores')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-slate-900 transition cursor-pointer"
            >
              Live Stores
            </button>
            <Link to={`/s/${DEFAULT_SHOP_ID}`} className="hover:text-[#065F46] transition">
              Flagship Demo Store
            </Link>
          </nav>

          <div className="flex items-center gap-2.5">
            {currentUser ? (
              <>
                {isSuperAdmin && (
                  <Link
                    to="/super-admin"
                    className="px-3.5 py-2 border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 rounded-lg text-xs font-semibold transition"
                  >
                    Super Admin
                  </Link>
                )}
                {shopMemberships.length > 0 ? (
                  <Link
                    to="/dashboard"
                    className="px-4 py-2 bg-[#065F46] hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    Shop Dashboard
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <Link
                    to="/register"
                    className="px-4 py-2 bg-[#065F46] hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold transition"
                  >
                    Create Your Store
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-[#065F46] hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                >
                  Start Free Store
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Split Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 lg:pt-20 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[#065F46]">
              Multi-Tenant Retail Infrastructure · Built for Pakistan
            </p>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.08]">
              Launch Your General Store Online in Minutes.
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
              An isolated storefront URL, complete Shop Admin Dashboard, Cash on Delivery,
              EasyPaisa &amp; JazzCash receipt verification, Self-Pickup counters, and TCS/Leopards
              parcel tracking — engineered for Pakistani merchants.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/register"
                className="px-6 py-3.5 bg-[#065F46] hover:bg-emerald-900 text-white rounded-xl text-sm font-bold transition flex items-center gap-2"
              >
                Create Your Store
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to={`/s/${DEFAULT_SHOP_ID}`}
                className="px-6 py-3.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-800 rounded-xl text-sm font-semibold transition flex items-center gap-2"
              >
                <Store className="w-4 h-4 text-[#065F46]" />
                Explore BazaarPK Demo
              </Link>
            </div>

            <div className="pt-4 border-t border-slate-200 grid grid-cols-3 gap-4 max-w-md text-xs">
              <div>
                <p className="font-extrabold text-slate-900 text-base tabular-nums">40+ Cities</p>
                <p className="text-slate-500">TCS, Leopards &amp; Trax</p>
              </div>
              <div>
                <p className="font-extrabold text-slate-900 text-base tabular-nums">Rs. 0</p>
                <p className="text-slate-500">Starter tier available</p>
              </div>
              <div>
                <p className="font-extrabold text-slate-900 text-base tabular-nums">100%</p>
                <p className="text-slate-500">Tenant data isolation</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-white p-2">
              <img
                src={heroSaasImg}
                alt="Pakistani retail store curation and artisan commerce"
                className="w-full aspect-[16/10] object-cover rounded-xl"
              />
              <div className="mt-2 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-900">
                  Dedicated Storefront: <code className="font-mono text-[#065F46]">/s/your-shop</code>
                </span>
                <span>COD · EasyPaisa · JazzCash · Self-Pickup</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Strip */}
      <section id="capabilities" className="border-y border-slate-200 bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-[#065F46]">
              Three-Tier SaaS Architecture
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              Everything Required to Operate an Independent General Store
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Store,
                title: 'Instant Branded Storefront',
                desc: 'Each merchant receives an isolated public store (/s/shop-slug) with custom logo, accent theme colors, promotional banners, and buying guides.',
              },
              {
                icon: Smartphone,
                title: 'EasyPaisa, JazzCash & IBFT',
                desc: 'Accept Cash on Delivery or manual wallet/bank transfers with customer TID capture and Firebase Cloud Storage payment receipt uploads.',
              },
              {
                icon: MapPin,
                title: 'Self-Pickup Outlet Service',
                desc: 'Let local buyers skip courier fees by selecting Store Self-Pickup at checkout with configurable outlet address, timings, and phone contact.',
              },
              {
                icon: Truck,
                title: 'Courier Tracking & Invoices',
                desc: 'Sync TCS, Leopards, Trax, and PostEx tracking IDs directly from your order desk alongside non-PII public parcel tracking.',
              },
              {
                icon: Layers,
                title: 'Multi-Staff RBAC & Inventory',
                desc: 'Invite shop managers or staff with granular module permissions, stock movement audit logs, printable invoices, and CSV exports.',
              },
              {
                icon: Lock,
                title: 'Strict Tenant Security Rules',
                desc: 'Database and Cloud Storage rules strictly scope reads, writes, orders, and carts per tenant shop ID so merchant data never crosses boundaries.',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-6 rounded-xl border border-slate-200 bg-[#FAF9F6] flex flex-col gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-900/10 text-[#065F46] flex items-center justify-center">
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subscription Pricing Tiers */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#065F46]">
              Transparent PKR Pricing
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Scale From Local Shop to National Brand
            </h2>
          </div>

          <div className="inline-flex items-center p-1 bg-white border border-slate-200 rounded-xl self-start">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                billingCycle === 'monthly'
                  ? 'bg-[#065F46] text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                billingCycle === 'yearly'
                  ? 'bg-[#065F46] text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Yearly (Save 2 Months)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 bg-white flex flex-col justify-between border ${
                  plan.isPopular ? 'border-[#065F46] ring-1 ring-[#065F46]' : 'border-slate-200'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-extrabold text-slate-900">{plan.name}</h3>
                    {plan.isPopular && (
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#065F46]">
                        Most Popular
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 min-h-[36px]">{plan.description}</p>

                  <div className="pt-2 pb-4 border-b border-slate-100">
                    <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
                      {price === 0 ? 'Free' : formatPKR(price)}
                    </span>
                    {price > 0 && (
                      <span className="text-xs text-slate-500 ml-1">
                        /{billingCycle === 'yearly' ? 'year' : 'month'}
                      </span>
                    )}
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-700">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#065F46] shrink-0" />
                      <span>Up to <strong className="tabular-nums">{plan.maxProducts}</strong> Products</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#065F46] shrink-0" />
                      <span><strong className="tabular-nums">{plan.maxStorageMB} MB</strong> Cloud Storage</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#065F46] shrink-0" />
                      <span>Up to <strong className="tabular-nums">{plan.maxStaff}</strong> Team Members</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#065F46] shrink-0" />
                      <span>COD, EasyPaisa, JazzCash &amp; Self-Pickup</span>
                    </li>
                    {plan.features?.coupons && (
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#065F46] shrink-0" />
                        <span>Discount Coupons &amp; Promo Vouchers</span>
                      </li>
                    )}
                    {plan.features?.analytics && (
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#065F46] shrink-0" />
                        <span>Sales Reports &amp; Buying Guide AI</span>
                      </li>
                    )}
                  </ul>
                </div>

                <Link
                  to={`/register?plan=${plan.id}&cycle=${billingCycle}`}
                  className={`mt-6 w-full py-3 rounded-xl text-xs font-bold text-center transition ${
                    plan.isPopular
                      ? 'bg-[#065F46] hover:bg-emerald-900 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {price === 0 ? 'Start Free Store' : 'Start 14-Day Trial'}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Active Store Directory */}
      <section id="stores" className="bg-white border-t border-slate-200 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Active Storefronts on BazaarPK Cloud
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Visit a live multi-tenant storefront powered by this platform.
              </p>
            </div>
            <Link
              to={`/s/${DEFAULT_SHOP_ID}`}
              className="text-xs font-bold text-[#065F46] hover:underline flex items-center gap-1"
            >
              Visit Flagship BazaarPK Store
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Always display Flagship Demo link */}
            {!shops.some((s) => s.slug === DEFAULT_SHOP_ID) && (
              <Link
                to={`/s/${DEFAULT_SHOP_ID}`}
                className="p-4 rounded-xl border border-slate-200 hover:border-[#065F46] bg-[#FAF9F6] transition flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#065F46] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    B
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">BazaarPK Flagship</p>
                    <p className="text-xs text-slate-500 truncate">/s/bazaarpk · Karachi</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              </Link>
            )}

            {shops.slice(0, 6).map((s) => (
              <Link
                key={s.id}
                to={`/s/${s.slug}`}
                className="p-4 rounded-xl border border-slate-200 hover:border-[#065F46] bg-[#FAF9F6] transition flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {s.logoUrl ? (
                    <img
                      src={s.logoUrl}
                      alt={s.name}
                      className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#065F46] text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{s.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      /s/{s.slug} · {s.city || 'Pakistan'}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-[#FAF9F6] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#065F46]" />
            <span>BazaarPK Cloud Multi-Tenant eCommerce Platform</span>
          </div>
          <div className="flex items-center gap-5 font-medium">
            <Link to="/login" className="hover:text-slate-900">Merchant Login</Link>
            <Link to="/register" className="hover:text-slate-900">Open a Store</Link>
            <Link to={`/s/${DEFAULT_SHOP_ID}`} className="hover:text-slate-900">BazaarPK Store</Link>
            <span className="flex items-center gap-1 text-slate-400">
              <BarChart3 className="w-3.5 h-3.5" /> SaaS v2.0
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
