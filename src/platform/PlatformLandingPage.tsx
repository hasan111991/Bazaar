import React, { useEffect, useState } from 'react';
import { PlatformSettings, SubscriptionPlan, ShopPublic } from '../types';
import { DEFAULT_PLATFORM_SETTINGS, DEFAULT_SUBSCRIPTION_PLANS } from '../data/seedData';
import {
  getSubscriptionPlans,
  getActiveDirectoryShopsPublic,
  getPlatformSettings,
} from '../services/platformService';
import { DynamicSeoHead } from '../components/common/DynamicSeoHead';
import { PublicNavbar } from './components/PublicNavbar';
import { Hero3DShowcase } from './components/Hero3DShowcase';
import { FeaturesAndSolutionsSection } from './components/FeaturesAndSolutionsSection';
import { ShowcaseAndPricingSection } from './components/ShowcaseAndPricingSection';

export const PlatformLandingPage: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(() =>
    DEFAULT_SUBSCRIPTION_PLANS.filter((p) => p.isActive)
  );
  const [shops, setShops] = useState<ShopPublic[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);

  useEffect(() => {
    let active = true;
    getSubscriptionPlans(true)
      .then((loaded) => {
        if (active && loaded.length > 0) setPlans(loaded);
      })
      .catch(() => {});

    getActiveDirectoryShopsPublic()
      .then((loadedShops) => {
        if (active) setShops(loadedShops);
      })
      .catch(() => {});

    getPlatformSettings()
      .then((stg) => {
        if (active) setPlatformSettings(stg);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#070B19] text-slate-900 flex flex-col">
      <DynamicSeoHead mode="platform" platformSettings={platformSettings} />
      <PublicNavbar platformSettings={platformSettings} />
      <main className="flex-1">
        <Hero3DShowcase announcement={platformSettings.announcement} />
        <FeaturesAndSolutionsSection />
        <ShowcaseAndPricingSection
          plans={plans}
          shops={shops}
          platformSettings={platformSettings}
        />
      </main>
    </div>
  );
};
