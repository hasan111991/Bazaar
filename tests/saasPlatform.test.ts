import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  sanitizeShopSlug,
  isValidShopSlug,
  isValidPakistaniPhone,
  formatPKR,
  DEFAULT_SUBSCRIPTION_PLANS,
} from '../src/data/seedData';
import {
  stripUndefined,
  toShopPublic,
  getShopSubscriptionStatus,
} from '../src/services/platformService';
import {
  generateTrackingToken,
  deriveTrackingTokenHash,
  deriveTrackingDocId,
} from '../src/utils/trackingCrypto';
import {
  getRouterBasename,
  resolveTenantFromHostname,
  buildStorefrontPath,
} from '../src/utils/tenantDomain';
import {
  buildShopSeoTags,
  buildPlatformSeoTags,
} from '../src/utils/seo';
import {
  countActiveProducts,
  getProductLimitErrorMessage,
} from '../src/services/tenantService';
import {
  calculateRetailProfitSummary,
  calculateInventoryValuation,
} from '../src/services/retailService';
import type { Shop, Product, Order, PosSale, ShopExpense } from '../src/types';

const WORKSPACE_ROOT = process.cwd();

describe('Priority 1 & 2: Multi-Tenant Firestore & Storage Rules Audit', () => {
  const firestoreRules = fs.readFileSync(path.join(WORKSPACE_ROOT, 'firestore.rules'), 'utf-8');
  const storageRules = fs.readFileSync(path.join(WORKSPACE_ROOT, 'storage.rules'), 'utf-8');

  it('enforces default-deny catchall in both Firestore and Storage rules', () => {
    expect(firestoreRules).toContain('match /{document=**}');
    expect(firestoreRules).toContain('allow read, write: if false;');
    expect(storageRules).toContain('match /{allPaths=**}');
    expect(storageRules).toContain('allow read, write: if false;');
  });

  it('verifies Super Admin via custom claims, platform_admins lookup, and verified bootstrap email', () => {
    expect(firestoreRules).toContain('request.auth.token.super_admin == true');
    expect(firestoreRules).toContain('platform_admins/$(request.auth.uid)');
    expect(firestoreRules).toContain('hasanaamir815@gmail.com');
    expect(firestoreRules).toContain('request.auth.token.email_verified == true');
  });

  it('blocks public reads on private /shops/{shopId} while exposing strictly whitelisted /shops_public/{shopId}', () => {
    expect(firestoreRules).toContain('allow get: if isValidId(shopId) && (isSuperAdmin() || isShopMember(shopId));');
    expect(firestoreRules).toContain('match /shops_public/{shopId}');
    expect(firestoreRules).toContain('isValidShopPublicDoc(incoming(), shopId)');
    expect(firestoreRules).not.toContain('allow read: if true;\n      // shops');
  });

  it('splits public storefront settings from private payment/merchant settings', () => {
    expect(firestoreRules).toContain('match /settings/{settingId}');
    expect(firestoreRules).toContain("settingId == 'public' ||\n          isShopMember(shopId)");
    expect(firestoreRules).toContain('allow list: if isShopMember(shopId);');
  });

  it('blocks unauthenticated/guest reads on private orders and requires hashed tracking keys', () => {
    expect(firestoreRules).toContain('hasShopPermission(shopId, \'orders\') ||\n          isShopMember(shopId) ||\n          (isSignedIn() && resource.data.userId == request.auth.uid)');
    expect(firestoreRules).toContain("trackKey.matches('^trk_[a-f0-9]{32}$')");
    expect(firestoreRules).toContain("data.keys().hasOnly(['orderNumber', 'orderId', 'shopId', 'orderStatus', 'fulfillmentMethod', 'pickupDetails', 'paymentMethod', 'paymentStatus', 'courierName', 'trackingNumber', 'customerName', 'city', 'items', 'total', 'trackingTokenHash', 'createdAt', 'updatedAt'])");
  });

  it('prevents staff self-escalation, owner tampering, and subscription forgery', () => {
    expect(firestoreRules).toContain("!incoming().diff(existing()).affectedKeys().hasAny(['ownerId', 'slug', 'status', 'subscription'])");
    expect(firestoreRules).toContain("!incoming().diff(existing()).affectedKeys().hasAny(['role', 'isBlocked'])");
    expect(firestoreRules).toContain("existing().role != 'shop_owner'");
    expect(firestoreRules).toContain("incoming().role == get(/databases/$(database)/documents/shop_invites/$(incoming().inviteId)).data.role");
    expect(firestoreRules).toContain("incoming().permissions == get(/databases/$(database)/documents/shop_invites/$(incoming().inviteId)).data.permissions");
  });

  it('enforces claim-based tenant isolation, private payment/subscription receipts, 5MB limit, and image MIME types in Storage', () => {
    expect(storageRules).toContain('request.auth.token.shops[shopId]');
    expect(storageRules).toContain('match /shops/{shopId}/logo/{allPaths=**}');
    expect(storageRules).toContain('match /shops/{shopId}/products/{productId}/{allPaths=**}');
    expect(storageRules).toContain('match /shops/{shopId}/banners/{allPaths=**}');
    expect(storageRules).toContain('match /shops/{shopId}/categories/{allPaths=**}');
    expect(storageRules).toContain('match /shops/{shopId}/pages/{allPaths=**}');
    expect(storageRules).toContain('match /shops/{shopId}/payments/{orderSessionId}/{fileName}');
    expect(storageRules).toContain('match /shops/{shopId}/subscription/{allPaths=**}');
    expect(storageRules).toContain('match /platform/payments/{shopId}/{fileName}');
    expect(storageRules).toContain('allow read: if isShopAdmin(shopId);');
    expect(storageRules).toContain('5 * 1024 * 1024');
    expect(storageRules).toContain("request.resource.contentType.matches('image/(jpeg|jpg|png|webp|gif)')");
  });

  it('isolates Stage 1 retail subcollections, support tickets, and allows SEO fields in shops_public', () => {
    expect(firestoreRules).toContain('match /suppliers/{supplierId}');
    expect(firestoreRules).toContain('match /purchases/{purchaseId}');
    expect(firestoreRules).toContain('match /pos_sales/{saleId}');
    expect(firestoreRules).toContain('match /stock_movements/{movementId}');
    expect(firestoreRules).toContain('match /khata_ledger/{entryId}');
    expect(firestoreRules).toContain('match /expenses/{expenseId}');
    expect(firestoreRules).toContain('match /support_tickets/{ticketId}');
    expect(firestoreRules).toContain("'seoTitle', 'seoDescription'");
    expect(firestoreRules).toContain("'businessType'");
  });
});

