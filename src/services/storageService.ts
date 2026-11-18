import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { storage, db } from '../firebase/config';
import { compressPaymentProofImage } from '../utils/imageUpload';

export type StorageFolder = 'logo' | 'products' | 'banners' | 'categories' | 'pages' | 'payments' | 'subscription';

export interface UploadProgressOptions {
  shopId: string;
  folder: StorageFolder;
  subPath?: string; // e.g., productId
  onProgress?: (percent: number) => void;
  maxDimension?: number;
  allowDataUrlFallback?: boolean; // Useful when guest/demo checkout hits unprovisioned storage bucket CORS
}

export interface UploadedImageResult {
  url: string;
  storagePath?: string;
  bytes: number;
  usedFallback?: boolean;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateImageFile(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    throw new Error('Invalid image format. Please upload JPG, PNG, WebP, or GIF.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Image size exceeds 5 MB limit. Please pick a smaller image.');
  }
}

/**
 * Compresses an image client-side into a Blob (WebP/JPEG) before uploading to Firebase Storage
 * so mobile shoppers and store admins enjoy fast uploads and conserve storage quota.
 */
async function compressImageToBlob(file: File, maxDimension = 1400): Promise<Blob> {
  if (file.type === 'image/gif') return file;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not decode selected image.'));
    image.src = dataUrl;
  });

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width > maxDimension || height > maxDimension) {
    if (width >= height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;

  ctx.drawImage(img, 0, 0, width, height);

  return new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob || file);
      },
      'image/webp',
      0.85
    );
  });
}

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'image';
}

export async function uploadShopImage(
  file: File,
  options: UploadProgressOptions
): Promise<UploadedImageResult> {
  validateImageFile(file);

  const { shopId, folder, subPath, onProgress, maxDimension = 1400, allowDataUrlFallback = false } = options;

  // Enforce per-shop storage quota if uploading admin assets
  if (folder !== 'payments' && shopId) {
    try {
      const shopSnap = await getDoc(doc(db, 'shops', shopId));
      if (shopSnap.exists()) {
        const shopData = shopSnap.data();
        const usedBytes = Number(shopData?.usage?.storageBytes || 0);
        const planId = shopData?.subscription?.planId;
        if (planId) {
          const planSnap = await getDoc(doc(db, 'platform_plans', planId));
          if (planSnap.exists()) {
            const maxStorageBytes = Number(planSnap.data().maxStorageMB || 50) * 1024 * 1024;
            if (usedBytes + file.size > maxStorageBytes) {
              throw new Error(
                `Storage quota reached (${Math.round(usedBytes / (1024 * 1024))}MB / ${planSnap.data().maxStorageMB}MB). Upgrade your plan to upload more assets.`
              );
            }
          }
        }
      }
    } catch (quotaErr: any) {
      if (quotaErr?.message?.includes('Storage quota reached')) {
        throw quotaErr;
      }
    }
  }

  const processedBlob = await compressImageToBlob(file, maxDimension);
  const ext = processedBlob.type === 'image/webp' ? 'webp' : file.name.split('.').pop() || 'jpg';
  const baseName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ''));
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${baseName}.${ext}`;

  const pathSegments = ['shops', shopId, folder];
  if (subPath) pathSegments.push(subPath);
  pathSegments.push(fileName);
  const storagePath = pathSegments.join('/');

  try {
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, processedBlob, {
      contentType: processedBlob.type || file.type,
    });

    const downloadUrl = await new Promise<string>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (onProgress && snapshot.totalBytes > 0) {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            onProgress(pct);
          }
        },
        (err) => reject(err),
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        }
      );
    });

    // Record storage usage on shop doc
    if (folder !== 'payments' && shopId) {
      try {
        await updateDoc(doc(db, 'shops', shopId), {
          'usage.storageBytes': increment(processedBlob.size),
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Could not increment shop storageBytes:', e);
      }
    }

    onProgress?.(100);
    return {
      url: downloadUrl,
      storagePath,
      bytes: processedBlob.size,
      usedFallback: false,
    };
  } catch (storageErr: any) {
    console.warn('Firebase Storage upload error:', storageErr);
    if (allowDataUrlFallback) {
      const fallbackDataUrl = await compressPaymentProofImage(file, {
        maxDimension: 900,
        maxLength: 220_000,
      });
      onProgress?.(100);
      return {
        url: fallbackDataUrl,
        bytes: fallbackDataUrl.length,
        usedFallback: true,
      };
    }
    throw new Error(
      storageErr?.code === 'storage/unauthorized'
        ? 'Firebase Storage rules have not been deployed or you lack upload permissions. Ensure storage.rules are deployed.'
        : storageErr?.message || 'Failed to upload image to Firebase Storage.'
    );
  }
}

export async function deleteStorageImageByUrl(url?: string, shopId?: string): Promise<void> {
  if (!url || !url.includes('firebasestorage.googleapis.com')) return;
  try {
    const imageRef = ref(storage, url);
    await deleteObject(imageRef);
    if (shopId) {
      // Best-effort estimate reduction (50 KB avg) without negative underflow
      try {
        const shopSnap = await getDoc(doc(db, 'shops', shopId));
        if (shopSnap.exists()) {
          const current = Number(shopSnap.data()?.usage?.storageBytes || 0);
          const next = Math.max(0, current - 50_000);
          await updateDoc(doc(db, 'shops', shopId), { 'usage.storageBytes': next });
        }
      } catch {}
    }
  } catch (err) {
    console.warn('Storage image delete note:', err);
  }
}
