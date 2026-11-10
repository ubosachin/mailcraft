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
  Copy,
  Check,
  Layers,
} from 'lucide-react';
import { ALL_TEMPLATES, TemplateDefinition } from '@mailcraft/email-renderer';
import { DashboardHeader } from '@/components/DashboardHeader';
import { ScaledEmailThumb } from '@/components/ScaledEmailThumb';
import {
  compileTemplatePreview,
  extractTemplatePalette,
  PreviewBrandInput,
} from '@/lib/template-preview';

interface CategoryFilter {
  id: string;
  label: string;
}

const CATEGORIES: CategoryFilter[] = [
  { id: 'all', label: 'All Templates' },
  { id: 'technology', label: 'Technology & SaaS' },
  { id: 'corporate', label: 'Newsletter & Corporate' },
  { id: 'ecommerce', label: 'Ecommerce' },
  { id: 'product_launches', label: 'Product & Keynote' },
  { id: 'welcome', label: 'Welcome Emails' },
  { id: 'discounts', label: 'Discounts & Drops' },
  { id: 'fashion', label: 'Fashion & Editorial' },
  { id: 'food', label: 'Food & Hospitality' },
  { id: 'festival', label: 'Seasonal & Festive' },
];

function matchesCategory(template: TemplateDefinition, categoryId: string): boolean {
  if (categoryId === 'all') return true;
  if (categoryId === 'festival') {
    return template.category === 'festival' || template.category === 'festivals';
  }
  if (categoryId === 'product_launches') {
    return template.category === 'product_launches' || template.category === 'product_launch';
  }
  return template.category === categoryId;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [releaseFilter, setReleaseFilter] = useState<'all' | 'modern' | 'pro'>('all');
  const [sortOption, setSortOption] = useState<'featured' | 'name' | 'newest'>('featured');
  const [previewTemplate, setPreviewTemplate] = useState<TemplateDefinition | null>(null);
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile' | 'full'>('desktop');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [cloningSlug, setCloningSlug] = useState<string | null>(null);
  const [userBrand, setUserBrand] = useState<PreviewBrandInput | null>(null);

  // Verify user auth and load active workspace brand for personalized previews
  useEffect(() => {
    fetch('/api/v1/auth/me', { cache: 'no-store', credentials: 'same-origin' })
      .then(async (res) => {
        if (res.status === 401) {
          window.location.assign('/login?redirect=/templates');
          return null;
        }
        if (!res.ok) return null;
        const authData = await res.json();
        if (authData?.data?.authenticated === false) {
          window.location.assign('/login?redirect=/templates');
          return null;
        }
        if (!authData?.data?.authenticated) return null;

        const brandRes = await fetch('/api/v1/brands/current', {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (brandRes.ok) {
          const data = await brandRes.json();
          if (data?.data) {
            setUserBrand(data.data);
          }
        }
        return null;
      })
      .catch(() => {});
  }, []);

  const compiledThumbMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const template of ALL_TEMPLATES) {
      map.set(template.slug, compileTemplatePreview(template, userBrand));
    }
    return map;
  }, [userBrand]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: ALL_TEMPLATES.length };
    for (const cat of CATEGORIES) {
      if (cat.id === 'all') continue;
      counts[cat.id] = ALL_TEMPLATES.filter((t) => matchesCategory(t, cat.id)).length;
    }
    return counts;
  }, []);

  const modernCount = useMemo(
    () => ALL_TEMPLATES.filter((t) => t.version >= 2).length,
    []
  );

  const filteredTemplates = useMemo(() => {
    return ALL_TEMPLATES.filter((t) => {
      if (!matchesCategory(t, selectedCategory)) return false;
      if (releaseFilter === 'modern' && t.version < 2) return false;
      if (releaseFilter === 'pro' && !t.isPremium) return false;

      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.recommendedFor.toLowerCase().includes(q) ||
        t.features.some((f) => f.toLowerCase().includes(q))
      );
    }).sort((a, b) => {
      if (sortOption === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortOption === 'newest') {
        if (b.version !== a.version) return b.version - a.version;
        return ALL_TEMPLATES.indexOf(a) - ALL_TEMPLATES.indexOf(b);
      }
      // Featured puts 2026 v2 modern studio releases first while keeping catalog curation intact
      if (b.version !== a.version) return b.version - a.version;
      return (b.isPremium ? 1 : 0) - (a.isPremium ? 1 : 0);
    });
  }, [search, selectedCategory, releaseFilter, sortOption]);

  const handleOpenPreview = (template: TemplateDefinition) => {
    setPreviewTemplate(template);
    setPreviewViewport('desktop');
    setCopiedHtml(false);
    setPreviewHtml(
      compiledThumbMap.get(template.slug) || compileTemplatePreview(template, userBrand)
    );
  };

  const handleCopyPreviewHtml = async () => {
    if (!previewHtml) return;
    try {
      await navigator.clipboard.writeText(previewHtml);
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 2000);
    } catch {
      // Ignore clipboard permission denials in restricted contexts
    }
  };

  const handleUseTemplate = async (template: TemplateDefinition) => {
    setCloningSlug(template.slug);
    try {
      const meRes = await fetch('/api/v1/auth/me', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (meRes.status === 401) {
        window.location.assign('/login?redirect=/templates');
        return;
      }
      const meData = meRes.ok ? await meRes.json() : null;
      if (meRes.ok && meData?.data?.authenticated === false) {
        window.location.assign('/login?redirect=/templates');
        return;
      }

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
      <DashboardHeader
        activeNav="templates"
        variant="light"
        showLogout
        rightActions={
          <Link
            href="/workspace"
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-xs inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <span className="hidden sm:inline">Open </span>Studio <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        {/* Studio Header */}
        <div className="text-center max-w-3xl mx-auto mb-9">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-indigo-100 text-indigo-700 text-xs font-semibold shadow-2xs mb-4">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>2026 Modern Email Design System</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
              +{modernCount} New
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Curated Templates Built for Modern Inboxes
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed">
            Every card below renders the live compiled email layout synced with your brand colors. Preview desktop and mobile framing, copy HTML, or clone straight into the visual editor.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 font-medium">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              {ALL_TEMPLATES.length} Production Layouts
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 font-medium">
              <Monitor className="w-3.5 h-3.5 text-emerald-600" />
              Responsive 600px + Mobile Tables
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
              Instant Brand Token Sync
            </span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs mb-8 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search layouts (e.g. changelog, bento, nordic, welcome)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Release Tier Pills */}
              <div className="inline-flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200/60 self-start">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'modern', label: `2026 New (${modernCount})` },
                    { id: 'pro', label: 'Pro Studio' },
                  ] as const
                ).map((tab) => {
                  const active = releaseFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setReleaseFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                        active
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between lg:justify-end gap-3 text-xs">
              <span className="text-slate-500 font-medium">
                Showing <strong className="text-slate-900 font-bold">{filteredTemplates.length}</strong> of{' '}
                {ALL_TEMPLATES.length} designs
              </span>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as typeof sortOption)}
                  aria-label="Sort templates"
                  className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="featured">Featured 2026 First</option>
                  <option value="newest">Newest Version</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-slate-100 pt-3">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              const count = categoryCounts[cat.id] ?? 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all inline-flex items-center gap-1.5 ${
                    active
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/70'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-2xs">
            <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">No matching email designs</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Nothing matched your current filters. Clear search or reset categories to browse all {ALL_TEMPLATES.length} designs.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedCategory('all');
                setReleaseFilter('all');
              }}
              className="mt-4 px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {filteredTemplates.map((template) => {
              const isCloning = cloningSlug === template.slug;
              const compiledHtml = compiledThumbMap.get(template.slug) || '';
              const palette = extractTemplatePalette(template.editorSchema);
              const isModern = template.version >= 2;

              return (
                <div
                  key={template.slug}
                  className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-xl hover:border-indigo-300 transition-all duration-300 flex flex-col group"
                >
                  {/* Mini Inbox Window Top Chrome */}
                  <div className="px-4 py-2.5 bg-slate-50/95 border-b border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex items-center gap-1 shrink-0" aria-hidden="true">
                        <span className="w-2 h-2 rounded-full bg-slate-300" />
                        <span className="w-2 h-2 rounded-full bg-slate-300" />
                        <span className="w-2 h-2 rounded-full bg-slate-300" />
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                        {template.category.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isModern && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-extrabold uppercase tracking-wider">
                          NEW 2026
                        </span>
                      )}
                      {template.isPremium && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider">
                          PRO
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Live Scaled HTML Email Canvas */}
                  <div className="relative aspect-[4/4.1] overflow-hidden bg-slate-100 border-b border-slate-100">
                    <ScaledEmailThumb
                      html={compiledHtml}
                      title={`${template.name} live preview`}
                      className="transition-transform duration-500 group-hover:scale-[1.02]"
                    />

                    {/* Bottom fade so tall emails blend cleanly */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-900/10 to-transparent" />

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5 backdrop-blur-[2px]">
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(template)}
                        className="px-4 py-2 rounded-2xl bg-white text-slate-900 font-bold text-xs shadow-lg hover:bg-slate-50 transition inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-600" /> Live Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUseTemplate(template)}
                        disabled={isCloning}
                        className="px-4 py-2 rounded-2xl bg-indigo-600 text-white font-bold text-xs shadow-lg hover:bg-indigo-700 transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Use
                      </button>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition leading-snug">
                          {template.name}
                        </h3>
                        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                          {palette.length > 0 && (
                            <span
                              className="inline-flex items-center -space-x-1"
                              title={`Palette: ${palette.join(', ')}`}
                            >
                              {palette.map((hex) => (
                                <span
                                  key={hex}
                                  className="w-3.5 h-3.5 rounded-full border border-white ring-1 ring-slate-200"
                                  style={{ backgroundColor: hex }}
                                />
                              ))}
                            </span>
                          )}
                          <span className="text-[11px] font-semibold text-slate-400">
                            {template.editorSchema.blocks.length} blocks
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3.5">
                        {template.description}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mb-5">
                        {template.features.slice(0, 3).map((feat, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[11px] font-medium text-slate-600"
                          >
                            {feat}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(template)}
                        className="flex-1 py-2.5 px-3 rounded-2xl border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUseTemplate(template)}
                        disabled={isCloning}
                        className="flex-1 py-2.5 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        {isCloning ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" /> Use Design
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

      {/* Interactive Sandboxed Email Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
                  {previewTemplate.name[0]}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">
                      {previewTemplate.name}
                    </h3>
                    {previewTemplate.version >= 2 && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                        2026 Studio
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 capitalize">
                    {previewTemplate.category.replace('_', ' ')} &bull; {previewTemplate.editorSchema.blocks.length} editable blocks
                  </p>
                </div>
              </div>

              <div className="hidden md:flex items-center bg-slate-200/70 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setPreviewViewport('desktop')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    previewViewport === 'desktop'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" /> Desktop (600px)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewport('mobile')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    previewViewport === 'mobile'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" /> Mobile (375px)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewport('full')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    previewViewport === 'full'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Fluid
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyPreviewHtml}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition inline-flex items-center gap-1.5"
                >
                  {copiedHtml ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied HTML
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy HTML
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  aria-label="Close preview"
                  className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-600 hover:text-slate-900 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 overflow-y-auto flex items-center justify-center p-4 sm:p-6">
              <div
                className={`transition-all duration-300 bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200 h-full flex flex-col ${
                  previewViewport === 'desktop'
                    ? 'w-full max-w-[640px]'
                    : previewViewport === 'mobile'
                    ? 'w-full max-w-[375px]'
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

            <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Recommended for: <strong className="text-slate-900">{previewTemplate.recommendedFor}</strong>
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="px-4 py-2 rounded-2xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                >
                  Back to Library
                </button>
                <button
                  type="button"
                  onClick={() => handleUseTemplate(previewTemplate)}
                  disabled={cloningSlug === previewTemplate.slug}
                  className="flex-1 sm:flex-none px-6 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-2"
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
