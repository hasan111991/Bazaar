// Architecture ready for English (default) and future Urdu (ur) RTL localization

export type AppLocale = 'en' | 'ur';

const DICTIONARY: Record<AppLocale, Record<string, string>> = {
  en: {
    'nav.overview': 'Overview',
    'nav.pos': 'POS & Billing',
    'nav.products': 'Products',
    'nav.categories': 'Categories',
    'nav.inventory': 'Inventory',
    'nav.purchases': 'Purchases',
    'nav.suppliers': 'Suppliers',
    'nav.customers': 'Customers',
    'nav.khata': 'Khata / Credit Ledger',
    'nav.orders': 'Orders',
    'nav.coupons': 'Coupons',
    'nav.banners': 'Banners',
    'nav.appearance': 'Online Store',
    'nav.reports': 'Reports',
    'nav.staff': 'Staff',
    'nav.subscription': 'Subscription',
    'nav.settings': 'Settings',
    'nav.profile': 'Profile',
    'limit.free_1_product':
      'Your Free Plan allows only 1 active product. Upgrade to Starter to add up to 50 products.',
  },
  ur: {
    'nav.overview': 'جائزہ',
    'nav.pos': 'پوائنٹ آف سیل / بلنگ',
    'nav.products': 'مصنوعات',
    'nav.categories': 'کیٹیگریز',
    'nav.inventory': 'اسٹاک / انوینٹری',
    'nav.purchases': 'خریداری',
    'nav.suppliers': 'سپلائرز',
    'nav.customers': 'گاہک',
    'nav.khata': 'کھاتہ / ادھار لیجر',
    'nav.orders': 'آرڈرز',
    'nav.coupons': 'کوپنز',
    'nav.banners': 'بینرز',
    'nav.appearance': 'آن لائن اسٹور',
    'nav.reports': 'رپورٹس',
    'nav.staff': 'عملہ',
    'nav.subscription': 'سبسکرپشن',
    'nav.settings': 'سیٹنگز',
    'nav.profile': 'پروفائل',
    'limit.free_1_product':
      'آپ کے مفت پلان میں صرف 1 فعال پروڈکٹ کی اجازت ہے۔ 50 تک مصنوعات کے لیے اسٹارٹر پلان پر اپ گریڈ کریں۔',
  },
};

export function getStoredLocale(): AppLocale {
  if (typeof window === 'undefined') return 'en';
  const saved = window.localStorage.getItem('bazaarpk_locale');
  return saved === 'ur' ? 'ur' : 'en';
}

export function t(key: string, locale: AppLocale = getStoredLocale()): string {
  return DICTIONARY[locale]?.[key] || DICTIONARY.en[key] || key;
}
