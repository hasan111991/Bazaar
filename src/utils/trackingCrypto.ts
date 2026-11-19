/**
 * Cryptographic order tracking token utilities.
 * Uses Web Crypto API in browsers and Node WebCrypto in tests/server so
 * both client and backend derive identical SHA-256 lookup IDs (`trk_<32hex>`).
 */

export function generateTrackingToken(): string {
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Node fallback when crypto.subtle is unavailable
  const nodeCrypto = await import('node:crypto');
  return nodeCrypto.createHash('sha256').update(input).digest('hex');
}

export async function deriveTrackingTokenHash(orderNumber: string, token: string): Promise<string> {
  return sha256Hex(`${orderNumber.trim().toUpperCase()}:${token.trim()}`);
}

export async function deriveTrackingDocId(orderNumber: string, token: string): Promise<string> {
  const hash = await deriveTrackingTokenHash(orderNumber, token);
  return `trk_${hash.slice(0, 32)}`;
}
