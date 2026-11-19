import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import firebaseConfig from './firebase-applet-config.json';
import { db } from './src/firebase/config';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SUPER_ADMIN_EMAIL = 'hasanaamir815@gmail.com';

// Lightweight sliding-window rate limiter for public APIs
const rateWindowMap = new Map<string, number[]>();
function checkRateLimit(ip: string, bucket: string, maxRequests: number, windowMs: number): boolean {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const timestamps = (rateWindowMap.get(key) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    rateWindowMap.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  rateWindowMap.set(key, timestamps);
  return true;
}

function stripUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = stripUndefined(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

function sanitizeShopId(raw: unknown): string {
  const s = String(raw || 'bazaarpk').trim().toLowerCase();
  if (/^[a-z0-9][a-z0-9_-]{1,60}$/.test(s)) return s;
  return 'bazaarpk';
}

function sanitizeDocId(raw: unknown): string {
  const s = String(raw || '').trim();
  return /^[A-Za-z0-9_-]{4,120}$/.test(s) ? s : '';
}

function generateServerTrackingToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

function computeTrackingTokenHash(orderNumber: string, token: string): string {
  return crypto
    .createHash('sha256')
    .update(`${orderNumber.trim().toUpperCase()}:${token.trim()}`)
    .digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

async function verifyFirebaseIdToken(bearerHeader?: string): Promise<VerifiedFirebaseUser | null> {
  if (!bearerHeader || !bearerHeader.startsWith('Bearer ')) return null;
  const idToken = bearerHeader.slice(7).trim();
  if (!idToken || !firebaseConfig.apiKey) return null;

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!response.ok) return null;
    const data = (await response.json()) as {
      users?: { localId?: string; email?: string; emailVerified?: boolean }[];
    };
    const user = data.users?.[0];
    if (!user?.localId) return null;
    return {
      uid: user.localId,
      email: String(user.email || '').toLowerCase(),
      emailVerified: Boolean(user.emailVerified),
    };
  } catch {
    return null;
  }
}

async function isAuthorizedSuperAdmin(user: VerifiedFirebaseUser): Promise<boolean> {
  if (user.email === SUPER_ADMIN_EMAIL && user.emailVerified) return true;
  const adminSnap = await getDoc(doc(db, 'platform_admins', user.uid)).catch(() => null);
  return Boolean(adminSnap && adminSnap.exists() && adminSnap.data()?.active !== false);
}

async function isAuthorizedShopMember(user: VerifiedFirebaseUser, shopId: string): Promise<boolean> {
  if (await isAuthorizedSuperAdmin(user)) return true;
  const [shopSnap, staffSnap] = await Promise.all([
    getDoc(doc(db, 'shops', shopId)).catch(() => null),
    getDoc(doc(db, 'shops', shopId, 'staff', user.uid)).catch(() => null),
  ]);
  if (shopSnap?.exists() && shopSnap.data()?.ownerId === user.uid) return true;
  if (staffSnap?.exists() && staffSnap.data()?.status === 'active') return true;
  return false;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Clean CORS middleware (configurable via ALLOWED_ORIGINS or allows GitHub Pages / localhost in preview)
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin) {
      const isAllowed =
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.github.io') ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1');
      if (isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      }
    }
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    return next();
  });

  app.use(express.json({ limit: '2mb' }));

  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
  }

  // API Route: Health & Environment Diagnostics (no secrets exposed)
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      mode: 'multi-tenant-saas',
      environment: process.env.NODE_ENV || 'development',
      firebaseProjectId: firebaseConfig.projectId,
      firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
      storageBucket: firebaseConfig.storageBucket,
      geminiConfigured: Boolean(apiKey),
      timestamp: new Date().toISOString(),
    });
  });

  // API Route: Google Search Grounded Buying Guide & Pakistani Market Comparison
  app.post('/api/buying-guide', async (req, res) => {
    const clientIp = req.ip || 'unknown';
    if (!checkRateLimit(clientIp, 'buying-guide', 20, 60_000)) {
      return res.status(429).json({ error: 'Too many requests. Please wait a minute and try again.' });
    }

    const userQuery = String(req.body?.query || '').trim() || 'Pakistani Products';
    const category = String(req.body?.category || '').trim();
    const storeName = String(req.body?.storeName || 'BazaarPK').trim();

    if (!req.body?.query || typeof req.body.query !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
      if (!ai) {
        return res.json({
          guide:
            `### Market Insights for "${userQuery}" in Pakistan\n\n` +
            `* **Current Pakistani Price Range**: Authentic quality typically ranges from Rs. 2,500 to Rs. 15,000 depending on brand tier and origin.\n` +
            `* **Quality & Authenticity Checklist**: Verify materials, craftsmanship stitching, and local warranty badges.\n` +
            `* **Courier Delivery & Self-Pickup**: Nationwide COD via TCS, Leopards, and Trax, plus zero-fee store pickup where enabled.\n`,
          sources: [{ title: `${storeName} Storefront`, uri: 'https://bazaarpk.com' }],
          queries: [`${userQuery} price in Pakistan`, `${userQuery} buying guide Pakistan`],
        });
      }

      const prompt = `Provide an authoritative, up-to-date shopping buying guide and product comparison for "${userQuery}"${
        category ? ` in the category of "${category}"` : ''
      } tailored specifically to the Pakistani consumer market for shoppers browsing ${storeName}.

Ground your analysis in current market trends, prevailing pricing in Pakistani Rupees (PKR / Rs.), popular local brand comparisons, material grades, and shopping tips across Pakistani cities.

Format cleanly in markdown with:
1. **Current Market Trends & Pakistani Price Range (PKR)**
2. **Quality & Authenticity Checklist**
3. **Comparison of Top Options / Variations**
4. **Buying Recommendation & Value Verdict**`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction:
            'You are a senior eCommerce product consultant and retail market analyst for Pakistan. Provide concise, practical buying guides with realistic PKR price ranges.',
        },
      });

      const text = response.text || 'No buying guide generated.';
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const webSources =
        chunks
          ?.filter((c: any) => c.web)
          .map((c: any) => ({
            title: c.web?.title || 'Web Reference',
            uri: c.web?.uri || '',
          })) || [];

      const searchQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];

      return res.json({ guide: text, sources: webSources, queries: searchQueries });
    } catch (error: any) {
      console.warn('Google Search Grounding fallback:', error?.message || error);
      return res.json({
        guide:
          `**Current Market Trends & Pakistani Price Range (PKR)**\n` +
          `* Across major Pakistani retail markets (Karachi, Lahore, Islamabad, Faisalabad, Peshawar), "${userQuery}" typically sells between **Rs. 2,500 and Rs. 14,500** depending on material grade.\n\n` +
          `**Quality & Authenticity Checklist**\n` +
          `* Verify material specs, seller ratings, and Cash on Delivery inspection availability.\n\n` +
          `**Buying Recommendation & Value Verdict**\n` +
          `* Shop verified items directly from ${storeName} with nationwide COD, EasyPaisa, JazzCash, or Self-Pickup convenience.`,
        sources: [{ title: 'Pakistan Retail Market Guide', uri: 'https://bazaarpk.com' }],
        queries: [`${userQuery} price in Pakistan`],
      });
    }
  });

  // API Route: Private Checkout Payment Proof Upload (stored privately, never public URL)
  app.post('/api/uploads/payment-proof', async (req, res) => {
    const clientIp = req.ip || 'unknown';
    if (!checkRateLimit(clientIp, 'proof-upload', 20, 60_000)) {
      return res.status(429).json({ error: 'Too many proof uploads. Please wait a minute.' });
    }

    try {
      const shopId = sanitizeShopId(req.body?.shopId);
      const orderSessionId = sanitizeDocId(req.body?.orderSessionId) || `sess_${Date.now()}`;
      const contentType = String(req.body?.contentType || '').toLowerCase();
      const fileName = String(req.body?.fileName || 'receipt.webp').slice(0, 100);
      const base64Data = String(req.body?.base64Data || '').trim();

      if (!/^image\/(jpeg|jpg|png|webp|gif)$/.test(contentType)) {
        return res.status(400).json({ error: 'Payment proof validation failed: invalid image MIME type.' });
      }
      if (!base64Data || base64Data.length > 460_000) {
        return res.status(400).json({ error: 'Payment proof validation failed: compressed slip exceeds 320 KB limit.' });
      }

      const verifiedUser = await verifyFirebaseIdToken(req.headers.authorization);
      const receiptId = `rcp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const nowIso = new Date().toISOString();

      await setDoc(doc(db, 'shops', shopId, 'payment_receipts', receiptId), {
        id: receiptId,
        shopId,
        orderSessionId,
        uploaderUid: verifiedUser?.uid || 'guest',
        contentType,
        fileName,
        base64Data,
        bytes: Buffer.from(base64Data, 'base64').length,
        createdAt: nowIso,
      });

      return res.status(201).json({
        ok: true,
        receiptId,
        receiptUrl: `/api/payments/proof?shopId=${encodeURIComponent(shopId)}&receiptId=${encodeURIComponent(receiptId)}`,
      });
    } catch (err: any) {
      console.error('Private payment proof upload error:', err);
      return res.status(500).json({ error: err?.message || 'Failed to store private payment proof.' });
    }
  });

  // API Route: Authenticated Private Payment Proof Reader (Bearer Token Required)
  app.get('/api/payments/proof', async (req, res) => {
    const verifiedUser = await verifyFirebaseIdToken(req.headers.authorization);
    if (!verifiedUser) {
      return res.status(401).json({ error: 'Authentication required to inspect payment receipts.' });
    }

    try {
      const scope = String(req.query.scope || '').trim();
      const receiptId = sanitizeDocId(req.query.receiptId);
      if (!receiptId) {
        return res.status(400).json({ error: 'Valid receiptId is required.' });
      }

      if (scope === 'platform') {
        const snap = await getDoc(doc(db, 'platform_payment_receipts', receiptId));
        if (!snap.exists()) {
          return res.status(404).json({ error: 'Subscription receipt not found.' });
        }
        const data = snap.data();
        const isSuper = await isAuthorizedSuperAdmin(verifiedUser);
        if (!isSuper && data.ownerId !== verifiedUser.uid) {
          return res.status(403).json({ error: 'Forbidden: you do not have access to this receipt.' });
        }
        const buffer = Buffer.from(String(data.base64Data || ''), 'base64');
        res.setHeader('Content-Type', String(data.contentType || 'image/webp'));
        res.setHeader('Cache-Control', 'private, no-store, max-age=0');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.send(buffer);
      }

      const shopId = sanitizeShopId(req.query.shopId);
      const snap = await getDoc(doc(db, 'shops', shopId, 'payment_receipts', receiptId));
      if (!snap.exists()) {
        return res.status(404).json({ error: 'Order receipt not found.' });
      }
      const data = snap.data();
      const authorizedMember = await isAuthorizedShopMember(verifiedUser, shopId);
      if (!authorizedMember && data.uploaderUid !== verifiedUser.uid) {
        return res.status(403).json({ error: 'Forbidden: tenant staff/owner permission required.' });
      }

      const buffer = Buffer.from(String(data.base64Data || ''), 'base64');
      res.setHeader('Content-Type', String(data.contentType || 'image/webp'));
      res.setHeader('Cache-Control', 'private, no-store, max-age=0');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.send(buffer);
    } catch (err: any) {
      console.error('Private receipt read error:', err);
      return res.status(500).json({ error: err?.message || 'Could not load protected receipt.' });
    }
  });

  // API Route: Newsletter Subscription Persistence
  app.post('/api/newsletter/subscribe', async (req, res) => {
    const clientIp = req.ip || 'unknown';
    if (!checkRateLimit(clientIp, 'newsletter', 15, 60_000)) {
      return res.status(429).json({ error: 'Too many subscription attempts. Please wait a moment.' });
    }

    try {
      const shopId = sanitizeShopId(req.body?.shopId);
      const email = String(req.body?.email || '').trim().toLowerCase();
      const source = String(req.body?.source || 'footer').slice(0, 40);

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Please provide a valid email address.' });
      }

      const subId = `sub_${email.replace(/[^a-z0-9]/g, '_').slice(0, 80)}_${Date.now()}`;
      await setDoc(doc(db, 'shops', shopId, 'newsletter_subscribers', subId), {
        id: subId,
        shopId,
        email,
        source,
        createdAt: new Date().toISOString(),
      });

      return res.status(201).json({ ok: true, id: subId });
    } catch (err: any) {
      console.error('Newsletter subscription error:', err);
      return res.status(500).json({ error: err?.message || 'Could not save newsletter signup.' });
    }
  });

  // API Route: Multi-Tenant Guest & Auth Order Creation (with authoritative Firestore price/discount recalculation)
  app.post('/api/orders/create', async (req, res) => {
    const clientIp = req.ip || 'unknown';
    if (!checkRateLimit(clientIp, 'order-create', 15, 60_000)) {
      return res.status(429).json({ error: 'Too many order submissions. Please try again shortly.' });
    }

    try {
      const shopId = sanitizeShopId(req.body?.shopId);
      const {
        customer,
        items,
        fulfillmentMethod,
        pickupDetails,
        paymentMethod,
        notes,
        bankSlipReference,
        paymentReference,
        senderAccountNumber,
        paymentProofImage,
        userId,
        couponCode,
      } = req.body;

      if (!customer || !customer.name || !customer.phone || !customer.address || !customer.city) {
        return res.status(400).json({ error: 'Incomplete customer delivery details' });
      }

      if (paymentProofImage && String(paymentProofImage).length > 300000) {
        return res.status(400).json({ error: 'Payment proof image exceeds maximum size limit' });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Order must contain at least one item' });
      }

      const cleanedPhone = String(customer.phone).replace(/[\s-]/g, '');
      if (!/^((\+92)|(92)|(0))?3[0-9]{9}$/.test(cleanedPhone)) {
        return res.status(400).json({ error: 'Invalid Pakistani mobile number' });
      }

      // Fetch authoritative shop status & public storefront settings
      const [shopPubSnap, pubSettingsSnap] = await Promise.all([
        getDoc(doc(db, 'shops_public', shopId)),
        getDoc(doc(db, 'shops', shopId, 'settings', 'public')),
      ]);

      if (shopPubSnap.exists() && shopPubSnap.data()?.status && shopPubSnap.data()?.status !== 'active') {
        return res.status(403).json({ error: 'This storefront is currently inactive.' });
      }

      const pubSettings = pubSettingsSnap.exists() ? pubSettingsSnap.data() : {};
      const resolvedPaymentMethod = String(paymentMethod || 'cod');
      if (resolvedPaymentMethod === 'cod' && pubSettings.codEnabled === false) {
        return res.status(400).json({ error: 'Cash on Delivery is disabled for this store.' });
      }
      if (resolvedPaymentMethod === 'easypaisa' && pubSettings.easypaisaDetails?.enabled === false) {
        return res.status(400).json({ error: 'EasyPaisa is disabled for this store.' });
      }
      if (resolvedPaymentMethod === 'jazzcash' && pubSettings.jazzcashDetails?.enabled === false) {
        return res.status(400).json({ error: 'JazzCash is disabled for this store.' });
      }
      if (resolvedPaymentMethod === 'bank_transfer' && pubSettings.bankDetails?.enabled === false) {
        return res.status(400).json({ error: 'Bank Transfer is disabled for this store.' });
      }

      const resolvedFulfillment = fulfillmentMethod === 'self_pickup' ? 'self_pickup' : 'delivery';
      if (resolvedFulfillment === 'self_pickup' && pubSettings.selfPickupDetails?.enabled === false) {
        return res.status(400).json({ error: 'Self-Pickup is currently disabled for this store.' });
      }

      // Recompute authoritative line-item prices & validate product existence/stock from Firestore
      const verifiedItems: any[] = [];
      let authoritativeSubtotal = 0;

      for (const rawItem of items) {
        const productId = String(rawItem?.productId || '').trim();
        const qty = Math.max(1, Math.min(999, Math.floor(Number(rawItem?.quantity) || 1)));
        if (!productId) {
          return res.status(400).json({ error: 'Every cart item must reference a valid productId.' });
        }

        const prodSnap = await getDoc(doc(db, 'shops', shopId, 'products', productId));
        if (!prodSnap.exists()) {
          return res.status(400).json({ error: `Product ${rawItem?.title || productId} is no longer available.` });
        }
        const prod = prodSnap.data();
        if (prod.isPublished === false || prod.status === 'archived') {
          return res.status(400).json({ error: `Product ${prod.title} is unavailable for purchase.` });
        }
        if (typeof prod.stock === 'number' && prod.stock < qty) {
          return res.status(400).json({ error: `Insufficient stock for ${prod.title}. Available: ${prod.stock}` });
        }

        const unitPrice =
          prod.salePrice && Number(prod.salePrice) > 0 && Number(prod.salePrice) < Number(prod.regularPrice)
            ? Number(prod.salePrice)
            : Number(prod.regularPrice) || 0;

        authoritativeSubtotal += unitPrice * qty;
        verifiedItems.push(
          stripUndefined({
            productId,
            title: String(prod.title || rawItem?.title || 'Product'),
            price: unitPrice,
            quantity: qty,
            image: prod.images?.[0] || rawItem?.image || '',
            selectedVariants: rawItem?.selectedVariants,
          })
        );
      }

      // Recompute authoritative coupon discount if couponCode supplied
      let authoritativeDiscount = 0;
      let cleanCouponCode: string | undefined;
      if (couponCode && String(couponCode).trim()) {
        const candidateCode = String(couponCode).trim().toUpperCase();
        const cSnap = await getDocs(
          query(collection(db, 'shops', shopId, 'coupons'), where('code', '==', candidateCode))
        );
        const couponDoc = cSnap.docs[0]?.data();
        if (couponDoc && couponDoc.isActive !== false) {
          const notExpired = !couponDoc.expiryDate || new Date(couponDoc.expiryDate).getTime() >= Date.now();
          const meetsMin = authoritativeSubtotal >= (Number(couponDoc.minOrderValue) || 0);
          const underLimit = !couponDoc.usageLimit || (Number(couponDoc.usageCount) || 0) < Number(couponDoc.usageLimit);
          if (notExpired && meetsMin && underLimit) {
            cleanCouponCode = candidateCode;
            if (couponDoc.discountType === 'percentage') {
              authoritativeDiscount = Math.round((authoritativeSubtotal * Number(couponDoc.discountValue || 0)) / 100);
            } else {
              authoritativeDiscount = Math.round(Number(couponDoc.discountValue || 0));
            }
            authoritativeDiscount = Math.min(authoritativeSubtotal, Math.max(0, authoritativeDiscount));
          }
        }
      }

      // Recompute authoritative shipping fee
      const baseShippingFee = Number(pubSettings.shippingFee ?? 250);
      const freeThreshold = Number(pubSettings.freeShippingThreshold ?? 5000);
      const authoritativeShipping =
        resolvedFulfillment === 'self_pickup' || (freeThreshold > 0 && authoritativeSubtotal >= freeThreshold)
          ? 0
          : Math.max(0, baseShippingFee);

      const authoritativeTotal = Math.max(
        0,
        authoritativeSubtotal + authoritativeShipping - authoritativeDiscount
      );

      const orderNumber = `PK-${Math.floor(100000 + Math.random() * 900000)}`;
      const orderId = `ord_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const trackingToken = generateServerTrackingToken();
      const trackingTokenHash = computeTrackingTokenHash(orderNumber, trackingToken);
      const trackingDocId = `trk_${trackingTokenHash.slice(0, 32)}`;
      const now = new Date().toISOString();

      const newOrder = stripUndefined({
        id: orderId,
        shopId,
        orderNumber,
        trackingTokenHash,
        userId: userId || 'guest',
        customer: {
          name: customer.name.trim(),
          email: customer.email ? customer.email.trim() : '',
          phone: customer.phone.trim(),
          address: customer.address.trim(),
          city: customer.city.trim(),
          postalCode: customer.postalCode ? customer.postalCode.trim() : 'N/A',
        },
        items: verifiedItems,
        subtotal: authoritativeSubtotal,
        shippingFee: authoritativeShipping,
        discount: authoritativeDiscount,
        total: authoritativeTotal,
        couponCode: cleanCouponCode,
        fulfillmentMethod: resolvedFulfillment,
        pickupDetails: resolvedFulfillment === 'self_pickup' ? pickupDetails : undefined,
        paymentMethod: resolvedPaymentMethod,
        paymentStatus: 'pending',
        orderStatus: 'Pending',
        notes: notes ? String(notes).trim() : undefined,
        bankSlipReference: bankSlipReference ? String(bankSlipReference).trim() : undefined,
        paymentReference: paymentReference ? String(paymentReference).trim() : undefined,
        senderAccountNumber: senderAccountNumber ? String(senderAccountNumber).trim() : undefined,
        paymentProofImage: paymentProofImage ? String(paymentProofImage) : undefined,
        createdAt: now,
        updatedAt: now,
      });

      const trackingDoc = stripUndefined({
        orderNumber,
        orderId,
        shopId,
        trackingTokenHash,
        orderStatus: 'Pending',
        fulfillmentMethod: newOrder.fulfillmentMethod,
        pickupDetails: newOrder.pickupDetails
          ? {
              locationName: newOrder.pickupDetails.locationName,
              address: newOrder.pickupDetails.address,
              city: newOrder.pickupDetails.city,
              timings: newOrder.pickupDetails.timings,
            }
          : undefined,
        paymentMethod: newOrder.paymentMethod,
        paymentStatus: 'pending',
        customerName: newOrder.customer.name.split(' ')[0] || 'Customer',
        city: newOrder.customer.city,
        items: verifiedItems.map((it: any) => ({
          productId: it.productId || '',
          title: it.title || '',
          price: Number(it.price) || 0,
          quantity: Number(it.quantity) || 1,
          image: it.image || '',
        })),
        total: newOrder.total,
        createdAt: now,
        updatedAt: now,
      });

      if (newOrder.userId === 'guest') {
        const batch = writeBatch(db);
        batch.set(doc(db, 'shops', shopId, 'orders', orderId), newOrder);
        batch.set(doc(db, 'shops', shopId, 'order_tracking', trackingDocId), trackingDoc);
        const notifId = `ntf_${Date.now()}`;
        batch.set(doc(db, 'shops', shopId, 'notifications', notifId), {
          id: notifId,
          title: `New Guest Order ${orderNumber}`,
          message: `${newOrder.customer.name} placed Rs. ${newOrder.total.toLocaleString()} order`,
          type: 'order',
          isRead: false,
          link: '/dashboard/orders',
          createdAt: now,
        });
        await batch.commit();
        return res.status(201).json({ ...newOrder, trackingToken });
      }

      return res.status(200).json({ ...newOrder, trackingToken, requiresClientAuthWrite: true });
    } catch (err: any) {
      console.error('Error creating tenant order on server:', err);
      return res.status(500).json({ error: err.message || 'Failed to place order' });
    }
  });

  // API Route: Token-Verified Non-PII Order Tracking (Strictly requires tracking token)
  app.get('/api/orders/track', async (req, res) => {
    const clientIp = req.ip || 'unknown';
    if (!checkRateLimit(clientIp, 'order-track', 40, 60_000)) {
      return res.status(429).json({ error: 'Too many tracking requests.' });
    }

    try {
      const shopId = sanitizeShopId(req.query.shopId);
      const ref = String(req.query.ref || '').trim().toUpperCase();
      const token = String(req.query.token || '').trim();
      if (!ref || !token) {
        return res.status(400).json({
          error: 'Order number and tracking token are required to view tracking status.',
        });
      }

      const expectedHash = computeTrackingTokenHash(ref, token);
      const trackingDocId = `trk_${expectedHash.slice(0, 32)}`;
      const trackSnap = await getDoc(doc(db, 'shops', shopId, 'order_tracking', trackingDocId));
      if (!trackSnap.exists()) {
        return res.status(404).json({ error: 'Order not found or invalid tracking token.' });
      }

      const td = trackSnap.data();
      if (!safeEqualHex(String(td.trackingTokenHash || ''), expectedHash)) {
        return res.status(403).json({ error: 'Invalid tracking token.' });
      }

      return res.json({
        id: td.orderId || ref,
        shopId,
        orderNumber: td.orderNumber,
        orderStatus: td.orderStatus,
        fulfillmentMethod: td.fulfillmentMethod || 'delivery',
        pickupDetails: td.pickupDetails,
        paymentMethod: td.paymentMethod,
        paymentStatus: td.paymentStatus,
        courierName: td.courierName,
        trackingNumber: td.trackingNumber,
        createdAt: td.createdAt,
        total: td.total,
        customer: { name: td.customerName, city: td.city },
        items: td.items || [],
      });
    } catch (err: any) {
      console.error('Error tracking order:', err);
      return res.status(500).json({ error: err.message || 'Tracking failed' });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
      }
      return res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Global Express Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled Express API error:', err);
    if (res.headersSent) return;
    res.status(err?.status || 500).json({
      error: err?.message || 'Internal server error',
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
