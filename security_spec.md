# Security Specification — Multi-Tenant SaaS eCommerce Platform

## Architecture & Tenant Isolation Invariants
1. **Default Deny**: Root `match /{document=**} { allow read, write: if false; }` blocks all unspecified paths.
2. **Backend-Verified Super Admin Gate**:
   - Never trust client-editable `users/{uid}.role` for authorization.
   - `isSuperAdmin()` requires either `request.auth.token.email == 'hasanaamir815@gmail.com' && request.auth.token.email_verified == true` OR presence of `/platform_admins/{request.auth.uid}`.
   - Only `isSuperAdmin()` may create/modify/delete `/platform_admins`, `/platform_plans`, `/platform_settings`, or approve/reject `/platform_payments`.
3. **Strict Tenant Isolation (`/shops/{shopId}/...`)**:
   - Every operational record (`products`, `categories`, `banners`, `orders`, `order_tracking`, `coupons`, `reviews`, `inventory_logs`, `contact_messages`, `settings`, `staff`, `carts`, `wishlists`, `notifications`, `activity_logs`, `pages`) resides under `/shops/{shopId}/...`.
   - `isShopMember(shopId)` verifies either `isSuperAdmin()`, `shops/{shopId}.ownerId == request.auth.uid`, or an active `/shops/{shopId}/staff/{request.auth.uid}` record.
   - Shop A's owners/staff cannot read, list, create, update, or delete Shop B's private documents (`orders`, `inventory_logs`, `contact_messages`, `staff`, `activity_logs`, `notifications`).
4. **Anti-Tampering on Subscriptions & Shop Status**:
   - Shop Owners cannot self-upgrade `shops/{shopId}.subscription` to paid tiers or lift a `'suspended'` status.
   - Only `isSuperAdmin()` may change `ownerId`, `slug`, `status`, or paid `subscription` fields on `/shops/{shopId}`.
   - On self-registration (`create`), non-Super-Admin owners can only initialize `planId == 'free-starter'` or `subscription.status == 'trial'`.
5. **Order & Tracking Anti-PII & Payment Integrity**:
   - Checkout (`create`) forces `paymentStatus == 'pending'` and `orderStatus == 'Pending'`. Clients cannot forge paid orders.
   - `shops/{shopId}/order_tracking/{orderNumber}` omits email, phone, and street address.
6. **Firebase Storage Tenant Isolation (`storage.rules`)**:
   - Tenant uploads under `shops/{shopId}/...` verify image content-type (`image/jpeg|png|webp|gif`), max file size (5 MB), and authenticated tenant membership (or checkout `payments/` folder upload for payment receipts).

## Dirty Dozen Verification Cases
1. Unauthenticated read of `shops/shopA/orders` -> DENIED
2. Shop A owner reading/modifying `shops/shopB/orders` or `shops/shopB/products` -> DENIED
3. Shop Owner writing to `platform_plans` or `platform_admins` -> DENIED
4. Shop Owner modifying `users/{uid}.role = 'super_admin'` -> DENIED
5. Shop Owner self-activating `'pro-enterprise'` subscription directly on `shops/{shopId}` -> DENIED
6. Suspended Shop Owner trying to flip `shops/{shopId}.status = 'active'` -> DENIED
7. Guest creating order with `paymentStatus: 'paid'` -> DENIED
8. Staff with `shop_staff` role trying to delete/override `shop_owner` in `shops/{shopId}/staff` -> DENIED
9. Customer updating order status to `'Delivered'` -> DENIED
10. Public unauthenticated query on `shops/{shopId}/inventory_logs` or `contact_messages` -> DENIED
11. Slug hijacking existing `shop_slugs/{slug}` owned by another merchant -> DENIED
12. Uploading non-image or >5MB payload to Storage -> DENIED
