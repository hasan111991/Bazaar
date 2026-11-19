import React, { useEffect, useState } from 'react';
import { Save, CheckCircle2, AlertCircle, Globe, ExternalLink } from 'lucide-react';
import { useDashboard } from './DashboardContext';
import {
  updateShopSettings,
  getShopPageContent,
  saveShopPageContent,
} from '../services/tenantService';
import { StoreSettings, ShopPageContent } from '../types';
import { ImageUploader } from '../components/common/ImageUploader';
import { SOCIAL_PLATFORM_META, getConfiguredSocialLinks } from '../utils/socialLinks';

const PAGE_KEYS: { key: ShopPageContent['key']; label: string }[] = [
  { key: 'about', label: 'About Store' },
  { key: 'faq', label: 'FAQ' },
  { key: 'return-policy', label: 'Return Policy' },
  { key: 'terms', label: 'Terms & Conditions' },
  { key: 'privacy', label: 'Privacy Policy' },
];

export const ShopAppearancePage: React.FC = () => {
  const { shopId, settings, refreshDashboard, isReadOnly } = useDashboard();
  const [form, setForm] = useState<StoreSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);

  const [activePageKey, setActivePageKey] = useState<ShopPageContent['key']>('about');
  const [pageTitle, setPageTitle] = useState('About Store');
  const [pageBody, setPageBody] = useState('');
  const [pageImageUrl, setPageImageUrl] = useState('');
  const [pageSavedMsg, setPageSavedMsg] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [savingPage, setSavingPage] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  useEffect(() => {
    if (!shopId) return;
    setPageError(null);
    getShopPageContent(shopId, activePageKey)
      .then((p) => {
        if (p) {
          setPageTitle(p.title);
          setPageBody(p.content);
          setPageImageUrl(p.imageUrl || '');
        } else {
          setPageTitle(PAGE_KEYS.find((k) => k.key === activePageKey)?.label || 'Page');
          setPageBody('');
          setPageImageUrl('');
        }
      })
      .catch((err: any) => {
        setPageError(err?.message || 'Could not load CMS page content.');
      });
  }, [shopId, activePageKey]);

  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setSaving(true);
    setSavedMsg(false);
    setThemeError(null);
    try {
      await updateShopSettings(shopId, {
        siteName: form.siteName,
        announcement: form.announcement,
        primaryColor: form.primaryColor,
        accentColor: form.accentColor,
        businessHours: form.businessHours,
        seoTitle: form.seoTitle,
        seoDescription: form.seoDescription,
        logoUrl: form.logoUrl,
        websiteUrl: form.websiteUrl,
        ogImageUrl: form.ogImageUrl,
        socialLinks: form.socialLinks,
      });
      await refreshDashboard();
      setSavedMsg(true);
    } catch (err: any) {
      setThemeError(err?.message || 'Failed to save storefront branding and social links.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePage = async () => {
    if (isReadOnly) return;
    setPageSavedMsg(false);
    setPageError(null);
    setSavingPage(true);
    try {
      await saveShopPageContent(shopId, {
        key: activePageKey,
        title: pageTitle,
        content: pageBody,
        imageUrl: pageImageUrl || undefined,
        updatedAt: new Date().toISOString(),
      });
      setPageSavedMsg(true);
    } catch (err: any) {
      setPageError(err?.message || 'Could not save CMS page content.');
    } finally {
      setSavingPage(false);
    }
  };

  const liveSocialPreview = getConfiguredSocialLinks(form.socialLinks);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Storefront Appearance, Social Links &amp; CMS Pages</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Customize your store logo, brand colors, SEO/OpenGraph tags, storefront social links, and informational pages.
        </p>
      </div>

      <form onSubmit={handleSaveTheme} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-extrabold text-slate-900">Brand Identity, SEO &amp; Theme</h3>
          {!isReadOnly && (
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#065F46] hover:bg-emerald-900 disabled:opacity-60 text-white rounded-xl font-bold flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Appearance'}
            </button>
          )}
        </div>

        {savedMsg && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> Storefront appearance &amp; social links saved!
          </div>
        )}

        {themeError && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" /> {themeError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Store Display Name</label>
            <input
              type="text"
              value={form.siteName}
              onChange={(e) => setForm({ ...form, siteName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Top Announcement Bar</label>
            <input
              type="text"
              value={form.announcement}
              onChange={(e) => setForm({ ...form, announcement: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Primary Brand Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.primaryColor || '#065f46'}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                className="w-10 h-9 rounded border border-slate-200 cursor-pointer"
              />
              <input
                type="text"
                value={form.primaryColor || '#065f46'}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Secondary Accent Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.accentColor || '#d97706'}
                onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                className="w-10 h-9 rounded border border-slate-200 cursor-pointer"
              />
              <input
                type="text"
                value={form.accentColor || '#d97706'}
                onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Business Hours</label>
            <input
              type="text"
              value={form.businessHours || ''}
              onChange={(e) => setForm({ ...form, businessHours: e.target.value })}
              placeholder="Mon - Sat: 10:00 AM - 10:00 PM"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">External Website URL (Optional)</label>
            <div className="relative">
              <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={form.websiteUrl || ''}
                onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                placeholder="https://yourstore.pk"
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Store SEO Title (Google Search &amp; OpenGraph)
            </label>
            <input
              type="text"
              maxLength={70}
              value={form.seoTitle || ''}
              onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
              placeholder={`${form.siteName || 'Your Store'} – Online Store in ${form.city || 'Pakistan'}`}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Social Share OG Image URL (Optional)
            </label>
            <input
              type="url"
              value={form.ogImageUrl || ''}
              onChange={(e) => setForm({ ...form, ogImageUrl: e.target.value })}
              placeholder="https://... (defaults to store logo)"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">
              Store SEO Meta Description (max 160 chars)
            </label>
            <textarea
              rows={2}
              maxLength={160}
              value={form.seoDescription || ''}
              onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
              placeholder="Describe your store, top categories, city & delivery/pickup options for Google Search..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
        </div>

        <ImageUploader
          shopId={shopId}
          folder="logo"
          images={form.logoUrl ? [form.logoUrl] : []}
          onChange={(imgs) => setForm({ ...form, logoUrl: imgs[0] || '' })}
          label="Store Logo (PNG / WebP)"
        />

        {/* Store Social Media Links Section */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">Store Social Media Links</h4>
              <p className="text-[11px] text-slate-500">
                Only configured accounts are shown inside your public storefront footer. Leave empty to hide.
              </p>
            </div>
            {liveSocialPreview.length > 0 && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                {liveSocialPreview.length} active storefront {liveSocialPreview.length === 1 ? 'link' : 'links'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {SOCIAL_PLATFORM_META.map((meta) => (
              <div key={meta.key}>
                <label className="block font-semibold text-slate-700 mb-1">{meta.label}</label>
                <input
                  type="text"
                  value={form.socialLinks?.[meta.key] || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      socialLinks: {
                        ...(form.socialLinks || {}),
                        [meta.key]: e.target.value,
                      },
                    })
                  }
                  placeholder={meta.placeholder}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
                {meta.helper && (
                  <p className="text-[10px] text-slate-400 mt-1">{meta.helper}</p>
                )}
              </div>
            ))}
          </div>

          {liveSocialPreview.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-slate-500 font-semibold">Footer Preview:</span>
              {liveSocialPreview.map((item) => (
                <a
                  key={item.platform}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 border border-slate-200 text-slate-700 text-[11px] font-semibold transition"
                >
                  <span>{item.label}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          )}
        </div>
      </form>

      {/* Store CMS Pages Editor */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <h3 className="text-sm font-extrabold text-slate-900">Storefront CMS Pages</h3>
          <div className="flex flex-wrap gap-1.5">
            {PAGE_KEYS.map((pk) => (
              <button
                key={pk.key}
                type="button"
                onClick={() => setActivePageKey(pk.key)}
                className={`px-3 py-1.5 rounded-lg font-semibold ${
                  activePageKey === pk.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {pk.label}
              </button>
            ))}
          </div>
        </div>

        {pageSavedMsg && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg font-semibold">
            Page content saved for /{activePageKey}.
          </div>
        )}

        {pageError && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {pageError}
          </div>
        )}

        <input
          type="text"
          value={pageTitle}
          onChange={(e) => setPageTitle(e.target.value)}
          placeholder="Page Heading"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold"
        />
        <ImageUploader
          shopId={shopId}
          folder="pages"
          images={pageImageUrl ? [pageImageUrl] : []}
          onChange={(imgs) => setPageImageUrl(imgs[0] || '')}
          label="Optional Page Header Banner (Firebase Storage)"
        />
        <textarea
          rows={6}
          value={pageBody}
          onChange={(e) => setPageBody(e.target.value)}
          placeholder="Enter custom store policy, story, or FAQ text (leave blank to use default Pakistani retail template)..."
          className="w-full px-3 py-2 border border-slate-200 rounded-lg"
        />
        {!isReadOnly && (
          <button
            type="button"
            disabled={savingPage}
            onClick={handleSavePage}
            className="px-4 py-2 bg-[#065F46] hover:bg-emerald-900 disabled:opacity-60 text-white rounded-xl font-bold"
          >
            {savingPage ? 'Saving Page...' : 'Save Page Content'}
          </button>
        )}
      </div>
    </div>
  );
};
