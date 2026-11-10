'use client';

import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/DashboardHeader';
import {
  Users,
  UserPlus,
  Upload,
  FileSpreadsheet,
  Search,
  Filter,
  Download,
  Trash2,
  Tag as TagIcon,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  X,
  Building,
  Phone,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Edit2,
  Check,
  FileText,
  Sparkles,
  RefreshCw,
  Copy,
} from 'lucide-react';
import {
  ConsentStatus,
  ContactStats,
  ImportPreviewResult,
  ITag,
  ISegment,
} from '@mailcraft/shared-types';

interface ContactItem {
  id: string;
  email: string;
  normalizedEmail: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  company?: string;
  phone?: string;
  tags: string[];
  consentStatus: ConsentStatus;
  consentSource: string;
  consentAt?: string;
  consentEvidence?: string;
  createdAt: string;
}

function ContactsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [stats, setStats] = useState<ContactStats>({
    totalContacts: 0,
    eligibleContacts: 0,
    pendingConsent: 0,
    unsubscribed: 0,
    suppressed: 0,
    invalidContacts: 0,
  });
  const [tags, setTags] = useState<ITag[]>([]);
  const [segments, setSegments] = useState<ISegment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Pagination
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const limit = 20;

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Notification
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Modals
  const [activeModal, setActiveModal] = useState<
    'add' | 'paste' | 'upload' | 'edit' | 'tag_manager' | null
  >(null);
  const [activeContact, setActiveContact] = useState<ContactItem | null>(null);

  // Manual Add Form
  const [addForm, setAddForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    company: '',
    phone: '',
    tags: '',
    consentStatus: 'unknown' as ConsentStatus,
    consentEvidence: '',
  });

  // Bulk Paste Form
  const [pasteInput, setPasteInput] = useState<string>('');
  const [pasteConsentConfirmed, setPasteConsentConfirmed] = useState<boolean>(false);
  const [pasteValidation, setPasteValidation] = useState<{
    totalSubmitted: number;
    validSyntaxCount: number;
    invalidSyntaxCount: number;
    duplicatesRemovedCount: number;
    suppressedCount: number;
    eligibleCount: number;
  } | null>(null);
  const [validatingPaste, setValidatingPaste] = useState<boolean>(false);

  // Upload Wizard State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStep, setUploadStep] = useState<'select' | 'mapping' | 'preview' | 'complete'>(
    'select'
  );
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [uploadConsentConfirmed, setUploadConsentConfirmed] = useState<boolean>(false);
  const [uploadConsentEvidence, setUploadConsentEvidence] = useState<string>('');
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [confirmingImport, setConfirmingImport] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tag Manager State
  const [newTagName, setNewTagName] = useState<string>('');
  const [newTagColor, setNewTagColor] = useState<string>('#6366F1');

  // Copy helper
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Fetch Contacts
  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('consentStatus', statusFilter);
      if (tagFilter !== 'all') params.set('tag', tagFilter);

      const res = await fetch(`/api/v1/contacts?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = '/login?redirect=/contacts';
        return;
      }
      const data = await res.json();

      if (data.success && data.data) {
        setContacts(data.data.contacts || []);
        if (data.data.stats) setStats(data.data.stats);
        if (data.data.pagination) {
          setTotalPages(data.data.pagination.totalPages || 1);
          setTotalCount(data.data.pagination.total || 0);
        }
      }
    } catch {
      // Quiet fail
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, tagFilter]);

  // Fetch Tags and Segments
  const fetchTagsAndSegments = useCallback(async () => {
    try {
      const [tagsRes, segsRes] = await Promise.all([
        fetch('/api/v1/tags'),
        fetch('/api/v1/segments'),
      ]);

      const [tagsData, segsData] = await Promise.all([tagsRes.json(), segsRes.json()]);

      if (tagsData.success) setTags(tagsData.data || []);
      if (segsData.success) setSegments(segsData.data || []);
    } catch {
      //
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    fetchTagsAndSegments();
  }, [fetchTagsAndSegments]);

  // Handle Search Input Debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  // Toggle Selection
  const toggleSelectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to remove ${selectedIds.size} contacts?`)) return;

    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/v1/contacts/${id}`, { method: 'DELETE' })
        )
      );

      setNotification({
        type: 'info',
        message: `Removed ${selectedIds.size} contacts successfully.`,
      });
      setSelectedIds(new Set());
      await fetchContacts();
    } catch {
      setNotification({
        type: 'error',
        message: 'Failed to complete bulk deletion.',
      });
    }
  };

  // Create Contact Manually
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.email) return;

    try {
      const res = await fetch('/api/v1/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: addForm.email,
          firstName: addForm.firstName || undefined,
          lastName: addForm.lastName || undefined,
          company: addForm.company || undefined,
          phone: addForm.phone || undefined,
          tags: addForm.tags ? addForm.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
          consentStatus: addForm.consentStatus,
          consentEvidence: addForm.consentEvidence || undefined,
          consentSource: 'manual_entry',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setNotification({
          type: 'success',
          message: `Contact ${addForm.email} added successfully.`,
        });
        setActiveModal(null);
        setAddForm({
          email: '',
          firstName: '',
          lastName: '',
          company: '',
          phone: '',
          tags: '',
          consentStatus: 'unknown',
          consentEvidence: '',
        });
        await fetchContacts();
        await fetchTagsAndSegments();
      } else {
        setNotification({
          type: 'error',
          message: json.error?.message || 'Failed to add contact.',
        });
      }
    } catch {
      setNotification({ type: 'error', message: 'Network error saving contact.' });
    }
  };

  // Validate Paste Input
  const handleValidatePaste = async () => {
    if (!pasteInput.trim()) return;

    try {
      setValidatingPaste(true);
      const res = await fetch('/api/v1/contacts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput: pasteInput }),
      });

      const json = await res.json();
      if (json.success) {
        setPasteValidation(json.data);
      }
    } catch {
      //
    } finally {
      setValidatingPaste(false);
    }
  };

  // Submit Bulk Paste
  const handleConfirmPaste = async () => {
    if (!pasteValidation || pasteValidation.validSyntaxCount === 0) return;

    try {
      const emails = pasteInput
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch('/api/v1/contacts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts: emails.map((e) => ({ email: e })),
          consentConfirmed: pasteConsentConfirmed,
          defaultConsentStatus: pasteConsentConfirmed ? 'opted_in' : 'unknown',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setNotification({
          type: 'success',
          message: json.data?.message || 'Bulk contacts imported successfully.',
        });
        setActiveModal(null);
        setPasteInput('');
        setPasteValidation(null);
        setPasteConsentConfirmed(false);
        await fetchContacts();
      } else {
        setNotification({
          type: 'error',
          message: json.error?.message || 'Failed to import bulk contacts.',
        });
      }
    } catch {
      setNotification({ type: 'error', message: 'Network error during bulk paste import.' });
    }
  };

  // File Upload Wizard - Step 1: Upload & Initial Preview
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFile(true);
      setUploadFile(file);

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/v1/contacts/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (json.success && json.data) {
        setPreviewResult(json.data);
        setColumnMapping(json.data.columnMapping || {});
        setUploadStep('mapping');
      } else {
        setNotification({
          type: 'error',
          message: json.error?.message || 'Could not parse uploaded file.',
        });
      }
    } catch {
      setNotification({ type: 'error', message: 'Network error uploading file.' });
    } finally {
      setUploadingFile(false);
    }
  };

  // Re-preview with customized column mapping
  const handleUpdateMapping = async () => {
    if (!previewResult) return;

    try {
      setUploadingFile(true);
      const res = await fetch('/api/v1/contacts/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importId: previewResult.importId,
          columnMapping,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setPreviewResult(json.data);
        setUploadStep('preview');
      }
    } catch {
      //
    } finally {
      setUploadingFile(false);
    }
  };

  // Confirm Final Import
  const handleConfirmImport = async () => {
    if (!previewResult) return;

    try {
      setConfirmingImport(true);
      const res = await fetch('/api/v1/contacts/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importId: previewResult.importId,
          columnMapping,
          consentConfirmed: uploadConsentConfirmed,
          consentEvidence: uploadConsentEvidence || undefined,
          defaultConsentStatus: uploadConsentConfirmed ? 'opted_in' : 'unknown',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setUploadStep('complete');
        setNotification({
          type: 'success',
          message: json.data?.message || 'File import completed successfully.',
        });
        await fetchContacts();
      } else {
        setNotification({
          type: 'error',
          message: json.error?.message || 'Import confirmation failed.',
        });
      }
    } catch {
      setNotification({ type: 'error', message: 'Network error confirming import.' });
    } finally {
      setConfirmingImport(false);
    }
  };

  // Update Existing Contact
  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeContact) return;

    try {
      const res = await fetch(`/api/v1/contacts/${activeContact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: activeContact.firstName,
          lastName: activeContact.lastName,
          name: activeContact.name,
          company: activeContact.company,
          phone: activeContact.phone,
          tags: activeContact.tags,
          consentStatus: activeContact.consentStatus,
          consentEvidence: activeContact.consentEvidence,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setNotification({
          type: 'success',
          message: 'Contact updated successfully.',
        });
        setActiveModal(null);
        setActiveContact(null);
        await fetchContacts();
      } else {
        setNotification({
          type: 'error',
          message: json.error?.message || 'Failed to update contact.',
        });
      }
    } catch {
      setNotification({ type: 'error', message: 'Network error updating contact.' });
    }
  };

  // Create Tag
  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      const res = await fetch('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: newTagColor,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setNewTagName('');
        await fetchTagsAndSegments();
      }
    } catch {
      //
    }
  };

  // Delete Tag
  const handleDeleteTag = async (tagId: string) => {
    try {
      await fetch(`/api/v1/tags/${tagId}`, { method: 'DELETE' });
      await fetchTagsAndSegments();
      await fetchContacts();
    } catch {
      //
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Header */}
      <DashboardHeader
        activeNav="contacts"
        showLogout
        rightActions={
          <Link
            href="/contacts/segments"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition whitespace-nowrap"
          >
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Segments ({segments.length})</span>
            <span className="sm:hidden">({segments.length})</span>
          </Link>
        }
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Toast Notification */}
        {notification && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-start justify-between border shadow-sm ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : notification.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-indigo-50 border-indigo-200 text-indigo-900'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : notification.type === 'error' ? (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0" />
              )}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-700 ml-4"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Hero & Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Permission-Based Contact Vault &bull; Auto Suppression Filtering
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Contacts &amp; Audience
            </h1>
            <p className="mt-1 text-sm text-slate-600 max-w-2xl">
              Manage your marketing audience, import recipients, verify consent evidence, and organize targeted segments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setActiveModal('add')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition shadow-sm shadow-indigo-600/20"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Contact
            </button>
            <button
              onClick={() => setActiveModal('paste')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-1.5 shadow-sm transition"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              Bulk Paste
            </button>
            <button
              onClick={() => {
                setUploadStep('select');
                setActiveModal('upload');
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Import CSV / XLSX
            </button>
            <button
              onClick={() => setActiveModal('tag_manager')}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-1.5 shadow-sm transition"
              title="Manage Audience Tags"
            >
              <TagIcon className="w-3.5 h-3.5 text-amber-500" />
              Tags ({tags.length})
            </button>

            {/* Export Dropdown */}
            <div className="relative group">
              <button className="px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-1.5 shadow-sm transition">
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
              <div className="absolute right-0 top-full mt-1.5 w-40 bg-white border border-slate-200 rounded-xl shadow-lg py-1 hidden group-hover:block z-20">
                <a
                  href="/api/v1/contacts/export?format=csv"
                  download
                  className="block px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                >
                  Export as CSV
                </a>
                <a
                  href="/api/v1/contacts/export?format=xlsx"
                  download
                  className="block px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                >
                  Export as Excel (.xlsx)
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Live Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="saas-card p-4">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">Total Contacts</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {stats.totalContacts.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">in workspace</span>
            </div>
          </div>

          <div className="saas-card p-4 border-emerald-200/80">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Eligible Opt-In</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-emerald-600 tracking-tight">
                {stats.eligibleContacts.toLocaleString()}
              </span>
              <span className="text-[11px] text-emerald-600/80 font-medium">campaign ready</span>
            </div>
          </div>

          <div className="saas-card p-4 border-amber-200/80">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-amber-700 font-semibold uppercase tracking-wider">Pending Consent</span>
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-amber-600 tracking-tight">
                {stats.pendingConsent.toLocaleString()}
              </span>
              <span className="text-[11px] text-amber-600/80 font-medium">unknown consent</span>
            </div>
          </div>

          <div className="saas-card p-4 border-rose-200/80">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-rose-700 font-semibold uppercase tracking-wider">Unsubscribed</span>
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-rose-600 tracking-tight">
                {stats.unsubscribed.toLocaleString()}
              </span>
              <span className="text-[11px] text-rose-600/80 font-medium">opted out</span>
            </div>
          </div>

          <div className="saas-card p-4">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">Suppressed</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-700 tracking-tight">
                {stats.suppressed.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-400">bounces &amp; spam</span>
            </div>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="saas-card p-4 mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email address, or company..."
              value={search}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none text-xs text-slate-900 placeholder-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="opted_in">Eligible (Opted In)</option>
                <option value="unknown">Pending (Unknown)</option>
                <option value="unsubscribed">Unsubscribed</option>
                <option value="suppressed">Suppressed</option>
              </select>
            </div>

            {/* Tag Filter */}
            {tags.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-semibold">Tag:</span>
                <select
                  value={tagFilter}
                  onChange={(e) => {
                    setTagFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="all">All Tags</option>
                  {tags.map((t) => (
                    <option key={t.id || t._id || t.name} value={t.name}>
                      {t.name} ({t.contactCount || 0})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setTagFilter('all');
                setPage(1);
              }}
              className="text-indigo-600 hover:text-indigo-700 font-semibold text-xs underline underline-offset-4"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Bulk Action Bar (when selected) */}
        {selectedIds.size > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs animate-in fade-in">
            <span className="text-indigo-900 font-semibold">
              {selectedIds.size} contact{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1.5 font-semibold transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Contacts Table */}
        <div className="saas-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={contacts.length > 0 && selectedIds.size === contacts.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="py-3.5 px-4">Recipient</th>
                  <th className="py-3.5 px-4">Company</th>
                  <th className="py-3.5 px-4">Consent Status</th>
                  <th className="py-3.5 px-4">Tags</th>
                  <th className="py-3.5 px-4">Source</th>
                  <th className="py-3.5 px-4">Date Added</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                      Loading audience contacts...
                    </td>
                  </tr>
                ) : contacts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-bold text-slate-900">No contacts found</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Add individual recipients, paste a list, or import from CSV/XLSX.
                      </p>
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className={`hover:bg-slate-50/80 transition ${
                        selectedIds.has(contact.id) ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(contact.id)}
                          onChange={() => toggleSelectOne(contact.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {contact.name ? contact.name.charAt(0) : contact.email.charAt(0)}
                          </div>
                          <div>
                            {contact.name && (
                              <p className="font-semibold text-slate-900 leading-tight">
                                {contact.name}
                              </p>
                            )}
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600">
                              <span>{contact.email}</span>
                              <button
                                onClick={() => copyToClipboard(contact.email, contact.id)}
                                className="text-slate-400 hover:text-slate-700"
                                title="Copy email"
                              >
                                {copiedId === contact.id ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {contact.company || <span className="text-slate-400">&mdash;</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        {contact.consentStatus === 'opted_in' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Eligible (Opted In)
                          </span>
                        ) : contact.consentStatus === 'unknown' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-3 h-3" />
                            Pending Consent
                          </span>
                        ) : contact.consentStatus === 'unsubscribed' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            Unsubscribed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Suppressed
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {contact.tags && contact.tags.length > 0 ? (
                            contact.tags.map((t, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80"
                              >
                                {t}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400">&mdash;</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 capitalize">
                        {contact.consentSource ? contact.consentSource.replace(/_/g, ' ') : 'Manual'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {new Date(contact.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setActiveContact(contact);
                              setActiveModal('edit');
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
                            title="Edit Contact"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Remove contact ${contact.email}?`)) {
                                await fetch(`/api/v1/contacts/${contact.id}`, {
                                  method: 'DELETE',
                                });
                                await fetchContacts();
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete Contact"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 bg-slate-50">
              <span>
                Showing Page <strong className="text-slate-900">{page}</strong> of{' '}
                <strong className="text-slate-900">{totalPages}</strong> ({totalCount} total contacts)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-medium flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-medium flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* --- MODALS --- */}

      {/* 1. Add Contact Modal */}
      {activeModal === 'add' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Recipient Contact</h3>
                <p className="text-xs text-slate-500">Add an individual recipient to your audience</p>
              </div>
            </div>

            <form onSubmit={handleAddContact} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="recipient@example.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    placeholder="Jane"
                    value={addForm.firstName}
                    onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    placeholder="Doe"
                    value={addForm.lastName}
                    onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company</label>
                  <input
                    type="text"
                    placeholder="Acme Corp"
                    value={addForm.company}
                    onChange={(e) => setAddForm({ ...addForm, company: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+1 555-0192"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="VIP, Newsletter, Retail"
                  value={addForm.tags}
                  onChange={(e) => setAddForm({ ...addForm, tags: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none text-xs text-slate-900"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Marketing Consent Status
                  </label>
                  <select
                    value={addForm.consentStatus}
                    onChange={(e) =>
                      setAddForm({ ...addForm, consentStatus: e.target.value as ConsentStatus })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="unknown">Pending Review (Unknown Consent)</option>
                    <option value="opted_in">Explicit Opt-In (Eligible for campaigns)</option>
                    <option value="unsubscribed">Unsubscribed (Excluded)</option>
                  </select>
                </div>

                {addForm.consentStatus === 'opted_in' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Consent Evidence / Opt-in Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Website checkout checkbox agreed on 2026-11-09"
                      value={addForm.consentEvidence}
                      onChange={(e) => setAddForm({ ...addForm, consentEvidence: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Bulk Paste Modal */}
      {activeModal === 'paste' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => {
                setActiveModal(null);
                setPasteValidation(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Bulk Email Paste</h3>
                <p className="text-xs text-slate-500">
                  Paste email addresses separated by new lines, commas, or semicolons
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <textarea
                  rows={6}
                  placeholder={`alex@company.com\nsarah.designer@studio.co, marcus@brand.io; elena@decor.com`}
                  value={pasteInput}
                  onChange={(e) => {
                    setPasteInput(e.target.value);
                    setPasteValidation(null);
                  }}
                  className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none text-xs text-slate-900 font-mono placeholder-slate-400 leading-relaxed"
                />
              </div>

              {/* Validation Summary Card */}
              {pasteValidation ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
                  <span className="font-bold text-slate-900 block">Analysis Summary</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">Detected</span>
                      <span className="font-bold text-slate-900">{pasteValidation.totalSubmitted}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-emerald-200">
                      <span className="text-emerald-700 block text-[10px]">Valid Syntax</span>
                      <span className="font-bold text-emerald-600">{pasteValidation.validSyntaxCount}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-rose-200">
                      <span className="text-rose-700 block text-[10px]">Invalid Syntax</span>
                      <span className="font-bold text-rose-600">{pasteValidation.invalidSyntaxCount}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[11px] text-slate-500">
                    <span>Duplicates removed: {pasteValidation.duplicatesRemovedCount}</span>
                    <span>Suppressed addresses: {pasteValidation.suppressedCount}</span>
                  </div>

                  {/* Consent Confirmation Gate */}
                  <label className="flex items-start gap-2.5 pt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pasteConsentConfirmed}
                      onChange={(e) => setPasteConsentConfirmed(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-700 text-xs leading-tight">
                      I confirm that these recipients explicitly opted in to receive promotional marketing emails.
                    </span>
                  </label>
                </div>
              ) : (
                <button
                  onClick={handleValidatePaste}
                  disabled={validatingPaste || !pasteInput.trim()}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 border border-slate-200 flex items-center justify-center gap-1.5 transition"
                >
                  {validatingPaste ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Analyzing addresses...
                    </>
                  ) : (
                    'Analyze Addresses'
                  )}
                </button>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    setPasteValidation(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                {pasteValidation && (
                  <button
                    onClick={handleConfirmPaste}
                    disabled={pasteValidation.validSyntaxCount === 0}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-40 shadow-sm"
                  >
                    Import {pasteValidation.validSyntaxCount} Contacts
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CSV / XLSX Upload Wizard Modal */}
      {activeModal === 'upload' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Import Contacts from Spreadsheet</h3>
                <p className="text-xs text-slate-500">Upload CSV or Excel (.xlsx) audience files</p>
              </div>
            </div>

            {/* Wizard Step 1: Select File */}
            {uploadStep === 'select' && (
              <div className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-50/80"
                >
                  <Upload className="w-10 h-10 text-slate-400 mb-3" />
                  <p className="text-sm font-bold text-slate-800">
                    Click to select CSV or XLSX file
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Supports UTF-8 CSV, .xlsx up to 10MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {uploadingFile && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center flex items-center justify-center gap-2 text-xs text-slate-700 font-medium">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    Parsing spreadsheet and inspecting worksheets...
                  </div>
                )}
              </div>
            )}

            {/* Wizard Step 2: Column Mapping */}
            {uploadStep === 'mapping' && previewResult && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <p className="font-bold text-slate-900">
                    Map Columns for &ldquo;{previewResult.originalFilename}&rdquo;
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    Match spreadsheet columns to MailCraft contact fields.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={columnMapping.email || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">(Select Column)</option>
                      {previewResult.availableColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Full Name</label>
                    <select
                      value={columnMapping.name || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">(None)</option>
                      {previewResult.availableColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Company</label>
                    <select
                      value={columnMapping.company || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, company: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">(None)</option>
                      {previewResult.availableColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Phone</label>
                    <select
                      value={columnMapping.phone || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">(None)</option>
                      {previewResult.availableColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex justify-between">
                  <button
                    onClick={() => setUploadStep('select')}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleUpdateMapping}
                    disabled={!columnMapping.email}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white transition shadow-sm"
                  >
                    Continue to Preview
                  </button>
                </div>
              </div>
            )}

            {/* Wizard Step 3: Preview & Confirm */}
            {uploadStep === 'preview' && previewResult && (
              <div className="space-y-4">
                {/* Stats Breakdown */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Total Rows</span>
                    <span className="font-extrabold text-slate-900 text-base">{previewResult.totalRows}</span>
                  </div>
                  <div>
                    <span className="text-emerald-700 block text-[10px]">Valid Syntax</span>
                    <span className="font-extrabold text-emerald-600 text-base">{previewResult.validRows}</span>
                  </div>
                  <div>
                    <span className="text-amber-700 block text-[10px]">Duplicates In File</span>
                    <span className="font-extrabold text-amber-600 text-base">{previewResult.duplicateRows}</span>
                  </div>
                  <div>
                    <span className="text-rose-700 block text-[10px]">Suppressed</span>
                    <span className="font-extrabold text-rose-600 text-base">{previewResult.suppressedRows}</span>
                  </div>
                </div>

                {/* Sample Rows Preview */}
                <div className="border border-slate-200 rounded-xl overflow-auto max-h-52">
                  <table className="w-full text-left text-[11px] text-slate-600">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">Email</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewResult.previewRows.slice(0, 10).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="p-2 text-slate-400">{row.rowNumber}</td>
                          <td className="p-2 font-mono text-slate-900 font-medium">{row.email}</td>
                          <td className="p-2">{row.name || '\u2014'}</td>
                          <td className="p-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                row.status === 'valid'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : row.status === 'existing'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Consent Gate */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={uploadConsentConfirmed}
                      onChange={(e) => setUploadConsentConfirmed(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-slate-700 leading-relaxed">
                      I confirm that these recipients explicitly opted in to receive promotional emails from our brand.
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="Optional consent source notes (e.g. In-store signups, checkout form)"
                    value={uploadConsentEvidence}
                    onChange={(e) => setUploadConsentEvidence(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900"
                  />
                </div>

                <div className="pt-2 flex justify-between">
                  <button
                    onClick={() => setUploadStep('mapping')}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Back to Mapping
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={confirmingImport}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 transition shadow-sm"
                  >
                    {confirmingImport ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Persisting contacts...
                      </>
                    ) : (
                      `Complete Import (${previewResult.validRows} Contacts)`
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Wizard Step 4: Complete */}
            {uploadStep === 'complete' && previewResult && (
              <div className="py-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Import Successfully Completed</h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Your audience has been updated. Eligible contacts are now ready for campaign selection.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <a
                    href={`/api/v1/contacts/imports/${previewResult.importId}/report?format=csv`}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Error Report
                  </a>
                  <button
                    onClick={() => setActiveModal(null)}
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Edit Contact Drawer / Modal */}
      {activeModal === 'edit' && activeContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => {
                setActiveModal(null);
                setActiveContact(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                <Edit2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit Recipient</h3>
                <p className="text-xs text-slate-500 font-mono">{activeContact.email}</p>
              </div>
            </div>

            <form onSubmit={handleUpdateContact} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={activeContact.name || ''}
                  onChange={(e) => setActiveContact({ ...activeContact, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company</label>
                <input
                  type="text"
                  value={activeContact.company || ''}
                  onChange={(e) => setActiveContact({ ...activeContact, company: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={activeContact.phone || ''}
                  onChange={(e) => setActiveContact({ ...activeContact, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Consent Status</label>
                <select
                  value={activeContact.consentStatus}
                  onChange={(e) =>
                    setActiveContact({
                      ...activeContact,
                      consentStatus: e.target.value as ConsentStatus,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  <option value="opted_in">Eligible (Opted In)</option>
                  <option value="unknown">Pending Consent (Unknown)</option>
                  <option value="unsubscribed">Unsubscribed</option>
                  <option value="suppressed">Suppressed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Consent Evidence</label>
                <input
                  type="text"
                  value={activeContact.consentEvidence || ''}
                  onChange={(e) =>
                    setActiveContact({ ...activeContact, consentEvidence: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    setActiveContact(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Tag Manager Modal */}
      {activeModal === 'tag_manager' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                <TagIcon className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Audience Tags</h3>
                <p className="text-xs text-slate-500">Organize and label your recipients</p>
              </div>
            </div>

            <form onSubmit={handleCreateTag} className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="New tag name (e.g. VIP, BlackFriday)"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                Add Tag
              </button>
            </form>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {tags.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400">No tags created yet</p>
              ) : (
                tags.map((t) => (
                  <div
                    key={t.id || t._id || t.name}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-slate-900">{t.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-[11px] font-mono">
                        {t.contactCount || 0} contacts
                      </span>
                      <button
                        onClick={() => handleDeleteTag(t.id || t._id || '')}
                        className="text-slate-400 hover:text-rose-600 p-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContactsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
          <p className="text-xs font-medium">Loading Audience &amp; Recipients...</p>
        </div>
      }
    >
      <ContactsPageContent />
    </Suspense>
  );
}
