import React, { useState, useEffect } from 'react';
import { Search, Ban, CheckCircle2 } from 'lucide-react';
import { getAllOrdersAdmin, getAllUsersAdmin, toggleUserBlocked } from '../services/storeService';
import { formatPKR } from '../data/seedData';
import { useToast } from '../components/common/Toast';

interface CustomerSummary {
  uid?: string;
  email: string;
  name: string;
  phone: string;
  city: string;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string;
  isBlocked: boolean;
}

export const AdminCustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const [orders, users] = await Promise.all([getAllOrdersAdmin(), getAllUsersAdmin()]);
      const map = new Map<string, CustomerSummary>();

      users.forEach((u) => {
        const key = (u.email || u.uid).toLowerCase();
        map.set(key, {
          uid: u.uid,
          email: u.email || 'N/A',
          name: u.displayName || 'Customer',
          phone: u.phoneNumber || u.addresses?.[0]?.phone || 'N/A',
          city: u.addresses?.[0]?.city || 'Pakistan',
          orderCount: 0,
          totalSpent: 0,
          lastOrderDate: u.createdAt,
          isBlocked: Boolean(u.isBlocked),
        });
      });

      orders.forEach((o) => {
        const key = (o.customer?.email || o.customer?.phone || o.userId).toLowerCase();
        if (!key) return;

        const existing = map.get(key);
        if (existing) {
          existing.orderCount += 1;
          existing.totalSpent += o.total || 0;
          if (!existing.phone || existing.phone === 'N/A') {
            existing.phone = o.customer?.phone || 'N/A';
          }
          if (!existing.city || existing.city === 'Pakistan') {
            existing.city = o.customer?.city || 'Pakistan';
          }
          if (new Date(o.createdAt) > new Date(existing.lastOrderDate)) {
            existing.lastOrderDate = o.createdAt;
          }
        } else {
          map.set(key, {
            uid: o.userId !== 'guest' ? o.userId : undefined,
            email: o.customer?.email || 'N/A',
            name: o.customer?.name || 'Customer',
            phone: o.customer?.phone || 'N/A',
            city: o.customer?.city || 'Pakistan',
            orderCount: 1,
            totalSpent: o.total || 0,
            lastOrderDate: o.createdAt,
            isBlocked: false,
          });
        }
      });

      setCustomers(Array.from(map.values()));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleToggleBlock = async (cust: CustomerSummary) => {
    if (!cust.uid) return;
    const nextState = !cust.isBlocked;
    try {
      await toggleUserBlocked(cust.uid, nextState);
      setCustomers((prev) =>
        prev.map((c) => (c.uid === cust.uid ? { ...c, isBlocked: nextState } : c))
      );
      showToast(
        nextState ? `Account ${cust.email} blocked.` : `Account ${cust.email} unblocked.`,
        'info'
      );
    } catch {
      showToast('Could not update customer status.', 'error');
    }
  };

  const filtered = customers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Customer Directory</h1>
        <p className="text-xs text-slate-500">
          Registered & guest shoppers across Pakistan with lifetime value and account status controls
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by customer name, email, Pakistani phone, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading customers...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">No customers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">City</th>
                  <th className="py-3 px-3">Orders</th>
                  <th className="py-3 px-3">Total Spend (PKR)</th>
                  <th className="py-3 px-3">Account</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c, i) => (
                  <tr key={c.uid || i} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                          {c.name[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="font-bold text-slate-900 whitespace-nowrap">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="block text-slate-700 font-medium">{c.phone}</span>
                      <span className="text-[10px] text-slate-400">{c.email}</span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">{c.city}</td>
                    <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">{c.orderCount} orders</td>
                    <td className="py-3 px-3 font-extrabold text-emerald-800 whitespace-nowrap">
                      {formatPKR(c.totalSpent)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {c.uid ? (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            c.isBlocked
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {c.isBlocked ? 'Blocked' : 'Active'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Guest</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {c.uid ? (
                        <button
                          onClick={() => handleToggleBlock(c)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                            c.isBlocked
                              ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          }`}
                        >
                          {c.isBlocked ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Unblock
                            </>
                          ) : (
                            <>
                              <Ban className="w-3.5 h-3.5" /> Block
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
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
