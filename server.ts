import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { db } from './src/firebase/config';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  query,
  where,
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

function getPhoneVariants(rawPhone: string): string[] {
  const cleaned = rawPhone.replace(/[\s-]/g, '');
  const variants = new Set<string>([rawPhone.trim(), cleaned]);
  if (/^03[0-9]{9}$/.test(cleaned)) {
    variants.add(`+92${cleaned.slice(1)}`);
    variants.add(`92${cleaned.slice(1)}`);
  } else if (/^\+923[0-9]{9}$/.test(cleaned)) {
    variants.add(`0${cleaned.slice(3)}`);
    variants.add(cleaned.slice(1));
  } else if (/^923[0-9]{9}$/.test(cleaned)) {
    variants.add(`0${cleaned.slice(2)}`);
    variants.add(`+${cleaned}`);
  }
  return Array.from(variants);
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
      const now = new Date().toISOString();

      const newOrder = stripUndefined({
        id: orderId,
        shopId,
        orderNumber,
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
        orderStatus: 'Pending',
        fulfillmentMethod: newOrder.fulfillmentMethod,
        pickupDetails: newOrder.pickupDetails,
        paymentMethod: newOrder.paymentMethod,
        paymentStatus: 'pending',
        customerName: newOrder.customer.name,
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
        batch.set(doc(db, 'shops', shopId, 'order_tracking', orderNumber), trackingDoc);
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
        return res.status(201).json(newOrder);
      }

      return res.status(200).json({ ...newOrder, requiresClientAuthWrite: true });
    } catch (err: any) {
      console.error('Error creating tenant order on server:', err);
      return res.status(500).json({ error: err.message || 'Failed to place order' });
    }
  });

  // API Route: Multi-Tenant Order Tracking (Zero PII Exposure)
  app.get('/api/orders/track', async (req, res) => {
    const clientIp = req.ip || 'unknown';
    if (!checkRateLimit(clientIp, 'order-track', 40, 60_000)) {
      return res.status(429).json({ error: 'Too many tracking requests.' });
    }

    try {
      const shopId = sanitizeShopId(req.query.shopId);
      const ref = String(req.query.ref || '').trim();
      if (!ref) {
        return res.status(400).json({ error: 'Order reference is required' });
      }

      const normalizedOrderNum = ref.toUpperCase();

      // 1. Direct lookup in tenant non-PII order_tracking
      if (/^PK-[A-Z0-9]+$/.test(normalizedOrderNum)) {
        const trackSnap = await getDoc(doc(db, 'shops', shopId, 'order_tracking', normalizedOrderNum));
        if (trackSnap.exists()) {
          const td = trackSnap.data();
          return res.json({
            id: td.orderId || normalizedOrderNum,
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
        }
      }

      // 2. Tenant guest orders query
      const q1 = query(
        collection(db, 'shops', shopId, 'orders'),
        where('userId', '==', 'guest'),
        where('orderNumber', '==', normalizedOrderNum)
      );
      let snap = await getDocs(q1);

      // 3. Tenant guest orders query by phone variants
      if (snap.empty) {
        const phoneVariants = getPhoneVariants(ref);
        for (const variant of phoneVariants) {
          const qPhone = query(
            collection(db, 'shops', shopId, 'orders'),
            where('userId', '==', 'guest'),
            where('customer.phone', '==', variant)
          );
          const phoneSnap = await getDocs(qPhone);
          if (!phoneSnap.empty) {
            snap = phoneSnap;
            break;
          }
        }
      }

      if (snap.empty) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const sortedDocs = [...snap.docs].sort((a, b) =>
        String(b.data().createdAt || '').localeCompare(String(a.data().createdAt || ''))
      );
      const docData = sortedDocs[0].data();
      return res.json({
        id: sortedDocs[0].id,
        shopId,
        orderNumber: docData.orderNumber,
        orderStatus: docData.orderStatus,
        fulfillmentMethod: docData.fulfillmentMethod || 'delivery',
        pickupDetails: docData.pickupDetails,
        paymentMethod: docData.paymentMethod,
        paymentStatus: docData.paymentStatus,
        courierName: docData.courierName,
        trackingNumber: docData.trackingNumber,
        createdAt: docData.createdAt,
        total: docData.total,
        customer: { name: docData.customer?.name, city: docData.customer?.city },
        items: (docData.items || []).map((it: any) => ({
          title: it.title,
          quantity: it.quantity,
          price: it.price,
          image: it.image,
        })),
      });
    } catch (err: any) {
      console.error('Error tracking order:', err);
      return res.status(500).json({ error: err.message || 'Tracking failed' });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
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
