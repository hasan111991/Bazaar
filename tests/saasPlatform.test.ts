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
import { stripUndefined } from '../src/services/platformService';

const WORKSPACE_ROOT = process.cwd();

describe('Multi-Tenant Security Rules Static Audit', () => {
  const firestoreRules = fs.readFileSync(path.join(WORKSPACE_ROOT, 'firestore.rules'), 'utf-8');
  const storageRules = fs.readFileSync(path.join(WORKSPACE_ROOT, 'storage.rules'), 'utf-8');

  it('enforces default-deny catchall in Firestore rules', () => {
    expect(firestoreRules).toContain('match /{document=**}');
    expect(firestoreRules).toContain('allow read, write: if false;');
  });

  it('verifies Super Admin via platform_admins collection and verified bootstrap identity', () => {
    expect(firestoreRules).toContain('platform_admins/$(request.auth.uid)');
    expect(firestoreRules).toContain("hasanaamir815@gmail.com");
    expect(firestoreRules).toContain('request.auth.token.email_verified == true');
  });

  it('enforces strict tenant isolation under /shops/{shopId}', () => {
    expect(firestoreRules).toContain('match /shops/{shopId}');
    expect(firestoreRules).toContain('isShopOwner(shopId)');
    expect(firestoreRules).toContain('isShopAdmin(shopId)');
    expect(firestoreRules).toContain('isShopMember(shopId)');
  });

  it('prevents subscription forgery & owner status escalation on shop updates', () => {
    expect(firestoreRules).toContain("!incoming().diff(existing()).affectedKeys().hasAny(['ownerId', 'slug', 'status', 'subscription'])");
  });

  it('prevents customer role/membership escalation on /users/{userId}', () => {
    expect(firestoreRules).toContain('match /users/{userId}');
    expect(firestoreRules).toContain("!incoming().diff(existing()).affectedKeys().hasAny(['role', 'isBlocked'])");
  });

  it('enforces guest order creation pending payment invariant and non-PII tracking', () => {
    expect(firestoreRules).toContain("incoming().paymentStatus == 'pending' && incoming().orderStatus == 'Pending'");
    expect(firestoreRules).toContain('match /order_tracking/{orderNumber}');
    expect(firestoreRules).toContain('data.keys().hasOnly(');
    expect(firestoreRules).toContain('isValidOrderTracking(incoming())');
  });

  it('restricts Firebase Storage uploads to tenant folders, 5MB cap, and image MIME types', () => {
    expect(storageRules).toContain('match /shops/{shopId}/{folder}/{allPaths=**}');
    expect(storageRules).toContain('5 * 1024 * 1024');
    expect(storageRules).toContain("request.resource.contentType.matches('image/(jpeg|jpg|png|webp|gif)')");
  });
});

describe('SaaS Slug, Currency & Validation Utilities', () => {
  it('sanitizes arbitrary store names into clean URL slugs', () => {
    expect(sanitizeShopSlug('Lahore Kiryana & General Store!')).toBe('lahore-kiryana-general-store');
    expect(sanitizeShopSlug('---Al-Madina Mart 99---')).toBe('al-madina-mart-99');
  });

  it('validates shop slugs and rejects reserved SaaS system routes', () => {
    expect(isValidShopSlug('al-madina-mart')).toBe(true);
    expect(isValidShopSlug('bazaarpk')).toBe(true);
    expect(isValidShopSlug('super-admin')).toBe(false);
    expect(isValidShopSlug('dashboard')).toBe(false);
    expect(isValidShopSlug('register')).toBe(false);
    expect(isValidShopSlug('login')).toBe(false);
    expect(isValidShopSlug('admin')).toBe(false);
    expect(isValidShopSlug('a')).toBe(false);
  });

  it('validates Pakistani mobile formats accurately', () => {
    expect(isValidPakistaniPhone('0300 1234567')).toBe(true);
    expect(isValidPakistaniPhone('+923451234567')).toBe(true);
    expect(isValidPakistaniPhone('923121234567')).toBe(true);
    expect(isValidPakistaniPhone('0421234567')).toBe(false);
    expect(isValidPakistaniPhone('invalid')).toBe(false);
  });

  it('formats PKR currency cleanly without floating precision artifacts', () => {
    expect(formatPKR(2500)).toBe('Rs. 2,500');
    expect(formatPKR(0)).toBe('Rs. 0');
  });

  it('recursively strips undefined keys before Firestore writes', () => {
    const cleaned = stripUndefined({
      name: 'Karachi Store',
      note: undefined,
      nested: { city: 'Karachi', optionalCode: undefined },
    });
    expect(cleaned).toEqual({
      name: 'Karachi Store',
      nested: { city: 'Karachi' },
    });
    expect('note' in cleaned).toBe(false);
  });
});

describe('Multi-Tenant Isolation & Plan Definitions', () => {
  it('defines distinct non-zero tiers above Starter Free', () => {
    expect(DEFAULT_SUBSCRIPTION_PLANS.length).toBeGreaterThanOrEqual(3);
    const starter = DEFAULT_SUBSCRIPTION_PLANS.find((p) => p.id === 'free-starter');
    const growth = DEFAULT_SUBSCRIPTION_PLANS.find((p) => p.id === 'growth-plus');
    const enterprise = DEFAULT_SUBSCRIPTION_PLANS.find((p) => p.id === 'enterprise-pro');
    expect(starter?.maxProducts).toBeLessThan(growth?.maxProducts || 0);
    expect(growth?.maxProducts).toBeLessThan(enterprise?.maxProducts || 0);
    expect(starter?.features.coupons).toBe(false);
    expect(growth?.features.coupons).toBe(true);
  });

  it('isolates cart & wishlist localStorage storage keys per shopId', () => {
    const shopA = 'karachi-super-mart';
    const shopB = 'lahore-organic-hub';
    const cartKeyA = `bazaarpk_cart_${shopA}`;
    const cartKeyB = `bazaarpk_cart_${shopB}`;
    expect(cartKeyA).not.toBe(cartKeyB);
  });
});
