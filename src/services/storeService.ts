import {
  collection,
  getDocs,
  doc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Product,
  Category,
  Order,
  Coupon,
  Review,
  StoreSettings,
  Banner,
  InventoryLog,
  UserProfile,
  CartItem,
  ContactMessage,
} from '../types';
import { DEFAULT_SHOP_ID } from '../data/seedData';
import { stripUndefined } from './platformService';
import * as tenant from './tenantService';
import { migrateLegacyBazaarPKToTenant } from './migrationService';

export { stripUndefined };

export async function getProducts(
  options?: { category?: string; featuredOnly?: boolean },
  shopId: string = DEFAULT_SHOP_ID
): Promise<Product[]> {
  return tenant.getShopProducts(shopId, options);
}

export async function getAllProductsAdmin(shopId: string = DEFAULT_SHOP_ID): Promise<Product[]> {
  return tenant.getShopProductsAdmin(shopId);
}

export async function getProductById(id: string, shopId: string = DEFAULT_SHOP_ID): Promise<Product | null> {
  return tenant.getShopProductById(shopId, id);
}

export async function saveProduct(product: Partial<Product>, shopId: string = DEFAULT_SHOP_ID): Promise<string> {
  return tenant.saveShopProduct(shopId, product);
}

export async function deleteProduct(id: string, shopId: string = DEFAULT_SHOP_ID): Promise<void> {
  return tenant.deleteShopProduct(shopId, id);
}

export async function getCategories(shopId: string = DEFAULT_SHOP_ID): Promise<Category[]> {
  return tenant.getShopCategories(shopId);
}

export async function saveCategory(category: Partial<Category>, shopId: string = DEFAULT_SHOP_ID): Promise<string> {
  return tenant.saveShopCategory(shopId, category);
}

export async function deleteCategory(id: string, shopId: string = DEFAULT_SHOP_ID): Promise<void> {
  return tenant.deleteShopCategory(shopId, id);
}

export async function getBanners(shopId: string = DEFAULT_SHOP_ID): Promise<Banner[]> {
  return tenant.getShopBanners(shopId);
}

export async function createOrder(
  orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>,
  shopId: string = DEFAULT_SHOP_ID
): Promise<Order> {
  return tenant.createShopOrder(shopId, orderData);
}

export async function getOrdersByUser(userId: string, shopId: string = DEFAULT_SHOP_ID): Promise<Order[]> {
  return tenant.getShopOrdersByUser(shopId, userId);
}

export async function getAllOrdersAdmin(shopId: string = DEFAULT_SHOP_ID): Promise<Order[]> {
  return tenant.getAllShopOrdersAdmin(shopId);
}

export async function updateOrderStatus(
  orderId: string,
  updates: Partial<Order>,
  orderNumber?: string,
  shopId: string = DEFAULT_SHOP_ID
): Promise<void> {
  return tenant.updateShopOrderStatus(shopId, orderId, updates, orderNumber);
}

export async function trackOrder(
  ref: string,
  shopId: string = DEFAULT_SHOP_ID,
  token?: string
): Promise<Order | null> {
  return tenant.trackShopOrder(shopId, ref, token);
}

export async function getStoreSettings(shopId: string = DEFAULT_SHOP_ID): Promise<StoreSettings> {
  return tenant.getShopPublicSettings(shopId);
}

export async function updateStoreSettings(settings: Partial<StoreSettings>, shopId: string = DEFAULT_SHOP_ID): Promise<StoreSettings> {
  return tenant.updateShopSettings(shopId, settings);
}

export async function getCoupons(shopId: string = DEFAULT_SHOP_ID): Promise<Coupon[]> {
  return tenant.getShopCoupons(shopId);
}

export async function saveCoupon(coupon: Partial<Coupon>, shopId: string = DEFAULT_SHOP_ID): Promise<string> {
  return tenant.saveShopCoupon(shopId, coupon);
}

export async function deleteCoupon(id: string, shopId: string = DEFAULT_SHOP_ID): Promise<void> {
  return tenant.deleteShopCoupon(shopId, id);
}

export async function saveUserCart(userId: string, items: CartItem[], shopId: string = DEFAULT_SHOP_ID): Promise<void> {
  return tenant.saveShopUserCart(shopId, userId, items);
}

export async function loadUserCart(userId: string, shopId: string = DEFAULT_SHOP_ID): Promise<any[] | null> {
  return tenant.loadShopUserCart(shopId, userId);
}

export async function saveUserWishlist(userId: string, productIds: string[], shopId: string = DEFAULT_SHOP_ID): Promise<void> {
  return tenant.saveShopUserWishlist(shopId, userId, productIds);
}

export async function loadUserWishlist(userId: string, shopId: string = DEFAULT_SHOP_ID): Promise<string[]> {
  return tenant.loadShopUserWishlist(shopId, userId);
}

export async function getProductReviews(productId: string, shopId: string = DEFAULT_SHOP_ID): Promise<Review[]> {
  return tenant.getShopProductReviews(shopId, productId);
}

export async function addProductReview(review: Omit<Review, 'id' | 'createdAt'>, shopId: string = DEFAULT_SHOP_ID): Promise<string> {
  return tenant.addShopProductReview(shopId, review);
}

export async function getInventoryLogs(shopId: string = DEFAULT_SHOP_ID): Promise<InventoryLog[]> {
  return tenant.getShopInventoryLogs(shopId);
}

export async function adjustStock(
  productId: string,
  delta: number,
  reason: string,
  updatedBy: string,
  shopId: string = DEFAULT_SHOP_ID
): Promise<void> {
  return tenant.adjustShopStock(shopId, productId, delta, reason, updatedBy);
}

export async function getAllUsersAdmin(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const list: UserProfile[] = [];
    snap.forEach((d) => list.push({ ...(d.data() as UserProfile), uid: d.id }));
    return list;
  } catch {
    return [];
  }
}

export async function toggleUserBlocked(uid: string, isBlocked: boolean): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { isBlocked, updatedAt: new Date().toISOString() });
}

export async function saveContactMessage(
  msg: Omit<ContactMessage, 'id' | 'status' | 'createdAt'>,
  shopId: string = DEFAULT_SHOP_ID
): Promise<string> {
  return tenant.saveShopContactMessage(shopId, msg);
}

export async function seedInitialDatabase(): Promise<{ success: boolean; count: number }> {
  const res = await migrateLegacyBazaarPKToTenant();
  return { success: res.success, count: res.migratedCounts.products };
}

export { writeBatch };
