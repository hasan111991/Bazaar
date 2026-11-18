import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Package,
  DollarSign,
  Users,
  Plus,
  Settings,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { useDashboard } from './DashboardContext';
import {
  getAllShopOrdersAdmin,
  getShopProductsAdmin,
  getShopCustomers,
} from '../services/tenantService';
import { Order, Product } from '../types';
import { formatPKR } from '../data/seedData';
import { SimpleBarChart } from '../components/common/SimpleCharts';

export const ShopOverviewPage: React.FC = () => {
  const { shopId, shop, plan, isReadOnly } = useDashboard();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    Promise.all([
      getAllShopOrdersAdmin(shopId).catch(() => []),
      getShopProductsAdmin(shopId).catch(() => []),
      getShopCustomers(shopId).catch(() => []),
    ])
      .then(([ords, prods, custs]) => {
        setOrders(ords);
        setProducts(prods);
        setCustomerCount(custs.length);
      })
      .finally(() => setLoading(false));
  }, [shopId]);

  if (loading) {
    return (
      <div className="py-20 flex justify-center text-xs text-slate-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#065F46]" /> Loading shop metrics...
      </div>
    );
  }

  const validOrders = orders.filter((o) => o.orderStatus !== 'Cancelled');
  const totalRevenue = validOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const pendingOrders = orders.filter((o) => o.orderStatus === 'Pending').length;
  const lowStockCount = products.filter((p) => p.stock <= 5).length;

  // 7-day sales revenue bar chart
  const salesChart = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayKey = d.toISOString().slice(0, 10);
    const dayRev = validOrders
      .filter((o) => o.createdAt?.startsWith(dayKey))
      .reduce((s, o) => s + Number(o.total || 0), 0);
    return {
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      value: dayRev,
    };
  });

  const usedStorageMB = Number(((shop?.usage?.storageBytes || 0) / (1024 * 1024)).toFixed(1));
  const prodPct = Math.min(100, Math.round((products.length / Math.max(1, plan.maxProducts)) * 100));
  const storPct = Math.min(100, Math.round((usedStorageMB / Math.max(1, plan.maxStorageMB)) * 100));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Store Overview</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time storefront metrics, quota status, and recent orders.
          </p>
        </div>

        {!isReadOnly && (
          <div className="flex flex-wrap gap-2">
            <Link
              to="/dashboard/products"
              className="px-4 py-2 bg-[#065F46] hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Product
            </Link>
            <Link
              to="/dashboard/settings"
              className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" /> Payment &amp; Pickup
            </Link>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: formatPKR(totalRevenue), sub: `${validOrders.length} confirmed/active orders`, icon: DollarSign },
          { label: 'Total Orders', value: orders.length, sub: `${pendingOrders} pending confirmation`, icon: ShoppingBag },
          { label: 'Catalog Products', value: products.length, sub: `${lowStockCount} low stock alerts`, icon: Package },
          { label: 'Store Customers', value: customerCount, sub: 'Unique buyers recorded', icon: Users },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">{kpi.label}</span>
              <kpi.icon className="w-4 h-4 text-[#065F46]" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 tabular-nums">{kpi.value}</p>
            <p className="text-[11px] text-slate-500">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Sales Chart & Plan Quotas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-1">7-Day Sales Revenue (PKR)</h3>
          <p className="text-[11px] text-slate-500 mb-4">Daily order volume excluding cancelled orders</p>
          <SimpleBarChart data={salesChart} barColor="#065F46" valuePrefix="Rs. " />
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Plan Limits &amp; Usage</h3>
              <span className="text-xs font-bold text-[#065F46]">{plan.name}</span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Products Used</span>
                <span className="font-bold tabular-nums">{products.length} / {plan.maxProducts}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#065F46]" style={{ width: `${prodPct}%` }} />
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Cloud Storage Used</span>
                <span className="font-bold tabular-nums">{usedStorageMB} MB / {plan.maxStorageMB} MB</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-900" style={{ width: `${storPct}%` }} />
              </div>
            </div>
          </div>

          <Link
            to="/dashboard/subscription"
            className="w-full py-2.5 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5"
          >
            <CreditCard className="w-3.5 h-3.5" /> Upgrade or Renew Plan
          </Link>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Recent Store Orders</h3>
          <Link to="/dashboard/orders" className="text-xs font-bold text-[#065F46] hover:underline">
            Manage All Orders
          </Link>
        </div>
        {orders.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No orders placed in this shop yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {orders.slice(0, 6).map((o) => (
              <div key={o.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-slate-900">
                    {o.orderNumber} — {o.customer.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {o.customer.city} · {o.paymentMethod.toUpperCase()} ({o.paymentStatus}) · {o.fulfillmentMethod === 'self_pickup' ? 'Self-Pickup' : 'Delivery'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-slate-900 tabular-nums">{formatPKR(o.total)}</p>
                  <span className="text-[11px] font-semibold text-[#065F46]">{o.orderStatus}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
