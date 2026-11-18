import React, { useEffect, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useDashboard } from './DashboardContext';
import { getShopCustomers } from '../services/tenantService';
import { ShopCustomerSummary } from '../types';
import { formatPKR } from '../data/seedData';

export const ShopCustomersPage: React.FC = () => {
  const { shopId } = useDashboard();
  const [customers, setCustomers] = useState<ShopCustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    getShopCustomers(shopId)
      .then(setCustomers)
      .finally(() => setLoading(false));
  }, [shopId]);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Store Customers</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Tenant-isolated customer ledger derived from your store&apos;s orders.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer name, phone, city..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center text-xs text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#065F46]" /> Loading customers...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">No customers recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Phone &amp; City</th>
                  <th className="py-3 px-4 text-right">Orders</th>
                  <th className="py-3 px-4 text-right">Lifetime Value</th>
                  <th className="py-3 px-4 text-right">Last Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{c.name}</p>
                      <p className="text-[11px] text-slate-500">{c.email || 'Guest Checkout'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-mono text-slate-700">{c.phone}</p>
                      <p className="text-[11px] text-slate-500">{c.city}</p>
                    </td>
                    <td className="py-3 px-4 text-right font-bold tabular-nums">{c.ordersCount}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-[#065F46] tabular-nums">
                      {formatPKR(c.totalSpent)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {new Date(c.lastOrderAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
