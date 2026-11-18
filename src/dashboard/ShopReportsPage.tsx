import React, { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useDashboard } from './DashboardContext';
import { getAllShopOrdersAdmin } from '../services/tenantService';
import { Order } from '../types';
import { formatPKR } from '../data/seedData';
import { DistributionMeters, SimpleBarChart } from '../components/common/SimpleCharts';

export const ShopReportsPage: React.FC = () => {
  const { shopId, shop } = useDashboard();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    getAllShopOrdersAdmin(shopId)
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [shopId]);

  if (loading) {
    return (
      <div className="py-16 flex justify-center text-xs text-slate-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#065F46]" /> Generating sales reports...
      </div>
    );
  }

  const valid = orders.filter((o) => o.orderStatus !== 'Cancelled');
  const totalSales = valid.reduce((s, o) => s + Number(o.total || 0), 0);
  const avgOrder = valid.length > 0 ? Math.round(totalSales / valid.length) : 0;

  // Payment method distribution
  const payCounts = new Map<string, number>();
  valid.forEach((o) => payCounts.set(o.paymentMethod.toUpperCase(), (payCounts.get(o.paymentMethod.toUpperCase()) || 0) + 1));

  // City breakdown
  const cityRevenue = new Map<string, number>();
  valid.forEach((o) => {
    const city = o.customer.city || 'Other';
    cityRevenue.set(city, (cityRevenue.get(city) || 0) + Number(o.total || 0));
  });
  const topCities = Array.from(cityRevenue.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));

  const exportReport = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Store', shop?.name || shopId],
      ['Total Active Orders', String(valid.length)],
      ['Gross Revenue PKR', String(totalSales)],
      ['Average Order Value PKR', String(avgOrder)],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${shop?.slug || shopId}-sales-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Reports &amp; Store Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">Sales performance, payment splits, and regional reach across Pakistan.</p>
        </div>
        <button
          type="button"
          onClick={exportReport}
          className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start"
        >
          <Download className="w-3.5 h-3.5" /> Download Summary CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Gross Revenue (Excl. Cancelled)</p>
          <p className="text-2xl font-extrabold text-[#065F46] mt-1 tabular-nums">{formatPKR(totalSales)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Average Order Value</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{formatPKR(avgOrder)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Self-Pickup vs Home Delivery</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
            {valid.filter((o) => o.fulfillmentMethod === 'self_pickup').length} /{' '}
            {valid.filter((o) => o.fulfillmentMethod !== 'self_pickup').length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Top Cities by Revenue (PKR)</h3>
          {topCities.length > 0 ? (
            <SimpleBarChart data={topCities} valuePrefix="Rs. " />
          ) : (
            <p className="text-xs text-slate-500 py-8 text-center">No order data yet.</p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Payment Method Preference</h3>
          {payCounts.size > 0 ? (
            <DistributionMeters
              items={Array.from(payCounts.entries()).map(([label, count], idx) => ({
                label,
                count,
                color: ['#065F46', '#0f172a', '#d97706', '#0284c7'][idx % 4],
              }))}
            />
          ) : (
            <p className="text-xs text-slate-500 py-8 text-center">No orders yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};
