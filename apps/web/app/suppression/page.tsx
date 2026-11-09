'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  ArrowLeft,
  Mail,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Info,
  Building,
  Layers,
  Server,
  Users,
  Send,
  SlidersHorizontal,
  Lock,
} from 'lucide-react';

interface SuppressionItem {
  id: string;
  emailMasked: string;
  emailPlain?: string;
  reason: string;
  scope: string;
  source: string;
  reasonDetail?: string;
  notes?: string;
  createdAt: string;
}

interface SuppressionStats {
  total: number;
  unsubscribe: number;
  hard_bounce: number;
  complaint: number;
  manual: number;
  administrative: number;
}

function SuppressionContent() {
  const [entries, setEntries] = useState<SuppressionItem[]>([]);
  const [stats, setStats] = useState<SuppressionStats>({
    total: 0,
    unsubscribe: 0,
    hard_bounce: 0,
    complaint: 0,
    manual: 0,
    administrative: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const limit = 20;

  // Add modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [addForm, setAddForm] = useState({
    email: '',
    reason: 'manual',
    scope: 'session',
    notes: '',
  });
  const [addLoading, setAddLoading] = useState<boolean>(false);

  // Remove modal
  const [removingItem, setRemovingItem] = useState<SuppressionItem | null>(null);
  const [auditReason, setAuditReason] = useState<string>('');
  const [forceRemove, setForceRemove] = useState<boolean>(false);
  const [removeLoading, setRemoveLoading] = useState<boolean>(false);

  // Notification
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchSuppressions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (search.trim()) params.set('search', search.trim());
      if (reasonFilter !== 'all') params.set('reason', reasonFilter);

      const res = await fetch(`/api/v1/suppression?${params.toString()}`);
      const data = await res.json();

      if (data.success && data.data) {
        setEntries(data.data.suppressions || []);
        if (data.data.stats) setStats(data.data.stats);
        if (data.data.pagination) {
          setTotalPages(data.data.pagination.totalPages || 1);
          setTotalCount(data.data.pagination.total || 0);
        }
      } else {
        showNotification(data.message || 'Failed to load suppressions', 'error');
      }
    } catch {
      showNotification('Network error loading suppressions', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, reasonFilter]);

  useEffect(() => {
    fetchSuppressions();
  }, [fetchSuppressions]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.email || !addForm.email.includes('@')) {
      showNotification('Please enter a valid email address', 'error');
      return;
    }
    try {
      setAddLoading(true);
      const res = await fetch('/api/v1/suppression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Address added to suppression list', 'success');
        setShowAddModal(false);
        setAddForm({ email: '', reason: 'manual', scope: 'session', notes: '' });
        fetchSuppressions();
      } else {
        showNotification(data.message || 'Failed to add suppression', 'error');
      }
    } catch {
      showNotification('Network error adding suppression', 'error');
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!removingItem) return;
    if (!auditReason.trim() || auditReason.length < 3) {
      showNotification('A documented audit justification is required to lift a suppression', 'error');
      return;
    }

    try {
      setRemoveLoading(true);
      const res = await fetch(`/api/v1/suppression/${removingItem.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditReason: auditReason.trim(),
          force: forceRemove,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Suppression lifted with audit log entry', 'success');
        setRemovingItem(null);
        setAuditReason('');
        setForceRemove(false);
        fetchSuppressions();
      } else {
        showNotification(data.message || 'Failed to remove suppression', 'error');
      }
    } catch {
      showNotification('Network error removing suppression', 'error');
    } finally {
      setRemoveLoading(false);
    }
  };

  const getReasonBadge = (reason: string) => {
    switch (reason?.toLowerCase()) {
      case 'unsubscribe':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-amber-950/70 text-amber-300 border border-amber-800">
            Unsubscribed
          </span>
        );
      case 'hard_bounce':
      case 'bounce':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-rose-950/70 text-rose-300 border border-rose-800">
            Hard Bounce
          </span>
        );
      case 'complaint':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-purple-950/70 text-purple-300 border border-purple-800 font-semibold">
            Spam Complaint
          </span>
        );
      case 'manual':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-sky-950/70 text-sky-300 border border-sky-800">
            Manual
          </span>
        );
      case 'administrative':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-indigo-950/70 text-indigo-300 border border-indigo-800">
            Administrative
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
            {reason}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                MailCraft
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link href="/templates" className="text-slate-400 hover:text-white transition flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                Templates
              </Link>
              <Link href="/editor" className="text-slate-400 hover:text-white transition flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4" />
                Visual Editor
              </Link>
              <Link href="/connect" className="text-slate-400 hover:text-white transition flex items-center gap-1.5">
                <Server className="w-4 h-4" />
                Sender Accounts
              </Link>
              <Link href="/contacts" className="text-slate-400 hover:text-white transition flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                Contacts
              </Link>
              <Link href="/campaigns" className="text-slate-400 hover:text-white transition flex items-center gap-1.5">
                <Send className="w-4 h-4" />
                Campaigns
              </Link>
              <Link href="/analytics" className="text-slate-400 hover:text-white transition flex items-center gap-1.5">
                Analytics
              </Link>
              <Link href="/suppression" className="text-indigo-400 border-b-2 border-indigo-500 pb-0.5 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                Suppression
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              Add Suppression
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Toast Notification */}
        {notification && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between shadow-lg border transition ${
              notification.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
                : notification.type === 'error'
                ? 'bg-rose-950/80 border-rose-800 text-rose-200'
                : 'bg-sky-950/80 border-sky-800 text-sky-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
              {notification.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400" />}
              {notification.type === 'info' && <Info className="w-5 h-5 text-sky-400" />}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
              ×
            </button>
          </div>
        )}

        {/* Page Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              Global Suppression &amp; Compliance Guardian
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              Permanent suppression lists protect sender reputation by automatically barring unsubscribes, hard bounces, and spam complaints.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchSuppressions()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow">
            <span className="text-xs text-slate-400 font-medium">Total Suppressions</span>
            <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
            <span className="text-[11px] text-slate-500">Across all categories</span>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow">
            <span className="text-xs text-amber-400 font-medium">Unsubscribed</span>
            <div className="text-2xl font-bold text-amber-300 mt-1">{stats.unsubscribe}</div>
            <span className="text-[11px] text-slate-500">Voluntary opt-outs</span>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow">
            <span className="text-xs text-rose-400 font-medium">Hard Bounces</span>
            <div className="text-2xl font-bold text-rose-300 mt-1">{stats.hard_bounce}</div>
            <span className="text-[11px] text-slate-500">Invalid mailboxes</span>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow">
            <span className="text-xs text-purple-400 font-medium">Spam Complaints</span>
            <div className="text-2xl font-bold text-purple-300 mt-1">{stats.complaint}</div>
            <span className="text-[11px] text-slate-500">FBL &amp; spam button hits</span>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow">
            <span className="text-xs text-sky-400 font-medium">Manual / Admin</span>
            <div className="text-2xl font-bold text-sky-300 mt-1">{stats.manual + stats.administrative}</div>
            <span className="text-[11px] text-slate-500">Operator designated</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3 w-full">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search suppressed address..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={reasonFilter}
              onChange={(e) => {
                setReasonFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Reasons</option>
              <option value="unsubscribe">Unsubscribed</option>
              <option value="hard_bounce">Hard Bounce</option>
              <option value="complaint">Spam Complaint</option>
              <option value="manual">Manual Suppression</option>
              <option value="administrative">Administrative</option>
            </select>
          </div>

          <div className="text-xs text-slate-400">
            Showing <span className="font-semibold text-white">{entries.length}</span> of{' '}
            <span className="font-semibold text-white">{totalCount}</span> entries
          </div>
        </div>

        {/* Suppression Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          {loading && entries.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm">Querying cryptographic suppression vault...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-semibold text-white">No suppressions recorded</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No addresses match your filter. Unsubscribes and bounces will automatically be listed here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-xs uppercase font-semibold text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Masked Recipient</th>
                    <th className="px-4 py-4">Suppression Reason</th>
                    <th className="px-4 py-4">Scope</th>
                    <th className="px-4 py-4">Source / Context</th>
                    <th className="px-4 py-4">Date Added</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-800/30 transition text-xs">
                      <td className="px-6 py-4 font-mono font-medium text-white flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                        {entry.emailMasked}
                      </td>
                      <td className="px-4 py-4">{getReasonBadge(entry.reason)}</td>
                      <td className="px-4 py-4 uppercase font-semibold text-[10px] text-slate-400">
                        {entry.scope}
                      </td>
                      <td className="px-4 py-4 text-slate-400">
                        <div className="line-clamp-1">
                          {entry.reasonDetail || entry.notes || entry.source}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-400">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setRemovingItem(entry);
                            setAuditReason('');
                            setForceRemove(false);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 text-xs transition"
                          title="Lift suppression with audit reason"
                        >
                          Lift Suppression
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div>
                Page {page} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40 hover:bg-slate-800 transition flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40 hover:bg-slate-800 transition flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ADD SUPPRESSION MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-indigo-400" />
                Add Address to Suppression List
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-white"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1">
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  placeholder="recipient@example.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1">
                  Suppression Category
                </label>
                <select
                  value={addForm.reason}
                  onChange={(e) => setAddForm({ ...addForm, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="manual">Manual Suppression (Precautionary)</option>
                  <option value="unsubscribe">Unsubscribed (Customer Request)</option>
                  <option value="hard_bounce">Hard Bounce (Invalid Mailbox)</option>
                  <option value="complaint">Spam Complaint</option>
                  <option value="administrative">Administrative Exclusion</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1">
                  Scope
                </label>
                <select
                  value={addForm.scope}
                  onChange={(e) => setAddForm({ ...addForm, scope: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="session">Workspace Session (Applies to this guest session)</option>
                  <option value="global">Global (Barred platform-wide)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1">
                  Internal Notes &amp; Justification
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. User requested removal via customer support ticket #1024"
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-1.5"
                >
                  {addLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                  Add Suppression
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUDIT REMOVE SUPPRESSION MODAL */}
      {removingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Administrative Suppression Removal
              </h3>
              <button
                onClick={() => setRemovingItem(null)}
                className="text-slate-500 hover:text-white"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Removing a suppression allows this email address ({removingItem.emailMasked}) to receive future promotional broadcasts.
            </p>

            {['complaint', 'hard_bounce'].includes(removingItem.reason) && (
              <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-900/60 text-xs text-rose-300 space-y-1">
                <span className="font-bold">Strict Compliance Restriction:</span>
                <p>
                  This address is flagged as {removingItem.reason.toUpperCase()}. Re-sending to complaint or hard-bounce addresses directly damages your sending domain reputation.
                </p>
              </div>
            )}

            <form onSubmit={handleRemoveSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1">
                  Documented Audit Justification <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g., Customer submitted signed re-opt-in confirmation and confirmed mailbox is active"
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {['complaint', 'hard_bounce'].includes(removingItem.reason) && (
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={forceRemove}
                    onChange={(e) => setForceRemove(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                  />
                  <span>Confirm override of compliance lock (Force Remove)</span>
                </label>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRemovingItem(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={removeLoading || (['complaint', 'hard_bounce'].includes(removingItem.reason) && !forceRemove)}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-medium flex items-center gap-1.5"
                >
                  {removeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Confirm Removal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SuppressionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      }
    >
      <SuppressionContent />
    </Suspense>
  );
}

