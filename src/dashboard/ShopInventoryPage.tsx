import React, { useEffect, useState } from 'react';
import { Plus, Minus, Loader2 } from 'lucide-react';
import { useDashboard } from './DashboardContext';
import {
  getShopProductsAdmin,
  getShopInventoryLogs,
  adjustShopStock,
} from '../services/tenantService';
import { Product, InventoryLog } from '../types';
import { useAuth } from '../context/AuthContext';

export const ShopInventoryPage: React.FC = () => {
  const { shopId, isReadOnly } = useDashboard();
  const { currentUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [prods, lgs] = await Promise.all([
        getShopProductsAdmin(shopId),
        getShopInventoryLogs(shopId),
      ]);
      setProducts(prods);
      setLogs(lgs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [shopId]);

  const handleAdjust = async (productId: string, delta: number) => {
    if (isReadOnly) return;
    await adjustShopStock(
      shopId,
      productId,
      delta,
      delta > 0 ? 'Manual Restock' : 'Manual Deduction',
      currentUser?.email || 'Admin'
    );
    await loadData();
  };

  if (loading) {
    return (
      <div className="py-16 flex justify-center text-xs text-slate-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#065F46]" /> Loading inventory ledger...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Inventory Management</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Track live stock quantities and review stock adjustment history.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 font-bold text-sm text-slate-900">
            Product Stock Levels
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {products.map((p) => (
              <div key={p.id} className="p-3.5 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{p.title}</p>
                  <p className="text-[11px] font-mono text-slate-400">{p.sku}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-extrabold tabular-nums text-sm ${p.stock <= 5 ? 'text-red-600' : 'text-slate-900'}`}>
                    {p.stock} units
                  </span>
                  {!isReadOnly && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleAdjust(p.id, -1)}
                        className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjust(p.id, 5)}
                        className="px-2 py-1.5 bg-[#065F46] text-white rounded-lg text-[11px] font-bold flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" /> 5
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 font-bold text-sm text-slate-900">
            Stock Audit Logs
          </div>
          {logs.length === 0 ? (
            <p className="text-xs text-slate-500 p-6 text-center">No stock movements logged yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs max-h-[500px] overflow-y-auto">
              {logs.map((l) => (
                <div key={l.id} className="p-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900">{l.productTitle}</p>
                    <p className="text-[11px] text-slate-500">
                      {l.reason} · by {l.updatedBy}
                    </p>
                  </div>
                  <div className="text-right tabular-nums">
                    <span className={`font-bold ${l.changeQuantity > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {l.changeQuantity > 0 ? `+${l.changeQuantity}` : l.changeQuantity}
                    </span>
                    <span className="block text-[10px] text-slate-400">New: {l.newStock}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
