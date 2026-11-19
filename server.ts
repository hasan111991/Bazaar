import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { db } from './src/firebase/config';
import {
  doc,
  getDoc,
  writeBatch,
} from 'firebase/firestore';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
  }

  // API Route: Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, mode: 'multi-tenant-saas', timestamp: new Date().toISOString() });
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

  // API Route: Multi-Tenant Guest Order Creation
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
        subtotal,
        shippingFee,
        discount,
        total,
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
        items,
        subtotal: Number(subtotal) || 0,
        shippingFee: Number(shippingFee) || 0,
        discount: Number(discount) || 0,
        total: Number(total) || 0,
        couponCode: couponCode || undefined,
        fulfillmentMethod: fulfillmentMethod === 'self_pickup' ? 'self_pickup' : 'delivery',
        pickupDetails: fulfillmentMethod === 'self_pickup' ? pickupDetails : undefined,
        paymentMethod: paymentMethod || 'cod',
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
        items: (items || []).map((it: any) => ({
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