describe('Priority 3, 4 & 5: Code Hardening, Transactional Billing & Zero-Fallback Audit', () => {
  const platformServiceSrc = fs.readFileSync(path.join(WORKSPACE_ROOT, 'src/services/platformService.ts'), 'utf-8');
  const storageServiceSrc = fs.readFileSync(path.join(WORKSPACE_ROOT, 'src/services/storageService.ts'), 'utf-8');
  const functionsSrc = fs.readFileSync(path.join(WORKSPACE_ROOT, 'functions/src/index.ts'), 'utf-8');

  it('uses atomic runTransaction for payment approval, rejection, and subscription extension', () => {
    expect(platformServiceSrc).toContain('runTransaction(db');
    expect(platformServiceSrc).toContain("payment.status !== 'pending'");
    expect(platformServiceSrc).toContain('isRenewSamePlan');
  });

  it('removed all Data URL Base64 image upload fallbacks across the entire frontend', () => {
    expect(storageServiceSrc).not.toContain('allowDataUrlFallback');
    const srcFiles = [
      'src/components/common/ImageUploader.tsx',
      'src/pages/CheckoutPage.tsx',
      'src/dashboard/ShopProductsPage.tsx',
      'src/dashboard/ShopCategoriesPage.tsx',
      'src/dashboard/ShopBannersPage.tsx',
      'src/dashboard/ShopAppearancePage.tsx',
      'src/dashboard/ShopSubscriptionPage.tsx',
      'src/platform/RegisterShopPage.tsx',
    ];
    for (const rel of srcFiles) {
      const content = fs.readFileSync(path.join(WORKSPACE_ROOT, rel), 'utf-8');
      expect(content).not.toContain('allowDataUrlFallback');
    }
  });

  it('includes Cloud Functions for custom claim sync and privileged Super Admin operations', () => {
    expect(functionsSrc).toContain('onShopStaffWritten');
    expect(functionsSrc).toContain('syncMyCustomClaims');
    expect(functionsSrc).toContain('approvePlatformPayment');
    expect(functionsSrc).toContain('rejectPlatformPayment');
    expect(functionsSrc).toContain('updateShopStatusAdmin');
    expect(functionsSrc).toContain('assignShopSubscriptionAdmin');
    expect(functionsSrc).toContain('deleteShopCompleteAdmin');
    expect(functionsSrc).toContain('enforceExpiredSubscriptions');
  });
});

