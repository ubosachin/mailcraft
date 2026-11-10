'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/DashboardHeader';
import {
  Users,
  Filter,
  Plus,
  Trash2,
  Edit2,
  Eye,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Tag as TagIcon,
  Building,
  Calendar,
  Sparkles,
  Layers,
  X,
  Check,
  Search,
  ExternalLink,
} from 'lucide-react';
import { ConsentStatus, ISegment, ITag } from '@mailcraft/shared-types';

interface SegmentWithCounts extends ISegment {
  id: string;
  contactCount: number;
  eligibleCount?: number;
}

interface PreviewResult {
  segmentId: string;
  segmentName: string;
  totalMatching: number;
  eligibleCount: number;
  contacts: Array<{
    id: string;
    email: string;
    name?: string;
    company?: string;
    consentStatus: ConsentStatus;
    tags: string[];
  }>;
}

function SegmentsPageContent() {
  const router = useRouter();

  // State
  const [segments, setSegments] = useState<SegmentWithCounts[]>([]);
  const [tags, setTags] = useState<ITag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Notification
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Modals
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingSegment, setEditingSegment] = useState<SegmentWithCounts | null>(null);
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

  // Form State
  const [formName, setFormName] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formConsent, setFormConsent] = useState<ConsentStatus[]>(['opted_in']);
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formCompany, setFormCompany] = useState<string>('');
  const [formSearch, setFormSearch] = useState<string>('');
  const [formCreatedAfter, setFormCreatedAfter] = useState<string>('');
  const [formCreatedBefore, setFormCreatedBefore] = useState<string>('');

  const [tagInput, setTagInput] = useState<string>('');

  // Toast Helper
  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [segRes, tagRes] = await Promise.all([
        fetch('/api/v1/segments', { credentials: 'include' }),
        fetch('/api/v1/tags', { credentials: 'include' }),
      ]);

      const [segData, tagData] = await Promise.all([segRes.json(), tagRes.json()]);

      if (segData.success) {
        setSegments(segData.data);
      }
      if (tagData.success) {
        setTags(tagData.data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load segments';
      showToast('error', message);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Create Modal
  const openCreateModal = () => {
    setModalMode('create');
    setEditingSegment(null);
    setFormName('');
    setFormDescription('');
    setFormConsent(['opted_in']);
    setFormTags([]);
    setFormCompany('');
    setFormSearch('');
    setFormCreatedAfter('');
    setFormCreatedBefore('');
    setTagInput('');
  };

  // Open Edit Modal
  const openEditModal = (seg: SegmentWithCounts) => {
    setModalMode('edit');
    setEditingSegment(seg);
    setFormName(seg.name);
    setFormDescription(seg.description || '');
    setFormConsent(seg.filters?.consentStatus || []);
    setFormTags(seg.filters?.tags || []);
    setFormCompany(seg.filters?.company || '');
    setFormSearch(seg.filters?.search || '');
    setFormCreatedAfter(
      seg.filters?.createdAfter
        ? new Date(seg.filters.createdAfter).toISOString().slice(0, 10)
        : ''
    );
    setFormCreatedBefore(
      seg.filters?.createdBefore
        ? new Date(seg.filters.createdBefore).toISOString().slice(0, 10)
        : ''
    );
    setTagInput('');
  };

  // Toggle consent in form
  const toggleConsent = (status: ConsentStatus) => {
    setFormConsent((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  // Toggle tag in form
  const toggleTag = (tag: string) => {
    setFormTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !formTags.includes(trimmed)) {
      setFormTags((prev) => [...prev, trimmed]);
      setTagInput('');
    }
  };

  // Submit Segment (Create / Update)
  const handleSaveSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('error', 'Segment name is required');
      return;
    }

    try {
      setActionLoading(true);

      const payload = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        filters: {
          consentStatus: formConsent.length > 0 ? formConsent : undefined,
          tags: formTags.length > 0 ? formTags : undefined,
          company: formCompany.trim() || undefined,
          search: formSearch.trim() || undefined,
          createdAfter: formCreatedAfter ? new Date(formCreatedAfter).toISOString() : undefined,
          createdBefore: formCreatedBefore ? new Date(formCreatedBefore).toISOString() : undefined,
        },
      };

      const url =
        modalMode === 'create'
          ? '/api/v1/segments'
          : `/api/v1/segments/${editingSegment?.id}`;
      const method = modalMode === 'create' ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to save segment');
      }

      showToast(
        'success',
        modalMode === 'create' ? 'Segment created successfully' : 'Segment updated'
      );
      setModalMode(null);
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error saving segment';
      showToast('error', message);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Segment
  const handleDeleteSegment = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the segment "${name}"? Contacts will not be deleted.`)) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/v1/segments/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to delete segment');
      }
      showToast('success', 'Segment deleted');
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error deleting segment';
      showToast('error', message);
    } finally {
      setActionLoading(false);
    }
  };

  // Preview Segment
  const handlePreviewSegment = async (id: string) => {
    try {
      setPreviewLoading(true);
      const res = await fetch(`/api/v1/segments/${id}/preview`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to preview segment contacts');
      }
      setPreviewData(data.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to preview segment';
      showToast('error', message);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <DashboardHeader
        activeNav="contacts"
        showLogout
        rightActions={
          <Link
            href="/contacts"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">All Contacts</span>
            <span className="sm:hidden">Contacts</span>
          </Link>
        }
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Notification Toast */}
        {notification && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-start justify-between border ${
              notification.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-200'
                : notification.type === 'error'
                ? 'bg-rose-950/60 border-rose-500/30 text-rose-200'
                : 'bg-indigo-950/60 border-indigo-500/30 text-indigo-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : notification.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-indigo-400 shrink-0" />
              )}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Title & Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Audience Segments
                </h1>
                <p className="text-sm text-slate-400">
                  Build dynamic, rule-based recipient groups for high-converting marketing campaigns.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              Create Segment
            </button>
          </div>
        </div>

        {/* Quick Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Active Segments
            </div>
            <div className="text-2xl font-bold text-white">{segments.length}</div>
            <p className="text-xs text-slate-500 mt-1">Rule-based dynamic groups</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Available Tags
            </div>
            <div className="text-2xl font-bold text-indigo-400">{tags.length}</div>
            <p className="text-xs text-slate-500 mt-1">Organizational labels</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Compliance Enforcement
            </div>
            <div className="text-2xl font-bold text-emerald-400">100% Opt-In</div>
            <p className="text-xs text-slate-500 mt-1">Campaign sends auto-filter consent</p>
          </div>
        </div>

        {/* Segments List */}
        {loading ? (
          <div className="py-24 text-center">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Loading your audience segments...</p>
          </div>
        ) : segments.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8">
            <div className="p-3 bg-slate-800/80 rounded-2xl w-fit mx-auto text-slate-400 mb-4">
              <Filter className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">No Segments Created Yet</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
              Segments allow you to target specific subsets of your audience based on opt-in status, tags, company, or recency.
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition"
            >
              <Plus className="w-4 h-4" />
              Create First Segment
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {segments.map((segment) => (
              <div
                key={segment.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 flex flex-col justify-between hover:border-slate-700 transition relative group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition">
                      {segment.name}
                    </h3>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 whitespace-nowrap">
                      {segment.contactCount} {segment.contactCount === 1 ? 'contact' : 'contacts'}
                    </span>
                  </div>

                  {segment.description && (
                    <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                      {segment.description}
                    </p>
                  )}

                  {/* Filter Badges */}
                  <div className="space-y-2 mt-4 pt-4 border-t border-slate-800">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Criteria
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {segment.filters?.consentStatus && segment.filters.consentStatus.length > 0 ? (
                        segment.filters.consentStatus.map((c) => (
                          <span
                            key={c}
                            className={`px-2 py-0.5 rounded text-xs font-medium border ${
                              c === 'opted_in'
                                ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                                : c === 'unknown'
                                ? 'bg-amber-950/60 border-amber-500/30 text-amber-300'
                                : 'bg-rose-950/60 border-rose-500/30 text-rose-300'
                            }`}
                          >
                            {c}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">Any consent status</span>
                      )}

                      {segment.filters?.tags && segment.filters.tags.length > 0 && (
                        segment.filters.tags.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700"
                          >
                            #{t}
                          </span>
                        ))
                      )}

                      {segment.filters?.company && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-400" />
                          {segment.filters.company}
                        </span>
                      )}

                      {segment.filters?.search && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                          <Search className="w-3 h-3 text-slate-400" />
                          &quot;{segment.filters.search}&quot;
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handlePreviewSegment(segment.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-400" />
                    Preview Contacts
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(segment)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                      title="Edit Filter Rules"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSegment(segment.id, segment.name)}
                      className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition"
                      title="Delete Segment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* CREATE / EDIT SEGMENT MODAL */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400">
                  <Filter className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-bold text-white">
                  {modalMode === 'create' ? 'Create Dynamic Segment' : 'Edit Segment Criteria'}
                </h3>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSegment} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Segment Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., VIP Opted-In Customers"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="Describe the targeting purpose of this segment..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Filter: Consent Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Consent Status (Opt-In Filter)
                </label>
                <p className="text-xs text-slate-500 mb-2.5">
                  Select allowable consent states. Marketing campaigns automatically require Opted-In.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['opted_in', 'unknown', 'unsubscribed', 'suppressed'] as ConsentStatus[]).map(
                    (st) => {
                      const isSelected = formConsent.includes(st);
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => toggleConsent(st)}
                          className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center justify-between transition ${
                            isSelected
                              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                              : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span className="capitalize">{st.replace('_', ' ')}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Filter: Tags */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Filter By Tags
                </label>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {tags.map((tg) => {
                      const isSelected = formTags.includes(tg.name);
                      return (
                        <button
                          key={tg.id || tg._id || tg.name}
                          type="button"
                          onClick={() => toggleTag(tg.name)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-500'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          #{tg.name}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTag();
                      }
                    }}
                    placeholder="Add custom tag filter..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTag}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300"
                  >
                    Add
                  </button>
                </div>

                {formTags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {formTags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-indigo-950/80 border border-indigo-500/40 text-indigo-300"
                      >
                        #{t}
                        <button
                          type="button"
                          onClick={() => toggleTag(t)}
                          className="hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Filter: Company contains */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Company Contains
                </label>
                <input
                  type="text"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  placeholder="e.g. Acme, Studio, Tech"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Filter: Search Query */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Email or Name Keyword Search
                </label>
                <input
                  type="text"
                  value={formSearch}
                  onChange={(e) => setFormSearch(e.target.value)}
                  placeholder="e.g. john, designer, gmail"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Filter: Date Ranges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Added After
                  </label>
                  <input
                    type="date"
                    value={formCreatedAfter}
                    onChange={(e) => setFormCreatedAfter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Added Before
                  </label>
                  <input
                    type="date"
                    value={formCreatedBefore}
                    onChange={(e) => setFormCreatedBefore(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition shadow-lg shadow-indigo-600/20"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {modalMode === 'create' ? 'Create Segment' : 'Update Criteria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW CONTACTS MODAL */}
      {(previewData || previewLoading) && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400">
                  <Eye className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {previewData ? `Segment Preview: ${previewData.segmentName}` : 'Evaluating Segment...'}
                  </h3>
                  {previewData && (
                    <p className="text-xs text-slate-400">
                      Total Matching: <strong className="text-white">{previewData.totalMatching}</strong> • Send-Eligible (Opted In):{' '}
                      <strong className="text-emerald-400">{previewData.eligibleCount}</strong>
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setPreviewData(null)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {previewLoading ? (
              <div className="py-20 text-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-400">Querying matching contacts...</p>
              </div>
            ) : previewData?.contacts.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No contacts currently match this segment&apos;s filter criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96 border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Company</th>
                      <th className="px-4 py-3">Consent Status</th>
                      <th className="px-4 py-3">Tags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {previewData?.contacts.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/40">
                        <td className="px-4 py-2.5 font-medium text-white">{c.email}</td>
                        <td className="px-4 py-2.5 text-slate-400">{c.name || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-400">{c.company || '—'}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              c.consentStatus === 'opted_in'
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                                : c.consentStatus === 'unknown'
                                ? 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {c.consentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {c.tags && c.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {c.tags.map((t) => (
                                <span
                                  key={t}
                                  className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px]"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewData(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SegmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      }
    >
      <SegmentsPageContent />
    </Suspense>
  );
}
