import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Package,
  AlertTriangle,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { getAllOrdersAdmin, getAllProductsAdmin } from '../services/storeService';
import { Order, Product } from '../types';
import { formatPKR, getPaymentMethodLabel, FALLBACK_PRODUCT_IMAGE } from '../data/seedData';

export const AdminDashboardPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllOrdersAdmin(), getAllProductsAdmin()]).then(([ords, prods]) => {
      setOrders(ords || []);
      setProducts(prods || []);
      setLoading(false);
    });
  }, []);

  const totalSales = orders
    .filter((o) => o.orderStatus !== 'Cancelled' && o.orderStatus !== 'Refunded')
    .reduce((sum, o) => sum + (o.total || 0), 0);
  const pendingOrders = orders.filter((o) => o.orderStatus === 'Pending');
  const deliveredOrders = orders.filter((o) => o.orderStatus === 'Delivered');
  const lowStockProducts = products.filter((p) => p.stock <= 5);

  const recentOrders = orders.slice(0, 6);
  const bestSellers = [...products].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 5);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time business performance for your Pakistani eCommerce store
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            to="/admin/products"
            className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Product
          </Link>
          <Link
            to="/admin/orders"
            className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            Manage Orders
          </Link>
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              {formatPKR(totalSales)}
            </h3>
            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-1">
              <TrendingUp className="w-3.5 h-3.5" /> {deliveredOrders.length} delivered orders
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Orders
            </span>
            <div className="p-2.5 bg-sky-50 text-sky-800 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">{orders.length}</h3>
            <span className="text-[11px] text-slate-500 block mt-1">
              {pendingOrders.length} pending fulfillment
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Catalog
            </span>
            <div className="p-2.5 bg-purple-50 text-purple-800 rounded-xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">{products.length}</h3>
            <span className="text-[11px] text-slate-500 block mt-1">
              Products across store categories
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Low Stock Alert
            </span>
            <div className="p-2.5 bg-amber-50 text-amber-800 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl sm:text-2xl font-black text-amber-800">
              {lowStockProducts.length}
            </h3>
            <span className="text-[11px] text-slate-500 block mt-1">
              Items with ≤ 5 units in warehouse
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Orders & Top Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Recent Customer Orders</h3>
              <p className="text-xs text-slate-400">Latest transactions from all Pakistani cities</p>
            </div>
            <Link
              to="/admin/orders"
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 shrink-0"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading orders...</div>
          ) : recentOrders.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No orders placed yet. As customers order, they appear here instantly.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 pr-2">Order #</th>
                    <th className="py-2.5 px-2">Customer & City</th>
                    <th className="py-2.5 px-2">Total</th>
                    <th className="py-2.5 px-2">Payment</th>
                    <th className="py-2.5 px-2">Status</th>
                    <th className="py-2.5 pl-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 pr-2 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <div>{ord.orderNumber}</div>
                        {ord.fulfillmentMethod === 'self_pickup' && (
                          <span className="inline-block text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded mt-0.5 font-sans">
                            Self-Pickup
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <span className="font-semibold text-slate-800 block truncate max-w-[140px]">
                          {ord.customer?.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {ord.customer?.city || 'Pakistan'}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-bold text-slate-900 whitespace-nowrap">
                        {formatPKR(ord.total)}
                      </td>
                      <td className="py-3 px-2 whitespace-nowrap">
                        <span className="text-[11px] font-medium text-slate-600">
                          {getPaymentMethodLabel(ord.paymentMethod, ord.fulfillmentMethod)}
                        </span>
                      </td>
                      <td className="py-3 px-2 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            ord.orderStatus === 'Delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ord.orderStatus === 'Shipped'
                              ? 'bg-sky-100 text-sky-800'
                              : ord.orderStatus === 'Cancelled'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ord.orderStatus}
                        </span>
                      </td>
                      <td className="py-3 pl-2 text-right whitespace-nowrap">
                        <Link
                          to="/admin/orders"
                          className="text-xs font-semibold text-emerald-800 hover:underline"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-bold text-base text-slate-900">Best Performing Items</h3>
            <Link
              to="/admin/products"
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
            >
              All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 space-y-3">
            {bestSellers.map((prod) => (
              <div key={prod.id} className="pt-3 flex items-center gap-3">
                <img
                  src={prod.images[0] || FALLBACK_PRODUCT_IMAGE}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
                  }}
                  alt={prod.title}
                  className="w-12 h-12 object-cover rounded-xl border border-slate-100 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h5 className="font-semibold text-xs text-slate-800 truncate">{prod.title}</h5>
                  <p className="text-[10px] text-slate-400 capitalize">
                    {prod.brand} • {prod.stock} in stock
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-slate-900 block">
                    {formatPKR(prod.salePrice ?? prod.regularPrice)}
                  </span>
                  <span className="text-[10px] text-amber-600 font-semibold">
                    ★ {prod.rating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
