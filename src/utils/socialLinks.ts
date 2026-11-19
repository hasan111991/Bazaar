export type SocialPlatformKey =
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'linkedin'
  | 'whatsapp';

export interface SocialLinksMap {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  linkedin?: string;
  whatsapp?: string;
}

export interface NormalizedSocialEntry {
  platform: SocialPlatformKey;
  label: string;
  url: string;
}

const PLACEHOLDER_EXACT_PATHS = new Set([
  'facebook.com',
  'www.facebook.com',
  'fb.com',
  'instagram.com',
  'www.instagram.com',
  'tiktok.com',
  'www.tiktok.com',
  'youtube.com',
  'www.youtube.com',
  'linkedin.com',
  'www.linkedin.com',
  'wa.me',
  'api.whatsapp.com',
]);

const PLACEHOLDER_WA_NUMBERS = new Set(['923001234567', '03001234567', '3001234567']);

export const SOCIAL_PLATFORM_META: {
  key: SocialPlatformKey;
  label: string;
  placeholder: string;
  helper?: string;
}[] = [
  {
    key: 'facebook',
    label: 'Facebook Page',
    placeholder: 'https://facebook.com/yourstorename',
  },
  {
    key: 'instagram',
    label: 'Instagram Profile',
    placeholder: 'https://instagram.com/yourstorename',
  },
  {
    key: 'tiktok',
    label: 'TikTok Account',
    placeholder: 'https://tiktok.com/@yourstorename',
  },
  {
    key: 'youtube',
    label: 'YouTube Channel',
    placeholder: 'https://youtube.com/@yourstorename',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn Page',
    placeholder: 'https://linkedin.com/company/yourstorename',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp Business Link or Number',
    placeholder: 'https://wa.me/923001234567 or 03001234567',
    helper: 'Pakistani mobile numbers auto-convert to https://wa.me/92...',
  },
];

export function formatWhatsAppUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) return '';

  let normalized = digits;
  if (normalized.startsWith('0092')) {
    normalized = normalized.slice(2);
  } else if (normalized.startsWith('0') && normalized.length === 11) {
    normalized = `92${normalized.slice(1)}`;
  } else if (normalized.startsWith('3') && normalized.length === 10) {
    normalized = `92${normalized}`;
  }

  if (normalized.length < 10 || normalized.length > 15) {
    throw new Error('WhatsApp number must be a valid phone number or https://wa.me/... link.');
  }

  return `https://wa.me/${normalized}`;
}

export function isPlaceholderSocialUrl(url?: string): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '#') return true;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return true;

    const host = parsed.hostname.toLowerCase();
    const cleanPath = parsed.pathname.replace(/\/+$/, '');

    if (host.includes('example.com') || host === 'localhost') return true;

    if (PLACEHOLDER_EXACT_PATHS.has(host) && (!cleanPath || cleanPath === '/')) {
      return true;
    }

    if (host === 'wa.me') {
      const targetDigits = cleanPath.replace(/[^\d]/g, '');
      if (!targetDigits || PLACEHOLDER_WA_NUMBERS.has(targetDigits)) {
        return true;
      }
    }

    return false;
  } catch {
    return true;
  }
}

export function normalizeSocialUrl(platform: SocialPlatformKey, raw?: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';

  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    throw new Error(`Invalid URL protocol for ${platform}.`);
  }

  let candidate = trimmed;
  if (platform === 'whatsapp') {
    candidate = formatWhatsAppUrl(trimmed);
  } else if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate.replace(/^\/+/, '')}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(`Please enter a valid ${platform} URL (starting with https://).`);
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`Only http/https URLs are permitted for ${platform}.`);
  }

  if (!parsed.hostname.includes('.')) {
    throw new Error(`Please enter a complete domain URL for ${platform}.`);
  }

  return parsed.toString();
}

export function normalizeAndValidateSocialLinks(links?: SocialLinksMap): SocialLinksMap {
  if (!links) return {};
  const result: SocialLinksMap = {};
  const keys: SocialPlatformKey[] = [
    'facebook',
    'instagram',
    'tiktok',
    'youtube',
    'linkedin',
    'whatsapp',
  ];

  for (const key of keys) {
    const rawVal = links[key];
    if (!rawVal || !rawVal.trim()) continue;
    const normalized = normalizeSocialUrl(key, rawVal);
    if (normalized) {
      result[key] = normalized;
    }
  }
  return result;
}

export function getConfiguredSocialLinks(
  links?: SocialLinksMap,
  options?: { allowSampleWhatsApp?: boolean }
): NormalizedSocialEntry[] {
  if (!links) return [];
  const entries: NormalizedSocialEntry[] = [];

  for (const meta of SOCIAL_PLATFORM_META) {
    const raw = links[meta.key];
    if (!raw || !raw.trim()) continue;
    try {
      const normalized = normalizeSocialUrl(meta.key, raw);
      if (!normalized) continue;
      if (isPlaceholderSocialUrl(normalized)) {
        if (meta.key === 'whatsapp' && options?.allowSampleWhatsApp) {
          // Only bypass if caller explicitly wants demo WhatsApp
        } else {
          continue;
        }
      }
      entries.push({
        platform: meta.key,
        label: meta.label,
        url: normalized,
      });
    } catch {
      // Skip malformed URLs gracefully in public render
    }
  }

  return entries;
}

export function normalizeOptionalHttpUrl(raw?: string, fieldLabel = 'Website URL'): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    throw new Error(`Invalid URL protocol for ${fieldLabel}.`);
  }
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withProto);
  } catch {
    throw new Error(`Please enter a valid ${fieldLabel}.`);
  }
  if ((parsed.protocol !== 'https:' && parsed.protocol !== 'http:') || !parsed.hostname.includes('.')) {
    throw new Error(`Please enter a complete http/https ${fieldLabel}.`);
  }
  return parsed.toString();
}
