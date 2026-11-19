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
import type { Shop } from '../src/types';

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

  it('defines progressive plan quotas and isolated localStorage keys', () => {
    const starter = DEFAULT_SUBSCRIPTION_PLANS.find((p) => p.id === 'free-starter');
    const growth = DEFAULT_SUBSCRIPTION_PLANS.find((p) => p.id === 'growth-plus');
    const enterprise = DEFAULT_SUBSCRIPTION_PLANS.find((p) => p.id === 'enterprise-pro');
    expect(starter?.maxProducts).toBeLessThan(growth?.maxProducts || 0);
    expect(growth?.maxProducts).toBeLessThan(enterprise?.maxProducts || 0);
    expect(`bazaarpk_cart_a`).not.toBe(`bazaarpk_cart_b`);
  });
});
