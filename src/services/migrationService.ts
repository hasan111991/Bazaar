import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { MigrationResult, Shop, StaffMember, ShopMembership } from '../types';
import {
  DEFAULT_SHOP_ID,
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_BANNERS,
  INITIAL_COUPONS,
  INITIAL_SETTINGS,
  DEFAULT_SUBSCRIPTION_PLANS,
  DEFAULT_PLATFORM_SETTINGS,
} from '../data/seedData';
import { stripUndefined, seedDefaultPlansIfEmpty, logPlatformActivity } from './platformService';

async function readCollectionDocs(colName: string): Promise<{ id: string; data: any }[]> {
  try {
    const snap = await getDocs(collection(db, colName));
    return snap.docs.map((d) => ({ id: d.id, data: d.data() }));
  } catch {
    return [];
  }
}

export async function migrateLegacyBazaarPKToTenant(options?: {
  ownerUid?: string;
  ownerEmail?: string;
  ownerName?: string;
}): Promise<MigrationResult> {
  const shopId = DEFAULT_SHOP_ID;
  const shopSlug = DEFAULT_SHOP_ID;
  const now = new Date().toISOString();
  const currentUid = options?.ownerUid || auth.currentUser?.uid || 'platform_owner';
  const currentEmail = options?.ownerEmail || auth.currentUser?.email || 'hasanaamir815@gmail.com';
  const currentName = options?.ownerName || auth.currentUser?.displayName || 'BazaarPK Owner';

  const result: MigrationResult = {
    success: false,
    shopId,
    shopSlug,
    migratedCounts: {
      products: 0,
      categories: 0,
      banners: 0,
      coupons: 0,
      orders: 0,
      orderTracking: 0,
      reviews: 0,
      inventoryLogs: 0,
      contactMessages: 0,
      settings: 0,
    },
    skippedCollections: [],
    errors: [],
    backupJson: '{}',
    timestamp: now,
  };

  try {
    // 1. Ensure platform plans & settings exist
    await seedDefaultPlansIfEmpty();
    const platSettingsSnap = await getDoc(doc(db, 'platform_settings', 'general'));
    if (!platSettingsSnap.exists()) {
      await setDoc(
        doc(db, 'platform_settings', 'general'),
        stripUndefined({ ...DEFAULT_PLATFORM_SETTINGS, updatedAt: now })
      );
    }

    // 2. Read all legacy collections and prepare JSON backup snapshot
    const [
      legacyProducts,
      legacyCategories,
      legacyBanners,
      legacyCoupons,
      legacyOrders,
      legacyTracking,
      legacyReviews,
      legacyInvLogs,
      legacyMessages,
      legacySettings,
    ] = await Promise.all([
      readCollectionDocs('products'),
      readCollectionDocs('categories'),
      readCollectionDocs('banners'),
      readCollectionDocs('coupons'),
      readCollectionDocs('orders'),
      readCollectionDocs('order_tracking'),
      readCollectionDocs('reviews'),
      readCollectionDocs('inventory_logs'),
      readCollectionDocs('contact_messages'),
      readCollectionDocs('settings'),
    ]);

    const backupPayload = {
      exportedAt: now,
      source: 'legacy_root_collections',
      counts: {
        products: legacyProducts.length,
        categories: legacyCategories.length,
        banners: legacyBanners.length,
        coupons: legacyCoupons.length,
        orders: legacyOrders.length,
        orderTracking: legacyTracking.length,
        reviews: legacyReviews.length,
        inventoryLogs: legacyInvLogs.length,
        contactMessages: legacyMessages.length,
        settings: legacySettings.length,
      },
      data: {
        products: legacyProducts,
        categories: legacyCategories,
        banners: legacyBanners,
        coupons: legacyCoupons,
        orders: legacyOrders,
        order_tracking: legacyTracking,
        reviews: legacyReviews,
        inventory_logs: legacyInvLogs,
        contact_messages: legacyMessages,
        settings: legacySettings,
      },
    };
    result.backupJson = JSON.stringify(backupPayload, null, 2);

    // 3. Prepare datasets (preferring legacy Firestore docs, falling back to INITIAL_* seeds if empty)
    const productsToWrite =
      legacyProducts.length > 0
        ? legacyProducts
        : INITIAL_PRODUCTS.map((p) => ({ id: p.id, data: p }));
    const categoriesToWrite =
      legacyCategories.length > 0
        ? legacyCategories
        : INITIAL_CATEGORIES.map((c) => ({ id: c.id, data: c }));
    const bannersToWrite =
      legacyBanners.length > 0
        ? legacyBanners
        : INITIAL_BANNERS.map((b) => ({ id: b.id, data: b }));
    const couponsToWrite =
      legacyCoupons.length > 0
        ? legacyCoupons
        : INITIAL_COUPONS.map((c) => ({ id: c.id, data: c }));
    const settingsDoc =
      legacySettings.find((s) => s.id === 'general')?.data || INITIAL_SETTINGS;

    // 4. Create or preserve master shops/bazaarpk & shop_slugs/bazaarpk
    await setDoc(
      doc(db, 'shop_slugs', shopSlug),
      {
        slug: shopSlug,
        shopId,
        ownerId: currentUid,
        name: settingsDoc.siteName || 'BazaarPK',
        createdAt: now,
      },
      { merge: true }
    );

    const existingShopSnap = await getDoc(doc(db, 'shops', shopId));
    const enterprisePlan = DEFAULT_SUBSCRIPTION_PLANS[2]; // Give flagship BazaarPK Enterprise Pro
    const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    if (!existingShopSnap.exists()) {
      const flagshipShop: Shop = {
        id: shopId,
        slug: shopSlug,
        name: settingsDoc.siteName || 'BazaarPK',
        ownerId: currentUid,
        ownerName: currentName,
        ownerEmail: currentEmail,
        ownerPhone: settingsDoc.contactPhone || '+92 300 1234567',
        city: settingsDoc.city || 'Karachi',
        address: settingsDoc.address || INITIAL_SETTINGS.address,
        logoUrl: settingsDoc.logoUrl || '',
        status: 'active',
        subscription: {
          planId: enterprisePlan.id,
          planName: enterprisePlan.name,
          status: 'active',
          billingCycle: 'yearly',
          pricePaid: 0,
          startDate: now,
          expiryDate: oneYearLater,
          isFreeOverride: true,
        },
        usage: {
          productsCount: productsToWrite.length,
          ordersCount: legacyOrders.length,
          storageBytes: 0,
          staffCount: 1,
        },
        theme: {
          primaryColor: '#065f46',
          accentColor: '#d97706',
          heroTitle: 'Authentic Pakistani Craftsmanship & Modern Essentials',
          heroSubtitle: 'Flagship multi-category store with nationwide COD, EasyPaisa, JazzCash, and Self-Pickup.',
          showTestimonials: true,
          showBuyingGuide: true,
        },
        lastActivityAt: now,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(doc(db, 'shops', shopId), stripUndefined(flagshipShop));
    }

    // 5. Ensure owner staff + membership exist
    const staffDoc: StaffMember = {
      uid: currentUid,
      email: currentEmail,
      name: currentName,
      role: 'shop_owner',
      permissions: [
        'overview',
        'products',
        'categories',
        'orders',
        'customers',
        'inventory',
        'coupons',
        'banners',
        'appearance',
        'settings',
        'staff',
        'reports',
        'subscription',
      ],
      status: 'active',
      createdAt: now,
    };
    await setDoc(doc(db, 'shops', shopId, 'staff', currentUid), stripUndefined(staffDoc), { merge: true });

    if (currentUid !== 'platform_owner') {
      const memDoc: ShopMembership = {
        shopId,
        shopName: settingsDoc.siteName || 'BazaarPK',
        shopSlug,
        role: 'shop_owner',
        joinedAt: now,
      };
      await setDoc(doc(db, 'users', currentUid, 'shopMemberships', shopId), stripUndefined(memDoc), { merge: true });
    }

    // 6. Helper to idempotently migrate a subcollection without overwriting existing target docs
    const migrateSubcollection = async (
      subName: string,
      items: { id: string; data: any }[],
      countKey: keyof MigrationResult['migratedCounts']
    ) => {
      if (items.length === 0) {
        result.skippedCollections.push(subName);
        return;
      }
      const existingTargetSnap = await getDocs(collection(db, 'shops', shopId, subName));
      const existingIds = new Set(existingTargetSnap.docs.map((d) => d.id));
      const pending = items.filter((it) => !existingIds.has(it.id));
      if (pending.length === 0) {
        result.skippedCollections.push(`${subName} (already synced)`);
        return;
      }

      // Chunk writes in batches of 400
      for (let i = 0; i < pending.length; i += 400) {
        const chunk = pending.slice(i, i + 400);
        const batch = writeBatch(db);
        for (const item of chunk) {
          batch.set(
            doc(db, 'shops', shopId, subName, item.id),
            stripUndefined({ ...item.data, id: item.id, shopId })
          );
        }
        await batch.commit();
      }
      result.migratedCounts[countKey] = pending.length;
    };

    // Migrate settings idempotently
    const targetSettingsSnap = await getDoc(doc(db, 'shops', shopId, 'settings', 'general'));
    if (!targetSettingsSnap.exists()) {
      await setDoc(
        doc(db, 'shops', shopId, 'settings', 'general'),
        stripUndefined({ ...INITIAL_SETTINGS, ...settingsDoc })
      );
      result.migratedCounts.settings = 1;
    }

    await migrateSubcollection('categories', categoriesToWrite, 'categories');
    await migrateSubcollection('products', productsToWrite, 'products');
    await migrateSubcollection('banners', bannersToWrite, 'banners');
    await migrateSubcollection('coupons', couponsToWrite, 'coupons');
    await migrateSubcollection('orders', legacyOrders, 'orders');
    await migrateSubcollection('order_tracking', legacyTracking, 'orderTracking');
    await migrateSubcollection('reviews', legacyReviews, 'reviews');
    await migrateSubcollection('inventory_logs', legacyInvLogs, 'inventoryLogs');
    await migrateSubcollection('contact_messages', legacyMessages, 'contactMessages');

    // Update exact counts
    const [finalProds, finalOrders] = await Promise.all([
      getDocs(collection(db, 'shops', shopId, 'products')),
      getDocs(collection(db, 'shops', shopId, 'orders')),
    ]);
    await setDoc(
      doc(db, 'shops', shopId),
      {
        usage: {
          productsCount: finalProds.size,
          ordersCount: finalOrders.size,
        },
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    await logPlatformActivity(
      'Migrated Legacy BazaarPK',
      'migration',
      shopId,
      `Migrated BazaarPK into tenant shop "${shopId}" (${result.migratedCounts.products} products, ${result.migratedCounts.orders} orders)`
    );

    result.success = true;
    return result;
  } catch (err: any) {
    result.errors.push(err?.message || 'Migration failed');
    return result;
  }
}
