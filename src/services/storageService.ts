import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  getMetadata,
} from 'firebase/storage';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { storage, db, auth } from '../firebase/config';

export type StorageFolder =
  | 'logo'
  | 'products'
  | 'banners'
  | 'categories'
  | 'pages'
  | 'payments'
  | 'subscription';

export interface UploadProgressOptions {
  shopId: string;
  folder: StorageFolder;
  subPath?: string; // e.g., productId or orderSessionId
  onProgress?: (percent: number) => void;
  maxDimension?: number;
}

export interface UploadedImageResult {
  url: string;
  storagePath: string;
  bytes: number;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateImageFile(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    throw new Error('Invalid image format. Please upload JPG, PNG, WebP, or GIF.');
  }
  if (file.size <= 0) {
    throw new Error('Selected image file is empty.');
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
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'image'
  );
}

export async function uploadShopImage(
  file: File,
  options: UploadProgressOptions
): Promise<UploadedImageResult> {
  validateImageFile(file);

  const { shopId, folder, subPath, onProgress, maxDimension = 1400 } = options;

  // Enforce per-shop storage quota if uploading admin assets
  if (folder !== 'payments' && shopId) {
    const shopSnap = await getDoc(doc(db, 'shops', shopId)).catch(() => null);
    if (shopSnap && shopSnap.exists()) {
      const shopData = shopSnap.data();
      const usedBytes = Number(shopData?.usage?.storageBytes || 0);
      const planId = shopData?.subscription?.planId;
      if (planId) {
        const planSnap = await getDoc(doc(db, 'platform_plans', planId)).catch(() => null);
        if (planSnap && planSnap.exists()) {
          const maxStorageBytes = Number(planSnap.data().maxStorageMB || 50) * 1024 * 1024;
          if (usedBytes + file.size > maxStorageBytes) {
            throw new Error(
              `Storage quota reached (${Math.round(usedBytes / (1024 * 1024))} MB / ${planSnap.data().maxStorageMB} MB). Delete unused assets or upgrade your plan.`
            );
          }
        }
      }
    }
  }

  const processedBlob = await compressImageToBlob(file, maxDimension);
  if (processedBlob.size > MAX_UPLOAD_BYTES) {
    throw new Error('Processed image still exceeds 5 MB limit.');
  }

  const ext = processedBlob.type === 'image/webp' ? 'webp' : file.name.split('.').pop() || 'jpg';
  const baseName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ''));
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${baseName}.${ext}`;

  let storagePath: string;
  if (folder === 'payments') {
    const sessionSegment = subPath || `sess_${Date.now()}`;
    storagePath = `shops/${shopId}/payments/${sessionSegment}/${fileName}`;
  } else {
    const pathSegments = ['shops', shopId, folder];
    if (subPath) pathSegments.push(subPath);
    pathSegments.push(fileName);
    storagePath = pathSegments.join('/');
  }

  const customMetadata: Record<string, string> = {
    shopId,
    folder,
    uploaderUid: auth.currentUser?.uid || 'guest',
  };
  if (folder === 'payments') {
    customMetadata.purpose = 'checkout_payment_proof';
  }

  try {
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, processedBlob, {
      contentType: processedBlob.type || file.type,
      customMetadata,
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

    // Record exact storage usage bytes on shop doc
    if (folder !== 'payments' && shopId) {
      await updateDoc(doc(db, 'shops', shopId), {
        'usage.storageBytes': increment(processedBlob.size),
        updatedAt: new Date().toISOString(),
      }).catch((e) => console.warn('Could not increment shop storageBytes:', e));
    }

    onProgress?.(100);
    return {
      url: downloadUrl,
      storagePath,
      bytes: processedBlob.size,
    };
  } catch (storageErr: any) {
    console.warn('Firebase Storage upload error:', storageErr);
    throw new Error(
      storageErr?.code === 'storage/unauthorized'
        ? 'Upload denied by Firebase Storage rules. Verify you are signed into this store workspace and storage.rules & custom claims are deployed.'
        : storageErr?.message || 'Failed to upload image to Firebase Storage.'
    );
  }
}

export async function uploadPlatformSubscriptionProof(
  shopId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadedImageResult> {
  validateImageFile(file);
  const processedBlob = await compressImageToBlob(file, 1200);
  const ext = processedBlob.type === 'image/webp' ? 'webp' : 'jpg';
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}_receipt.${ext}`;
  const storagePath = `platform/payments/${shopId}/${fileName}`;

  const storageRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageRef, processedBlob, {
    contentType: processedBlob.type || file.type,
    customMetadata: {
      shopId,
      purpose: 'subscription_payment_receipt',
      uploaderUid: auth.currentUser?.uid || 'unknown',
    },
  });

  const downloadUrl = await new Promise<string>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
        }
      },
      (err) => reject(err),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(url);
      }
    );
  });

  onProgress?.(100);
  return { url: downloadUrl, storagePath, bytes: processedBlob.size };
}

export async function uploadUserProfileAvatar(
  userId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadedImageResult> {
  validateImageFile(file);
  const processedBlob = await compressImageToBlob(file, 600);
  const ext = processedBlob.type === 'image/webp' ? 'webp' : 'jpg';
  const storagePath = `users/${userId}/profile/${Date.now()}_avatar.${ext}`;
  const storageRef = ref(storage, storagePath);

  const uploadTask = uploadBytesResumable(storageRef, processedBlob, {
    contentType: processedBlob.type || file.type,
    customMetadata: { userId, purpose: 'profile_avatar' },
  });

  const downloadUrl = await new Promise<string>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
        }
      },
      (err) => reject(err),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(url);
      }
    );
  });

  onProgress?.(100);
  return { url: downloadUrl, storagePath, bytes: processedBlob.size };
}

export async function deleteStorageImageByUrl(url?: string, shopId?: string): Promise<void> {
  if (!url || !url.includes('firebasestorage.googleapis.com')) return;
  try {
    const imageRef = ref(storage, url);
    let exactBytes = 0;
    try {
      const meta = await getMetadata(imageRef);
      exactBytes = Number(meta.size || 0);
    } catch {
      exactBytes = 0;
    }

    await deleteObject(imageRef);

    if (shopId && exactBytes > 0) {
      const shopSnap = await getDoc(doc(db, 'shops', shopId)).catch(() => null);
      if (shopSnap && shopSnap.exists()) {
        const current = Number(shopSnap.data()?.usage?.storageBytes || 0);
        const next = Math.max(0, current - exactBytes);
        await updateDoc(doc(db, 'shops', shopId), { 'usage.storageBytes': next }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('Storage image delete note:', err);
  }
}
