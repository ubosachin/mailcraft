'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Search,
  ArrowRight,
  Eye,
  Sparkles,
  X,
  Smartphone,
  Monitor,
  Maximize2,
  CheckCircle2,
  SlidersHorizontal,
  Loader2,
  Tag,
  Layers,
} from 'lucide-react';
import { compileEmail, ALL_TEMPLATES, TemplateDefinition } from '@mailcraft/email-renderer';

interface CategoryFilter {
  id: string;
  label: string;
}

const CATEGORIES: CategoryFilter[] = [
  { id: 'all', label: 'All Templates' },
  { id: 'ecommerce', label: 'Ecommerce' },
  { id: 'fashion', label: 'Fashion' },
  { id: 'technology', label: 'Technology' },
  { id: 'food', label: 'Food & Restaurant' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'festival', label: 'Festival' },
  { id: 'discounts', label: 'Discounts & Offers' },
  { id: 'product_launches', label: 'Product Launch' },
  { id: 'welcome', label: 'Welcome Emails' },
];

export default function TemplatesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortOption, setSortOption] = useState<'featured' | 'name' | 'newest'>('featured');
  const [previewTemplate, setPreviewTemplate] = useState<TemplateDefinition | null>(null);
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile' | 'full'>('desktop');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [cloningSlug, setCloningSlug] = useState<string | null>(null);
  const [userBrand, setUserBrand] = useState<{
    brandName?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    footerAddress?: string;
  } | null>(null);

  // Verify user auth and load brand
  useEffect(() => {
    fetch('/api/v1/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((authData) => {
        if (!authData?.data?.authenticated) {
          router.replace('/login?redirect=/templates');
          return;
        }
        return fetch('/api/v1/brands/current')
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.data) {
              setUserBrand(data.data);
            }
          });
      })
      .catch(() => {});
  }, [router]);

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    return ALL_TEMPLATES.filter((t) => {
      let matchesCat = selectedCategory === 'all';
      if (!matchesCat) {
        if (selectedCategory === 'festival') {
          matchesCat = t.category === 'festival' || t.category === 'festivals';
        } else if (selectedCategory === 'product_launches') {
          matchesCat = t.category === 'product_launches' || t.category === 'product_launch';
        } else {
          matchesCat = t.category === selectedCategory;
        }
      }

      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.recommendedFor.toLowerCase().includes(q) ||
        t.features.some((f) => f.toLowerCase().includes(q));

      return matchesCat && matchesSearch;
    }).sort((a, b) => {
      if (sortOption === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortOption === 'newest') {
        return b.version - a.version;
      }
      return (a.isPremium ? 1 : -1) - (b.isPremium ? 1 : -1);
    });
  }, [search, selectedCategory, sortOption]);

  // Open Preview Modal
  const handleOpenPreview = (template: TemplateDefinition) => {
    setPreviewTemplate(template);
    setPreviewViewport('desktop');

    // Compile actual email HTML using brand if available
    const rendered = compileEmail({
      schema: template.editorSchema,
      brand: userBrand || {
        brandName: 'MailCraft Studio',
        senderName: 'Founder',
        primaryColor: '#4F46E5',
        secondaryColor: '#10B981',
        footerAddress: '100 Silicon Way, Suite 400, San Francisco, CA 94107',
        website: 'https://mailcraft.dev',
      },
      recipient: {
        name: 'Sarah Connor',
        firstName: 'Sarah',
        email: 'sarah@example.com',
        unsubscribeUrl: 'https://mailcraft.dev/unsubscribe/sample_token',
      },
      campaign: {
        subject: `[Design Preview] ${template.name}`,
        preheader: template.description,
      },
    });

    setPreviewHtml(rendered.html);
  };

  // "Use Template" action
  const handleUseTemplate = async (template: TemplateDefinition) => {
    setCloningSlug(template.slug);
    try {
      // 1. Check authentication status
      const meRes = await fetch('/api/v1/auth/me');
      const meData = await meRes.json();
      if (!meRes.ok || !meData.data?.authenticated) {
        router.push('/login?redirect=/templates');
        return;
      }

      // 2. Clone template into a new Campaign
      const cloneRes = await fetch(`/api/v1/templates/${template.slug}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName: `${template.name} Campaign`,
        }),
      });

      const cloneData = await cloneRes.json();
      if (cloneData.data?.campaignId) {
        router.push(`/editor/${cloneData.data.campaignId}`);
        return;
      }

      // Fallback: take user to workspace
      router.push('/workspace');
    } catch (err) {
      console.error('Failed to clone template:', err);
      router.push('/workspace');
    } finally {
      setCloningSlug(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <Mail className="w-5 h-5" />
            </div>
            <span className="text-lg font-black tracking-tight text-slate-900">
              Mail<span className="text-indigo-600">Craft</span>
            </span>
          </Link>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link
              href="/workspace"
              className="text-slate-600 hover:text-indigo-600 transition"
            >
              Workspace
            </Link>
            <button
              onClick={() => {
                fetch('/api/v1/auth/logout', { method: 'POST' }).then(() => {
                  window.location.href = '/login';
                });
              }}
              className="text-slate-600 hover:text-rose-600 transition"
            >
              Log Out
            </button>
            <Link
              href="/workspace"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs flex items-center gap-1.5"
            >
              Open Studio <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Responsive Email Design System
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Choose Your Email Design
          </h1>
          <p className="text-base text-slate-600 mt-2.5 leading-relaxed">
            Find a professional email template that matches your brand and campaign. Every design is built with responsive tables and tested across Gmail, Apple Mail, and Outlook.
          </p>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-8 space-y-4">
          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search templates by name, keyword, or use case..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 text-xs">
              <span className="text-slate-500 font-medium">
                Showing <strong className="text-slate-900 font-bold">{filteredTemplates.length}</strong> of{' '}
                {ALL_TEMPLATES.length} designs
              </span>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as typeof sortOption)}
                  className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="featured">Featured First</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="newest">Latest Version</option>
                </select>
              </div>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-slate-100 pt-3">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Template Cards Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">No templates found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              We couldn’t find any email design matching &quot;{search}&quot;. Try resetting your filters.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('all');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {filteredTemplates.map((template) => {
              const isCloning = cloningSlug === template.slug;
              return (
                <div
                  key={template.slug}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col group"
                >
                  {/* Thumbnail Card with Hover Overlay */}
                  <div className="relative aspect-4/3 overflow-hidden bg-slate-100 border-b border-slate-100">
                    <img
                      src={template.thumbnail}
                      alt={template.name}
                      loading="lazy"
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Category & Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-md bg-white/95 backdrop-blur-xs text-[11px] font-bold text-slate-800 uppercase tracking-wider shadow-xs border border-white/40">
                        {template.category.replace('_', ' ')}
                      </span>
                      {template.isPremium && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                          PRO
                        </span>
                      )}
                    </div>

                    {/* Quick Preview Hover Action */}
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-2xs">
                      <button
                        onClick={() => handleOpenPreview(template)}
                        className="px-4 py-2 rounded-xl bg-white text-slate-900 font-bold text-xs shadow-md hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Full Preview
                      </button>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition">
                          {template.name}
                        </h3>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {template.editorSchema.blocks.length} blocks
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
                        {template.description}
                      </p>

                      {/* Feature Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-5">
                        {template.features.slice(0, 3).map((feat, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-medium text-slate-600"
                          >
                            {feat}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => handleOpenPreview(template)}
                        className="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </button>

                      <button
                        onClick={() => handleUseTemplate(template)}
                        disabled={isCloning}
                        className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {isCloning ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" /> Use Template
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Sandboxed Email Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Top Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                  {previewTemplate.name[0]}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    {previewTemplate.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 capitalize">
                    {previewTemplate.category.replace('_', ' ')} &bull; {previewTemplate.editorSchema.blocks.length} configurable blocks
                  </p>
                </div>
              </div>

              {/* Viewport Controls */}
              <div className="hidden sm:flex items-center bg-slate-200/70 p-1 rounded-xl">
                <button
                  onClick={() => setPreviewViewport('desktop')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    previewViewport === 'desktop'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" /> Desktop (600px)
                </button>
                <button
                  onClick={() => setPreviewViewport('mobile')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    previewViewport === 'mobile'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" /> Mobile (375px)
                </button>
                <button
                  onClick={() => setPreviewViewport('full')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    previewViewport === 'full'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Fluid Width
                </button>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setPreviewTemplate(null)}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-600 hover:text-slate-900 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Sandboxed Iframe Canvas */}
            <div className="flex-1 bg-slate-100 overflow-y-auto flex items-center justify-center p-4 sm:p-6">
              <div
                className={`transition-all duration-300 bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200 h-full flex flex-col ${
                  previewViewport === 'desktop'
                    ? 'w-[640px]'
                    : previewViewport === 'mobile'
                    ? 'w-[375px]'
                    : 'w-full max-w-4xl'
                }`}
              >
                <iframe
                  title={`Preview of ${previewTemplate.name}`}
                  srcDoc={previewHtml}
                  sandbox="allow-same-origin"
                  className="w-full h-full border-0 flex-1 bg-white"
                />
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  Recommended for: <strong className="text-slate-900">{previewTemplate.recommendedFor}</strong>
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                >
                  Back to Library
                </button>
                <button
                  onClick={() => handleUseTemplate(previewTemplate)}
                  disabled={cloningSlug === previewTemplate.slug}
                  className="flex-1 sm:flex-none px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-2"
                >
                  {cloningSlug === previewTemplate.slug ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing Campaign...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Use This Design
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