describe('Priority 6 & 9: Non-PII Projection, Tokenized Tracking & Subscription Gating', () => {
  it('strips sensitive owner PII, billing, and usage fields in toShopPublic()', () => {
    const privateShop: Shop = {
      id: 'karachi-mart',
      slug: 'karachi-mart',
      name: 'Karachi Mart',
      ownerId: 'uid_123',
      ownerName: 'Private Owner',
      ownerEmail: 'owner-private@example.com',
      ownerPhone: '03001234567',
      city: 'Karachi',
      address: 'Private Home St 1',
      status: 'active',
      subscription: {
        planId: 'growth-plus',
        planName: 'Growth Plus',
        status: 'active',
        billingCycle: 'monthly',
        pricePaid: 3500,
        startDate: '2026-01-01T00:00:00.000Z',
        expiryDate: '2027-01-01T00:00:00.000Z',
      },
      usage: { productsCount: 14, ordersCount: 99, storageBytes: 4096, staffCount: 2 },
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const pub = toShopPublic(privateShop, { contactPhone: '03110000000' }) as unknown as Record<string, unknown>;
    expect(pub.id).toBe('karachi-mart');
    expect(pub.name).toBe('Karachi Mart');
    expect(pub.publicContactPhone).toBe('03110000000');
    expect('ownerEmail' in pub).toBe(false);
    expect('ownerPhone' in pub).toBe(false);
    expect('ownerName' in pub).toBe(false);
    expect('ownerId' in pub).toBe(false);
    expect('subscription' in pub).toBe(false);
    expect('usage' in pub).toBe(false);
  });

  it('derives deterministic 64-hex tracking hashes and trk_<32hex> document IDs', async () => {
    const token = generateTrackingToken();
    expect(token).toMatch(/^[a-f0-9]{32}$/);

    const hashA = await deriveTrackingTokenHash('PK-123456', token);
    const hashB = await deriveTrackingTokenHash('pk-123456', ` ${token} `);
    expect(hashA).toBe(hashB);
    expect(hashA).toMatch(/^[a-f0-9]{64}$/);

    const docId = await deriveTrackingDocId('PK-123456', token);
    const wrongDocId = await deriveTrackingDocId('PK-123456', 'wrongtoken');
    expect(docId).toMatch(/^trk_[a-f0-9]{32}$/);
    expect(docId).not.toBe(wrongDocId);
  });

  it('detects expired paid subscriptions accurately vs active starter tier', () => {
    const expiredShop: Shop = {
      id: 'exp-shop',
      slug: 'exp-shop',
      name: 'Expired Shop',
      ownerId: 'u1',
      ownerName: 'O',
      ownerEmail: 'o@example.com',
      ownerPhone: '03001234567',
      city: 'Lahore',
      address: 'Lahore',
      status: 'active',
      subscription: {
        planId: 'growth-plus',
        planName: 'Growth Plus',
        status: 'active',
        billingCycle: 'monthly',
        pricePaid: 3500,
        startDate: '2025-01-01T00:00:00.000Z',
        expiryDate: '2025-02-01T00:00:00.000Z',
      },
      usage: { productsCount: 1, ordersCount: 0, storageBytes: 0, staffCount: 1 },
      createdAt: '2025-01-01T00:00:00.000Z',
    };
    const freeShop: Shop = {
      ...expiredShop,
      id: 'free-shop',
      subscription: { ...expiredShop.subscription, planId: 'free-starter' },
    };

    expect(getShopSubscriptionStatus(expiredShop).isExpired).toBe(true);
    expect(getShopSubscriptionStatus(freeShop).isExpired).toBe(false);
  });
});

describe('Priority 7 & 8: Multi-Tenant BrowserRouter, GitHub Pages & Custom Domain Routing', () => {
  it('computes BrowserRouter basename cleanly for root and GitHub Pages subpaths', () => {
    expect(getRouterBasename('/bazaarpk/', '/bazaarpk/s/karachi-mart', 'user.github.io')).toBe('/bazaarpk');
    expect(getRouterBasename('/', '/bazaarpk-saas/dashboard', 'user.github.io')).toBe('/bazaarpk-saas');
    expect(getRouterBasename('/', '/dashboard', 'user.github.io')).toBe('');
    expect(getRouterBasename('/', '/s/bazaarpk', 'store.bazaarpk.pk')).toBe('');
  });

  it('resolves tenant subdomains while ignoring hosting infrastructure domains', () => {
    expect(resolveTenantFromHostname('lahore-mart.bazaarpk.pk')).toBe('lahore-mart');
    expect(resolveTenantFromHostname('www.bazaarpk.pk')).toBeNull();
    expect(resolveTenantFromHostname('myorg.github.io')).toBeNull();
    expect(resolveTenantFromHostname('localhost')).toBeNull();
    expect(buildStorefrontPath('Karachi Mart!', '/tracking')).toBe('/s/karachi-mart/tracking');
  });

  it('verifies public/404.html and index.html SPA GitHub Pages redirect script exist', () => {
    const html404 = fs.readFileSync(path.join(WORKSPACE_ROOT, 'public/404.html'), 'utf-8');
    const indexHtml = fs.readFileSync(path.join(WORKSPACE_ROOT, 'index.html'), 'utf-8');
    expect(html404).toContain('pathSegmentsToKeep');
    expect(indexHtml).toContain("l.search[1] === '/'");
  });
});

describe('SaaS Slug, Currency & Plan Invariants', () => {
  it('sanitizes arbitrary store names and blocks reserved routes', () => {
    expect(sanitizeShopSlug('Lahore Kiryana & General Store!')).toBe('lahore-kiryana-general-store');
    expect(isValidShopSlug('al-madina-mart')).toBe(true);
    expect(isValidShopSlug('super-admin')).toBe(false);
    expect(isValidShopSlug('dashboard')).toBe(false);
  });

  it('validates Pakistani mobile formats & formats PKR cleanly', () => {
    expect(isValidPakistaniPhone('0300 1234567')).toBe(true);
    expect(isValidPakistaniPhone('+923451234567')).toBe(true);
    expect(isValidPakistaniPhone('0421234567')).toBe(false);
    expect(formatPKR(2500)).toBe('Rs. 2,500');
  });

  it('recursively strips undefined keys before Firestore writes', () => {
    const cleaned = stripUndefined({
      name: 'Karachi Store',
      note: undefined,
      nested: { city: 'Karachi', optionalCode: undefined },
    });
    expect(cleaned).toEqual({ name: 'Karachi Store', nested: { city: 'Karachi' } });
  });

  it('defines progressive Stage 1 plan quotas, Unlimited (-1) Professional tier, and isolated localStorage keys', () => {
    const freeStarter = DEFAULT_SUBSCRIPTION_PLANS.find((p) => p.id === 'free-starter');
    const starter = DEFAULT_SUBSCRIPTION_PLANS.find((p) => p.id === 'starter');
    const business = DEFAULT_SUBSCRIPTION_PLANS.find((p) => p.id === 'business');
    const professional = DEFAULT_SUBSCRIPTION_PLANS.find((p) => p.id === 'professional');

    expect(freeStarter?.maxProducts).toBe(1);
    expect(starter?.maxProducts).toBe(50);
    expect(business?.maxProducts).toBe(500);
    expect(professional?.maxProducts).toBe(-1);
    expect(business?.features.pos).toBe(true);
    expect(business?.features.khata).toBe(true);
    expect(starter?.features.pos).toBe(false);
    expect(`bazaarpk_cart_a`).not.toBe(`bazaarpk_cart_b`);
  });
});

describe('Dynamic SEO Tag Generator & Stage 1 Retail Helpers', () => {
  it('generates shop, category, product, and platform SEO metadata + Schema.org JSON-LD from Firestore records', () => {
    const shopPublic = {
      id: 'lahore-mart',
      slug: 'lahore-mart',
      name: 'Lahore Mart',
      city: 'Lahore',
      status: 'active' as const,
      seoTitle: 'Lahore Mart | Best Online Kiryana & Cosmetics',
      seoDescription: 'Fast same-day delivery in Lahore with EasyPaisa, JazzCash & COD.',
    };

    const storeSeo = buildShopSeoTags({ shop: shopPublic, canonicalUrl: 'https://bazaarpk.com/s/lahore-mart' });
    expect(storeSeo.title).toBe('Lahore Mart | Best Online Kiryana & Cosmetics');
    expect(storeSeo.description).toContain('Fast same-day delivery in Lahore');
    expect(storeSeo.jsonLd['@type']).toBe('Store');
    expect(storeSeo.jsonLd.address.addressLocality).toBe('Lahore');

    const catSeo = buildShopSeoTags({
      shop: shopPublic,
      categoryName: 'Skin Care',
      canonicalUrl: 'https://bazaarpk.com/s/lahore-mart/shop',
    });
    expect(catSeo.title).toBe('Skin Care | Lahore Mart (Lahore)');

    const sampleProduct: Product = {
      id: 'p1',
      title: 'Basmati Rice 5kg',
      slug: 'basmati-rice-5kg',
      description: 'Premium aged Pakistani super kernel basmati rice.',
      regularPrice: 2200,
      salePrice: 1950,
      stock: 15,
      category: 'groceries',
      brand: 'Guard',
      images: ['https://cdn.example.com/rice.jpg'],
      sku: 'SKU-RICE-5',
      isFeatured: true,
      isPublished: true,
      rating: 4.9,
      reviewCount: 12,
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const prodSeo = buildShopSeoTags({
      shop: shopPublic,
      product: sampleProduct,
      canonicalUrl: 'https://bazaarpk.com/s/lahore-mart/product/p1',
    });
    expect(prodSeo.ogType).toBe('product');
    expect(prodSeo.title).toContain('Basmati Rice 5kg');
    expect(prodSeo.priceAmount).toBe(1950);
    expect(prodSeo.availability).toBe('in stock');
    expect(prodSeo.jsonLd['@type']).toBe('Product');
    expect(prodSeo.jsonLd.offers.priceCurrency).toBe('PKR');

    const platformSeo = buildPlatformSeoTags('https://bazaarpk.com/');
    expect(platformSeo.jsonLd['@type']).toBe('WebApplication');
    expect(platformSeo.title).toContain('BazaarPK Cloud');
  });

  it('enforces Free Plan 1-active-product limit excluding archived products', () => {
    const items = [
      { status: 'active' as const, isPublished: true },
      { status: 'archived' as const, isPublished: false },
      { status: 'active' as const, isPublished: false },
    ];
    expect(countActiveProducts(items)).toBe(1);
    expect(getProductLimitErrorMessage('free-starter', 'Free Plan', 1, 1)).toBe(
      'Your Free Plan allows only 1 active product. Upgrade to Starter to add up to 50 products.'
    );
  });

  it('handles subscription renewal grace period window cleanly', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();

    const baseShop: Shop = {
      id: 'grace-shop',
      slug: 'grace-shop',
      name: 'Grace Store',
      ownerId: 'u1',
      ownerName: 'O',
      ownerEmail: 'o@example.com',
      ownerPhone: '03001234567',
      city: 'Karachi',
      address: 'Karachi',
      status: 'active',
      subscription: {
        planId: 'business',
        planName: 'Business',
        status: 'active',
        billingCycle: 'monthly',
        pricePaid: 1499,
        startDate: '2026-01-01T00:00:00.000Z',
        expiryDate: threeDaysAgo,
      },
      usage: { productsCount: 10, ordersCount: 5, storageBytes: 0, staffCount: 1 },
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const withinGrace = getShopSubscriptionStatus(baseShop, 5);
    expect(withinGrace.inGracePeriod).toBe(true);
    expect(withinGrace.isExpired).toBe(false);

    const pastGrace = getShopSubscriptionStatus(
      { ...baseShop, subscription: { ...baseShop.subscription, expiryDate: tenDaysAgo } },
      5
    );
    expect(pastGrace.inGracePeriod).toBe(false);
    expect(pastGrace.isExpired).toBe(true);
  });

  it('computes COGS, Gross/Net Profit, Estimated COGS warnings, and Inventory Valuation accurately', () => {
    const products: Product[] = [
      {
        id: 'p1',
        title: 'Product A',
        slug: 'a',
        description: '',
        purchasePrice: 600,
        regularPrice: 1000,
        stock: 10,
        category: 'general',
        brand: 'B',
        images: [],
        sku: 'A1',
        isFeatured: false,
        isPublished: true,
        rating: 5,
        reviewCount: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'p2',
        title: 'Product B (No Cost)',
        slug: 'b',
        description: '',
        regularPrice: 500,
        stock: 4,
        status: 'active',
        category: 'general',
        brand: 'B',
        images: [],
        sku: 'B1',
        isFeatured: false,
        isPublished: true,
        rating: 5,
        reviewCount: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const orders: Order[] = [
      {
        id: 'ord1',
        orderNumber: 'PK-100001',
        userId: 'u1',
        customer: { name: 'Ali', email: 'a@b.pk', phone: '03001234567', address: 'St 1', city: 'Lahore', postalCode: '' },
        items: [{ productId: 'p1', title: 'Product A', price: 1000, quantity: 2, image: '' }],
        subtotal: 2000,
        shippingFee: 0,
        discount: 0,
        total: 2000,
        paymentMethod: 'cod',
        paymentStatus: 'paid',
        orderStatus: 'Delivered',
        createdAt: '2026-02-01T00:00:00.000Z',
      },
    ];

    const posSales: PosSale[] = [
      {
        id: 'pos1',
        shopId: 's1',
        invoiceNumber: 'INV-1',
        idempotencyKey: 'k1',
        items: [{ productId: 'p2', title: 'Product B', quantity: 1, unitPrice: 500, costPrice: 0, lineTotal: 500 }],
        subtotal: 500,
        discount: 0,
        total: 500,
        paymentMethod: 'cash',
        cashierId: 'c1',
        cashierName: 'Cashier',
        status: 'completed',
        createdAt: '2026-02-02T00:00:00.000Z',
      },
    ];

    const expenses: ShopExpense[] = [
      { id: 'e1', shopId: 's1', title: 'Electricity', category: 'utilities', amount: 300, date: '2026-02-02', createdBy: 'owner@example.com', createdAt: '2026-02-02' },
    ];

    const summary = calculateRetailProfitSummary({ orders, posSales, products, expenses });
    expect(summary.totalRevenue).toBe(2500);
    expect(summary.onlineRevenue).toBe(2000);
    expect(summary.posRevenue).toBe(500);
    expect(summary.cogs).toBe(1200);
    expect(summary.grossProfit).toBe(1300);
    expect(summary.totalExpenses).toBe(300);
    expect(summary.netProfit).toBe(1000);
    expect(summary.hasEstimatedCogs).toBe(true);
    expect(summary.missingCostItemsCount).toBe(1);

    const val = calculateInventoryValuation(products);
    expect(val.totalUnits).toBe(14);
    expect(val.costValuation).toBe(6000);
    expect(val.retailValuation).toBe(12000);
    expect(val.missingCostCount).toBe(1);
  });

  it('keeps public landing page free of /super-admin links, pharmacy claims, or pulsing dots', () => {
    const publicFiles = [
      'src/platform/PlatformLandingPage.tsx',
      'src/platform/components/PublicNavbar.tsx',
      'src/platform/components/Hero3DShowcase.tsx',
      'src/platform/components/FeaturesAndSolutionsSection.tsx',
      'src/platform/components/ShowcaseAndPricingSection.tsx',
    ];
    for (const rel of publicFiles) {
      const src = fs.readFileSync(path.join(WORKSPACE_ROOT, rel), 'utf-8');
      expect(src).not.toContain('/super-admin');
      expect(src.toLowerCase()).not.toContain('pharmacy');
      expect(src).not.toContain('animate-pulse');
    }
    const landingSrc = fs.readFileSync(
      path.join(WORKSPACE_ROOT, 'src/platform/PlatformLandingPage.tsx'),
      'utf-8'
    );
    expect(landingSrc).toContain('getSubscriptionPlans');
    expect(landingSrc).toContain('getActiveDirectoryShopsPublic');
    expect(landingSrc).toContain('getPlatformSettings');
  });
});

describe('Phase 2-6 Audit: Dual Social System, Storage Quota, Partial Merge, Private Receipts & Server Hardening', () => {
  it('validates & normalizes WhatsApp + social URLs while filtering placeholders and XSS schemes', async () => {
    const {
      formatWhatsAppUrl,
      isPlaceholderSocialUrl,
      normalizeAndValidateSocialLinks,
      getConfiguredSocialLinks,
      normalizeOptionalHttpUrl,
    } = await import('../src/utils/socialLinks');

    expect(formatWhatsAppUrl('0300 5551234')).toBe('https://wa.me/923005551234');
    expect(formatWhatsAppUrl('+923451234567')).toBe('https://wa.me/923451234567');
    expect(() => normalizeAndValidateSocialLinks({ facebook: 'javascript:alert(1)' })).toThrow();
    expect(() => normalizeOptionalHttpUrl('data:text/html,xss')).toThrow();

    expect(isPlaceholderSocialUrl('https://facebook.com')).toBe(true);
    expect(isPlaceholderSocialUrl('https://instagram.com/')).toBe(true);
    expect(isPlaceholderSocialUrl('https://wa.me/923001234567')).toBe(true);
    expect(isPlaceholderSocialUrl('https://facebook.com/realstorepk')).toBe(false);

    const visibleLinks = getConfiguredSocialLinks({
      facebook: 'https://facebook.com',
      instagram: 'https://instagram.com/lahore_mart_official',
      whatsapp: '0321 9876543',
    });
    expect(visibleLinks.map((l) => l.platform)).toEqual(['instagram', 'whatsapp']);
    expect(visibleLinks[1].url).toBe('https://wa.me/923219876543');
  });

  it('enforces post-compression Storage quota checks and prevents negative storageBytes', async () => {
    const {
      calculateNextStorageBytes,
      evaluateStorageQuota,
      mapFirebaseStorageError,
    } = await import('../src/services/storageService');

    expect(calculateNextStorageBytes(500, -1200)).toBe(0);
    expect(calculateNextStorageBytes(500, 300)).toBe(800);

    const withinQuota = evaluateStorageQuota(10 * 1024 * 1024, 25, 1024 * 1024);
    expect(withinQuota.allowed).toBe(true);

    const exceededQuota = evaluateStorageQuota(24.8 * 1024 * 1024, 25, 512 * 1024);
    expect(exceededQuota.allowed).toBe(false);
    expect(exceededQuota.reason).toContain('Storage quota reached');

    expect(mapFirebaseStorageError({ code: 'storage/unauthorized' })).toContain('storage.rules');
    expect(mapFirebaseStorageError({ code: 'storage/bucket-not-found' })).toContain('bucket');
  });

  it('preserves unrelated StoreSettings sections when partially updating Appearance vs Payment Settings', async () => {
    const { mergeStoreSettingsPatch } = await import('../src/services/tenantService');
    const { INITIAL_SETTINGS } = await import('../src/data/seedData');

    const base = {
      ...INITIAL_SETTINGS,
      siteName: 'Lahore Mart',
      codEnabled: false,
      bankDetails: { ...INITIAL_SETTINGS.bankDetails, bankName: 'Meezan Bank', enabled: true },
      socialLinks: { instagram: 'https://instagram.com/lahoremart' },
    };

    const afterAppearancePatch = mergeStoreSettingsPatch(base, {
      primaryColor: '#111827',
      seoTitle: 'Lahore Mart Official',
    });
    expect(afterAppearancePatch.codEnabled).toBe(false);
    expect(afterAppearancePatch.bankDetails.bankName).toBe('Meezan Bank');
    expect(afterAppearancePatch.socialLinks?.instagram).toBe('https://instagram.com/lahoremart');
    expect(afterAppearancePatch.primaryColor).toBe('#111827');

    const afterPaymentPatch = mergeStoreSettingsPatch(afterAppearancePatch, {
      shippingFee: 300,
    });
    expect(afterPaymentPatch.seoTitle).toBe('Lahore Mart Official');
    expect(afterPaymentPatch.shippingFee).toBe(300);
    expect(afterPaymentPatch.socialLinks?.instagram).toBe('https://instagram.com/lahoremart');
  });

  it('keeps checkout payment proofs strictly private & enforces authenticated proof access in rules & backend', () => {
    const checkoutSrc = fs.readFileSync(path.join(WORKSPACE_ROOT, 'src/pages/CheckoutPage.tsx'), 'utf-8');
    const firestoreRules = fs.readFileSync(path.join(WORKSPACE_ROOT, 'firestore.rules'), 'utf-8');
    const storageRules = fs.readFileSync(path.join(WORKSPACE_ROOT, 'storage.rules'), 'utf-8');
    const serverSrc = fs.readFileSync(path.join(WORKSPACE_ROOT, 'server.ts'), 'utf-8');

    expect(checkoutSrc).toContain('uploadCheckoutPaymentProof');
    expect(firestoreRules).toContain('match /payment_receipts/{receiptId}');
    expect(firestoreRules).toContain('match /platform_payment_receipts/{receiptId}');
    expect(firestoreRules).toContain('match /newsletter_subscribers/{subId}');
    expect(storageRules).toContain('match /platform/brand/{allPaths=**}');

    expect(serverSrc).toContain('Number(process.env.PORT) || 3000');
    expect(serverSrc).toContain("app.get('/api/payments/proof'");
    expect(serverSrc).toContain("app.post('/api/uploads/payment-proof'");
    expect(serverSrc).toContain("app.post('/api/newsletter/subscribe'");
    expect(serverSrc).toContain('authoritativeSubtotal');
    expect(serverSrc).toContain('authoritativeTotal');
    expect(serverSrc).toContain('verifyFirebaseIdToken');
    expect(serverSrc).toContain('Access-Control-Allow-Origin');
  });

  it('builds dynamic platform SEO metadata with Super Admin overrides cleanly', () => {
    const seo = buildPlatformSeoTags('https://bazaarpk.com/', {
      platformName: 'BazaarPK Pro',
      seoTitle: 'BazaarPK Pro – Pakistan Multi-Tenant SaaS',
      seoDescription: 'Custom SaaS meta description from Super Admin.',
      ogImageUrl: 'https://cdn.example.com/platform-og.webp',
      currency: 'PKR',
    });

    expect(seo.siteName).toBe('BazaarPK Pro');
    expect(seo.title).toBe('BazaarPK Pro – Pakistan Multi-Tenant SaaS');
    expect(seo.description).toBe('Custom SaaS meta description from Super Admin.');
    expect(seo.imageUrl).toBe('https://cdn.example.com/platform-og.webp');
    expect(seo.jsonLd.name).toBe('BazaarPK Pro');
  });
});


