import React, { useState, useEffect } from 'react';
import { Search, X, History } from 'lucide-react';
import { getAllProductsAdmin, getInventoryLogs, adjustStock } from '../services/storeService';
import { Product, InventoryLog } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { FALLBACK_PRODUCT_IMAGE } from '../data/seedData';

export const AdminInventoryPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'low' | 'out'>('all');

  // Adjustment Modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState('Restocked from Karachi workshop supplier');
  const [adjusting, setAdjusting] = useState(false);

  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, inventoryLogs] = await Promise.all([
        getAllProductsAdmin(),
        getInventoryLogs(),
      ]);
      setProducts(prods || []);
      setLogs(inventoryLogs || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || adjustDelta === 0) return;
    setAdjusting(true);
    try {
      await adjustStock(
        selectedProduct.id,
        adjustDelta,
        adjustReason.trim() || 'Manual stock update',
        currentUser?.email || 'admin'
      );
      showToast(
        `Updated stock for "${selectedProduct.title}" (${adjustDelta > 0 ? `+${adjustDelta}` : adjustDelta})`,
        'success'
      );
      setSelectedProduct(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to adjust stock', 'error');
    } finally {
      setAdjusting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (filterType === 'low' && (p.stock > 5 || p.stock === 0)) return false;
    if (filterType === 'out' && p.stock > 0) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Inventory & Warehouse Management
        </h1>
        <p className="text-xs text-slate-500">
          Track real-time stock balances across all product variants and audit logs
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => setFilterType('all')}
          className={`p-5 rounded-3xl border text-left transition ${
            filterType === 'all'
              ? 'bg-emerald-900 text-white border-emerald-900 shadow-md'
              : 'bg-white text-slate-800 border-slate-200'
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider opacity-70 block mb-1">
            Total Inventory Units
          </span>
          <span className="text-2xl font-black">
            {products.reduce((sum, p) => sum + (p.stock || 0), 0)} units
          </span>
          <span className="text-[11px] block mt-1 opacity-75">
            {products.length} catalog items
          </span>
        </button>

        <button
          onClick={() => setFilterType('low')}
          className={`p-5 rounded-3xl border text-left transition ${
            filterType === 'low'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md'
              : 'bg-white text-slate-800 border-slate-200'
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider opacity-70 block mb-1">
            Low Stock Alert (≤ 5)
          </span>
          <span className="text-2xl font-black">
            {products.filter((p) => p.stock <= 5 && p.stock > 0).length} items
          </span>
          <span className="text-[11px] block mt-1 opacity-75">Needs restock reorder</span>
        </button>

        <button
          onClick={() => setFilterType('out')}
          className={`p-5 rounded-3xl border text-left transition ${
            filterType === 'out'
              ? 'bg-rose-700 text-white border-rose-700 shadow-md'
              : 'bg-white text-slate-800 border-slate-200'
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider opacity-70 block mb-1">
            Out of Stock (0)
          </span>
          <span className="text-2xl font-black">
            {products.filter((p) => p.stock <= 0).length} items
          </span>
          <span className="text-[11px] block mt-1 opacity-75">Unavailable to buy</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by product name, SKU, or brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
          />
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading inventory...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-3">SKU</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Current Stock</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Adjust Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={prod.images[0] || FALLBACK_PRODUCT_IMAGE}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
                          }}
                          alt={prod.title}
                          className="w-10 h-10 object-cover rounded-xl border shrink-0 bg-slate-50"
                        />
                        <span className="font-bold text-slate-900 truncate max-w-xs block">
                          {prod.title}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-600 whitespace-nowrap">{prod.sku}</td>
                    <td className="py-3 px-3 capitalize text-slate-600 whitespace-nowrap">
                      {prod.category.replace('-', ' ')}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="text-sm font-black text-slate-900">{prod.stock} units</span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {prod.stock <= 0 ? (
                        <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                          Out of Stock
                        </span>
                      ) : prod.stock <= 5 ? (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          Low Stock ({prod.stock})
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          Optimal Stock
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedProduct(prod);
                          setAdjustDelta(10);
                          setAdjustReason('Restocked from supplier shipment');
                        }}
                        className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold transition"
                      >
                        Adjust Qty
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inventory Audit Logs */}
      {logs.length > 0 && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-800" />
            <h3 className="font-bold text-base text-slate-900">Recent Stock Audit Logs</h3>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {logs.slice(0, 8).map((log) => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                <div>
                  <span className="font-bold text-slate-900">{log.productTitle}</span>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Reason: <em>{log.reason}</em> • by {log.updatedBy}
                  </p>
                </div>
                <div className="sm:text-right shrink-0">
                  <span
                    className={`font-mono font-bold text-xs ${
                      log.changeQuantity > 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {log.changeQuantity > 0 ? `+${log.changeQuantity}` : log.changeQuantity} units
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {log.previousStock} → {log.newStock} units
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900">Adjust Product Stock</h3>
              <button onClick={() => setSelectedProduct(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1">
              <span className="font-bold text-slate-800 block truncate">
                {selectedProduct.title}
              </span>
              <p className="text-slate-500">
                Current Inventory Level:{' '}
                <strong className="text-slate-900">{selectedProduct.stock} units</strong>
              </p>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity Change (+ to add stock, - to deduct) *
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustDelta((d) => (d > 0 ? -Math.abs(d) : d))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                      adjustDelta < 0
                        ? 'bg-rose-100 border-rose-300 text-rose-800'
                        : 'border-slate-200'
                    }`}
                  >
                    Deduct (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustDelta((d) => Math.abs(d))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                      adjustDelta > 0
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                        : 'border-slate-200'
                    }`}
                  >
                    Add (+)
                  </button>
                  <input
                    type="number"
                    required
                    value={adjustDelta}
                    onChange={(e) => setAdjustDelta(Number(e.target.value))}
                    className="flex-1 min-w-[90px] px-3 py-1.5 text-xs border rounded-xl font-bold"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  New stock will become:{' '}
                  <strong>{Math.max(0, selectedProduct.stock + adjustDelta)} units</strong>
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Stock Adjustment *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Received new shipment from Sialkot factory"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-xl"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className="px-5 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-900 disabled:opacity-50"
                >
                  {adjusting ? 'Adjusting...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
