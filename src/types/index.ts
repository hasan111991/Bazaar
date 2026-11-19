export type UserRole = 'customer' | 'shop_owner' | 'shop_admin' | 'shop_staff' | 'admin' | 'super_admin';

export type StaffRole = 'shop_owner' | 'shop_admin' | 'shop_staff';

export type StaffPermission =
  | 'overview'
  | 'products'
  | 'categories'
  | 'orders'
  | 'customers'
  | 'inventory'
  | 'coupons'
  | 'banners'
  | 'appearance'
  | 'settings'
  | 'staff'
  | 'reports'
  | 'subscription';

export interface UserAddress {
  id: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  postalCode?: string;
  isDefault?: boolean;
}

export interface ShopMembership {
  shopId: string;
  shopName: string;
  shopSlug: string;
  role: StaffRole;
  permissions?: StaffPermission[];
  joinedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  photoURL?: string;
  role: UserRole;
  isBlocked?: boolean;
  addresses: UserAddress[];
  createdAt: string;
  updatedAt?: string;
}

export type ShopStatus = 'active' | 'inactive' | 'suspended';
export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'cancelled';
export type BillingCycle = 'monthly' | 'yearly';

export interface PlanFeatures {
  customBranding: boolean;
  coupons: boolean;
  banners: boolean;
  analytics: boolean;
  selfPickup: boolean;
  buyingGuide: boolean;
  staffAccounts: boolean;
  customPages: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  durationDays: number;
  maxProducts: number;
  maxStorageMB: number;
  maxStaff: number;
  features: PlanFeatures;
  isActive: boolean;
  isPopular?: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShopSubscription {
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  pricePaid: number;
  startDate: string;
  expiryDate: string;
  autoRenew?: boolean;
  isFreeOverride?: boolean;
}

export interface ShopUsage {
  productsCount: number;
  ordersCount: number;
  storageBytes: number;
  staffCount: number;
}

export interface ShopTheme {
  primaryColor: string;
  accentColor: string;
  heroTitle?: string;
  heroSubtitle?: string;
  showTestimonials?: boolean;
  showBuyingGuide?: boolean;
}

export interface Shop {
  id: string;
  slug: string;
  name: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  city: string;
  address: string;
  logoUrl?: string;
  status: ShopStatus;
  subscription: ShopSubscription;
  usage: ShopUsage;
  theme?: ShopTheme;
  lastActivityAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ShopPublic {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string;
  city?: string;
  publicContactPhone?: string;
  publicSupportEmail?: string;
  storefrontAddress?: string;
  status: ShopStatus;
  theme?: ShopTheme;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShopSlugRecord {
  slug: string;
  shopId: string;
  ownerId: string;
  name: string;
  createdAt: string;
}

export interface StaffMember {
  uid: string;
  email: string;
  name: string;
  role: StaffRole;
  permissions: StaffPermission[];
  status: 'active' | 'invited' | 'inactive';
  inviteId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ShopInvite {
  id: string;
  shopId: string;
  shopName: string;
  shopSlug: string;
  email: string;
  name: string;
  role: 'shop_admin' | 'shop_staff';
  permissions: StaffPermission[];
  invitedBy: string;
  status: 'pending' | 'accepted';
  createdAt: string;
  acceptedAt?: string;
  acceptedBy?: string;
}

export interface PlatformPayment {
  id: string;
  shopId: string;
  shopName: string;
  shopSlug: string;
  ownerId: string;
  ownerEmail: string;
  planId: string;
  planName: string;
  billingCycle: BillingCycle;
  amount: number;
  method: 'easypaisa' | 'jazzcash' | 'bank_transfer';
  transactionId: string;
  senderNumber: string;
  proofUrl: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface PlatformSettings {
  platformName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  easypaisaDetails: MobileWalletDetails;
  jazzcashDetails: MobileWalletDetails;
  bankDetails: {
    bankName: string;
    accountTitle: string;
    accountNumber: string;
    iban: string;
  };
  updatedAt?: string;
}

export interface ActivityLog {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetType: 'shop' | 'plan' | 'payment' | 'product' | 'order' | 'staff' | 'settings' | 'migration';
  targetId: string;
  details: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'payment' | 'subscription' | 'system';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface ShopPageContent {
  key: 'about' | 'faq' | 'return-policy' | 'terms' | 'privacy';
  title: string;
  content: string;
  imageUrl?: string;
  updatedAt: string;
}

export interface ShopCustomerSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: string;
  createdAt: string;
}

export interface ProductVariant {
  name: string;
  options: string[];
}

export interface Product {
  id: string;
  shopId?: string;
  title: string;
  slug: string;
  description: string;
  regularPrice: number;
  salePrice?: number;
  stock: number;
  category: string;
  brand: string;
  images: string[];
  sku: string;
  variants?: ProductVariant[];
  isFeatured: boolean;
  isPublished: boolean;
  rating: number;
  reviewCount: number;
  specifications?: Record<string, string>;
  createdAt: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  shopId?: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  order: number;
}

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  selectedVariants?: Record<string, string>;
  itemKey: string;
}

export type PaymentMethod = 'cod' | 'bank_transfer' | 'easypaisa' | 'jazzcash' | 'online';
export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type FulfillmentMethod = 'delivery' | 'self_pickup';
export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Returned'
  | 'Refunded';

export interface OrderItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  image: string;
  selectedVariants?: Record<string, string>;
}

export interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

export interface OrderPickupDetails {
  locationName: string;
  address: string;
  city: string;
  timings: string;
  contactPhone: string;
  preferredTime?: string;
}

export interface Order {
  id: string;
  shopId?: string;
  orderNumber: string;
  trackingToken?: string;
  trackingTokenHash?: string;
  userId: string;
  customer: CustomerDetails;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  couponCode?: string;
  fulfillmentMethod?: FulfillmentMethod;
  pickupDetails?: OrderPickupDetails;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  trackingNumber?: string;
  courierName?: string;
  notes?: string;
  bankSlipReference?: string;
  paymentReference?: string;
  senderAccountNumber?: string;
  paymentProofImage?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface OrderTrackingPublic {
  orderNumber: string;
  orderId: string;
  shopId?: string;
  trackingTokenHash?: string;
  orderStatus: OrderStatus;
  fulfillmentMethod?: FulfillmentMethod;
  pickupDetails?: OrderPickupDetails;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  courierName?: string;
  trackingNumber?: string;
  customerName: string;
  city: string;
  items: OrderItem[];
  total: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Coupon {
  id: string;
  shopId?: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  expiryDate?: string;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
}

export interface Review {
  id: string;
  shopId?: string;
  productId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface MobileWalletDetails {
  enabled: boolean;
  accountTitle: string;
  accountNumber: string;
  instructions?: string;
}

export interface SelfPickupSettings {
  enabled: boolean;
  title: string;
  address: string;
  city: string;
  timings: string;
  contactPhone: string;
  instructions?: string;
}

export interface StoreSettings {
  siteName: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  announcement: string;
  contactPhone: string;
  whatsappNumber: string;
  contactEmail: string;
  address: string;
  city?: string;
  shippingFee: number;
  freeShippingThreshold: number;
  currency: string;
  currencySymbol: string;
  aboutUs?: string;
  bankDetails: {
    bankName: string;
    accountTitle: string;
    accountNumber: string;
    iban: string;
  };
  easypaisaDetails: MobileWalletDetails;
  jazzcashDetails: MobileWalletDetails;
  selfPickupDetails: SelfPickupSettings;
  socialLinks: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
    tiktok?: string;
  };
}

export interface Banner {
  id: string;
  shopId?: string;
  title: string;
  subtitle: string;
  link: string;
  imageUrl: string;
  buttonText?: string;
  isActive: boolean;
  order: number;
}

export interface InventoryLog {
  id: string;
  shopId?: string;
  productId: string;
  productTitle: string;
  changeQuantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  updatedBy: string;
  createdAt: string;
}

export interface ContactMessage {
  id: string;
  shopId?: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  status: 'new' | 'resolved';
  createdAt: string;
}

export interface MigrationResult {
  success: boolean;
  shopId: string;
  shopSlug: string;
  migratedCounts: {
    products: number;
    categories: number;
    banners: number;
    coupons: number;
    orders: number;
    orderTracking: number;
    reviews: number;
    inventoryLogs: number;
    contactMessages: number;
    settings: number;
  };
  skippedRecords: Record<string, number>;
  failedRecords: { collection: string; id: string; error: string }[];
  verifiedCounts: Record<string, { expectedMin: number; actual: number; matched: boolean }>;
  skippedCollections: string[];
  errors: string[];
  backupJson: string;
  timestamp: string;
}
