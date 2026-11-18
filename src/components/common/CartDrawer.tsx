import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, Tag, Truck, Check } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useTenant } from '../../context/TenantContext';
import { formatPKR, FALLBACK_PRODUCT_IMAGE } from '../../data/seedData';
import { useToast } from './Toast';

export const CartDrawer: React.FC = () => {
  const {
    items,
    cartDrawerOpen,
    setCartDrawerOpen,
    removeFromCart,
    updateQuantity,
    subtotal,
    shippingFee,
    discount,
    total,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    settings,
    fulfillmentMethod,
  } = useCart();
  const { storeBasePath } = useTenant();

  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  if (!cartDrawerOpen) return null;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    const res = await applyCoupon(couponCode);
    setCouponLoading(false);
    if (res.success) {
      showToast(res.message, 'success');
      setCouponCode('');
    } else {
      showToast(res.message, 'error');
    }
  };

  const threshold = settings.freeShippingThreshold || 3500;
  const remainingForFreeShipping = Math.max(0, threshold - subtotal);
  const freeShippingProgress = Math.min(100, Math.round((subtotal / threshold) * 100));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => setCartDrawerOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2 min-w-0">
              <ShoppingBag className="w-5 h-5 text-emerald-700 shrink-0" />
              <h2 className="text-base sm:text-lg font-bold text-slate-800 truncate">Your Shopping Cart</h2>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-md shrink-0 tabular-nums">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <button
              onClick={() => setCartDrawerOpen(false)}
              className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition shrink-0"
              aria-label="Close Cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Bar */}
          <div className="px-4 sm:px-5 py-3 bg-emerald-50/70 border-b border-emerald-100">
            <div className="flex items-center justify-between text-xs font-medium text-emerald-900 mb-1.5 gap-2">
              <span className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                {remainingForFreeShipping > 0
                  ? `Add ${formatPKR(remainingForFreeShipping)} more for FREE Delivery!`
                  : 'Qualified for FREE Delivery across Pakistan!'}
              </span>
              <span className="shrink-0 font-bold tabular-nums">{freeShippingProgress}%</span>
            </div>
            <div className="w-full bg-emerald-200/60 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 sm:space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="font-semibold text-slate-700 text-base mb-1">Your cart is empty</h3>
                <p className="text-xs text-slate-500 max-w-xs mb-5">
                  Looks like you haven't added anything to your cart yet. Browse {settings.siteName} products!
                </p>
                <button
                  onClick={() => {
                    setCartDrawerOpen(false);
                    navigate(`${storeBasePath}/shop`);
                  }}
                  className="px-5 py-2.5 bg-emerald-700 text-white rounded-xl text-sm font-medium hover:bg-emerald-800 transition shadow-sm"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              items.map((item) => {
                const price = item.product.salePrice ?? item.product.regularPrice;
                return (
                  <div
                    key={item.itemKey}
                    className="flex gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-xs hover:border-slate-200 transition"
                  >
                    <img
                      src={item.product.images[0] || FALLBACK_PRODUCT_IMAGE}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
                      }}
                      alt={item.product.title}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg shrink-0 bg-slate-50 border border-slate-100"
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-xs font-semibold text-slate-800 line-clamp-1 hover:text-emerald-700">
                            {item.product.title}
                          </h4>
                          <button
                            onClick={() => removeFromCart(item.itemKey)}
                            className="text-slate-400 hover:text-rose-500 transition p-0.5 shrink-0"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {item.selectedVariants && Object.keys(item.selectedVariants).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(item.selectedVariants).map(([k, v]) => (
                              <span
                                key={k}
                                className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium"
                              >
                                {k}: {v}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums">
                          {formatPKR(price * item.quantity)}
                        </span>
                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                          <button
                            onClick={() => updateQuantity(item.itemKey, item.quantity - 1)}
                            className="p-1.5 hover:bg-slate-200 text-slate-600 transition"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2.5 text-xs font-semibold text-slate-800 tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.itemKey, item.quantity + 1)}
                            className="p-1.5 hover:bg-slate-200 text-slate-600 transition"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer & Checkout Area */}
          {items.length > 0 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-bold">{appliedCoupon.code}</span> applied: -{formatPKR(discount)}
                    </div>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-xs font-medium text-rose-600 hover:text-rose-800 underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Coupon Code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 uppercase font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={couponLoading}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-medium transition disabled:opacity-50"
                  >
                    Apply
                  </button>
                </form>
              )}

              <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-200 pt-3 tabular-nums">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium text-slate-800">{formatPKR(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>{fulfillmentMethod === 'self_pickup' ? 'Self-Pickup (Store)' : 'Shipping Fee'}</span>
                  <span className="font-medium text-slate-800">
                    {shippingFee === 0 ? (
                      <span className="text-emerald-700 font-bold uppercase text-[11px]">Free</span>
                    ) : (
                      formatPKR(shippingFee)
                    )}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Discount</span>
                    <span>-{formatPKR(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Grand Total</span>
                  <span className="text-emerald-700">{formatPKR(total)}</span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  onClick={() => {
                    setCartDrawerOpen(false);
                    navigate(`${storeBasePath}/checkout`);
                  }}
                  className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition"
                >
                  Proceed to Checkout <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setCartDrawerOpen(false);
                    navigate(`${storeBasePath}/cart`);
                  }}
                  className="w-full py-2 px-4 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-medium text-xs transition text-center"
                >
                  View Full Cart Details
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
