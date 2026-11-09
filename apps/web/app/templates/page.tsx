'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Search,
  ArrowRight,
  Eye,
  Check,
  Sparkles,
  ArrowLeft,
  X,
} from 'lucide-react';
import { TEMPLATE_CATALOG } from '@mailcraft/email-renderer';
import { ITemplate } from '@mailcraft/shared-types';

export default function TemplatesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<typeof TEMPLATE_CATALOG[0] | null>(null);

  const categories = [
    { id: 'all', label: 'All Templates' },
    { id: 'ecommerce', label: 'Ecommerce' },
    { id: 'discounts', label: 'Discounts & Sales' },
    { id: 'fashion', label: 'Fashion & Luxury' },
    { id: 'technology', label: 'Technology & SaaS' },
    { id: 'festivals', label: 'Festivals & Seasonal' },
    { id: 'food', label: 'Food & Culinary' },
    { id: 'corporate', label: 'Corporate & B2B' },
    { id: 'product_launches', label: 'Product Launches' },
  ];

  const filtered = TEMPLATE_CATALOG.filter((t) => {
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleUseTemplate = async (template: typeof TEMPLATE_CATALOG[0]) => {
    try {
      // Ensure guest session exists
      const meRes = await fetch('/api/v1/guest/me');
      if (!meRes.ok) {
        await fetch('/api/v1/guest/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brandName: 'My Brand' }),
        });
      }

      // Check current brand
      const brandRes = await fetch('/api/v1/brands/current');
      const brandData = await brandRes.json();
      const brandId = brandData.data?.id;

      if (brandId) {
        // Create campaign with this template
        const campRes = await fetch('/api/v1/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brandId,
            campaignName: `${template.name} Campaign`,
            subject: `Announcement: Discover our ${template.name}`,
            editorData: template.editorSchema,
          }),
        });

        const campData = await campRes.json();
        if (campData.data?.id) {
          router.push(`/editor?id=${campData.data.id}`);
          return;
        }
      }

      router.push('/workspace');
    } catch {
      router.push('/workspace');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
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
            <Link href="/workspace" className="text-slate-600 hover:text-slate-900 transition">
              Workspace
            </Link>
            <Link
              href="/workspace"
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              Start Free
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Template Directory</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2">
            12 Production Email Templates
          </h1>
          <p className="text-sm text-slate-600 mt-3">
            Every template is built with responsive HTML, tested across Gmail, Apple Mail, and Outlook, and converts seamlessly into customizable blocks.
          </p>
        </div>

        {/* Search & Categories */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  selectedCategory === c.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((tpl) => (
            <div
              key={tpl.slug}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col group"
            >
              <div className="h-44 bg-slate-100 overflow-hidden relative">
                <img
                  src={tpl.thumbnail}
                  alt={tpl.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 backdrop-blur-sm text-white">
                  {tpl.category}
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{tpl.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {tpl.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewTemplate(tpl)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUseTemplate(tpl)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
                  >
                    <span>Use Template</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{previewTemplate.name}</h3>
                <p className="text-xs text-slate-500">{previewTemplate.category}</p>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 overflow-y-auto flex-1 space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
                <p className="font-semibold text-slate-800">Included Blocks:</p>
                <div className="flex flex-wrap gap-1.5">
                  {previewTemplate.editorSchema.blocks.map((b) => (
                    <span
                      key={b.id}
                      className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-mono text-[11px]"
                    >
                      {b.type}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-slate-100 rounded-xl flex items-center justify-center">
                <img
                  src={previewTemplate.thumbnail}
                  alt={previewTemplate.name}
                  className="max-h-72 rounded-lg object-contain shadow-sm"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => handleUseTemplate(previewTemplate)}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                <span>Edit This Template</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

