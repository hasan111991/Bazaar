import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Shop, StoreSettings, SubscriptionPlan } from '../types';
import {
  DEFAULT_SHOP_ID,
  INITIAL_SETTINGS,
  DEFAULT_SUBSCRIPTION_PLANS,
} from '../data/seedData';
import { getShopBySlug, getShopById, getSubscriptionPlans } from '../services/platformService';
import { getShopSettings } from '../services/tenantService';

interface TenantContextType {
  shopId: string;
  shopSlug: string;
  shop: Shop | null;
  settings: StoreSettings;
  plan: SubscriptionPlan;
  loading: boolean;
  notFound: boolean;
  isSuspended: boolean;
  isExpired: boolean;
  storeBasePath: string;
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{
  slug?: string;
  shopIdOverride?: string;
  children: React.ReactNode;
}> = ({ slug, shopIdOverride, children }) => {
  const targetSlug = slug || DEFAULT_SHOP_ID;
  const [shop, setShop] = useState<Shop | null>(null);
  const [settings, setSettings] = useState<StoreSettings>(INITIAL_SETTINGS);
  const [plan, setPlan] = useState<SubscriptionPlan>(DEFAULT_SUBSCRIPTION_PLANS[0]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const loadTenant = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const resolvedShop = shopIdOverride
        ? await getShopById(shopIdOverride)
        : await getShopBySlug(targetSlug);

      if (!resolvedShop) {
        // Graceful flagship BazaarPK compatibility if migration hasn't run yet
        if (targetSlug === DEFAULT_SHOP_ID) {
          setShop({
            id: DEFAULT_SHOP_ID,
            slug: DEFAULT_SHOP_ID,
            name: INITIAL_SETTINGS.siteName,
            ownerId: 'platform',
            ownerName: 'BazaarPK',
            ownerEmail: INITIAL_SETTINGS.contactEmail,
            ownerPhone: INITIAL_SETTINGS.contactPhone,
            city: 'Karachi',
            address: INITIAL_SETTINGS.address,
            status: 'active',
            subscription: {
              planId: 'enterprise-pro',
              planName: 'Enterprise Pro',
              status: 'active',
              billingCycle: 'yearly',
              pricePaid: 0,
              startDate: new Date().toISOString(),
              expiryDate: new Date(Date.now() + 365 * 86400000).toISOString(),
            },
            usage: { productsCount: 8, ordersCount: 0, storageBytes: 0, staffCount: 1 },
            createdAt: new Date().toISOString(),
          });
          setSettings(INITIAL_SETTINGS);
          setPlan(DEFAULT_SUBSCRIPTION_PLANS[2]);
          setLoading(false);
          return;
        }
        setShop(null);
        setNotFound(true);
        setLoading(false);
        return;
      }

      const [shopSettings, plans] = await Promise.all([
        getShopSettings(resolvedShop.id),
        getSubscriptionPlans(),
      ]);

      setShop(resolvedShop);
      setSettings(shopSettings);
      const matchedPlan =
        plans.find((p) => p.id === resolvedShop.subscription?.planId) ||
        DEFAULT_SUBSCRIPTION_PLANS[0];
      setPlan(matchedPlan);
    } catch (err) {
      console.warn('Tenant resolution note:', err);
    } finally {
      setLoading(false);
    }
  }, [targetSlug, shopIdOverride]);

  useEffect(() => {
    loadTenant();
  }, [loadTenant]);

  const effectiveShopId = shop?.id || targetSlug;
  const effectiveSlug = shop?.slug || targetSlug;
  const isSuspended = shop ? shop.status === 'suspended' || shop.status === 'inactive' : false;
  const isExpired = shop?.subscription?.expiryDate
    ? shop.subscription.status === 'expired' || new Date(shop.subscription.expiryDate) < new Date()
    : false;

  return (
    <TenantContext.Provider
      value={{
        shopId: effectiveShopId,
        shopSlug: effectiveSlug,
        shop,
        settings,
        plan,
        loading,
        notFound,
        isSuspended,
        isExpired,
        storeBasePath: `/s/${effectiveSlug}`,
        refreshTenant: loadTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    // Safe fallback for legacy standalone render contexts
    return {
      shopId: DEFAULT_SHOP_ID,
      shopSlug: DEFAULT_SHOP_ID,
      shop: null,
      settings: INITIAL_SETTINGS,
      plan: DEFAULT_SUBSCRIPTION_PLANS[2],
      loading: false,
      notFound: false,
      isSuspended: false,
      isExpired: false,
      storeBasePath: `/s/${DEFAULT_SHOP_ID}`,
      refreshTenant: async () => {},
    } as TenantContextType;
  }
  return ctx;
};
