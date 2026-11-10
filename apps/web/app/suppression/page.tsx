'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { DashboardHeader } from '@/components/DashboardHeader';
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
  Loader2,
  ChevronLeft,
  ChevronRight,
  Info,
  Building,
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
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            Unsubscribed
          </span>
        );
      case 'hard_bounce':
      case 'bounce':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            Hard Bounce
          </span>
        );
      case 'complaint':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            Spam Complaint
          </span>
        );
      case 'manual':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
            Manual
          </span>
        );
      case 'administrative':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            Administrative
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {reason}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Header */}
      <DashboardHeader
        activeNav="suppression"
        showComplianceNav
        showLogout
        rightActions={
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm shadow-indigo-600/20 transition whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Suppression</span>
            <span className="sm:hidden">Add</span>
          </button>
        }
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Toast Notification */}
        {notification && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between shadow-sm border transition ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : notification.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-sky-50 border-sky-200 text-sky-900'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-600" />}
              {notification.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-600" />}
              {notification.type === 'info' && <Info className="w-5 h-5 text-sky-600" />}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-700 font-bold px-1">
              ×
            </button>
          </div>
        )}

        {/* Page Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold mb-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              Compliance Guardian
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Global Suppression List
            </h1>
            <p className="text-slate-600 mt-1 text-sm">
              Permanent suppression rules protect sender reputation by automatically blocking unsubscribes, hard bounces, and spam complaints.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchSuppressions()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-sm transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="saas-card p-4">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Suppressions</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total}</div>
            <span className="text-[11px] text-slate-500">Across all categories</span>
          </div>

          <div className="saas-card p-4">
            <span className="text-xs text-amber-700 font-semibold uppercase tracking-wider">Unsubscribed</span>
            <div className="text-2xl font-extrabold text-amber-600 mt-1">{stats.unsubscribe}</div>
            <span className="text-[11px] text-slate-500">Voluntary opt-outs</span>
          </div>

          <div className="saas-card p-4">
            <span className="text-xs text-rose-700 font-semibold uppercase tracking-wider">Hard Bounces</span>
            <div className="text-2xl font-extrabold text-rose-600 mt-1">{stats.hard_bounce}</div>
            <span className="text-[11px] text-slate-500">Invalid mailboxes</span>
          </div>

          <div className="saas-card p-4">
            <span className="text-xs text-purple-700 font-semibold uppercase tracking-wider">Spam Complaints</span>
            <div className="text-2xl font-extrabold text-purple-600 mt-1">{stats.complaint}</div>
            <span className="text-[11px] text-slate-500">Feedback loop reports</span>
          </div>

          <div className="saas-card p-4">
            <span className="text-xs text-sky-700 font-semibold uppercase tracking-wider">Manual / Admin</span>
            <div className="text-2xl font-extrabold text-sky-600 mt-1">{stats.manual + stats.administrative}</div>
            <span className="text-[11px] text-slate-500">Operator designated</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="saas-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3 w-full">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search suppressed address..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            <select
              value={reasonFilter}
              onChange={(e) => {
                setReasonFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            >
              <option value="all">All Reasons</option>
              <option value="unsubscribe">Unsubscribed</option>
              <option value="hard_bounce">Hard Bounce</option>
              <option value="complaint">Spam Complaint</option>
              <option value="manual">Manual Suppression</option>
              <option value="administrative">Administrative</option>
            </select>
          </div>

          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-900">{entries.length}</span> of{' '}
            <span className="font-semibold text-slate-900">{totalCount}</span> entries
          </div>
        </div>

        {/* Suppression Table */}
        <div className="saas-card overflow-hidden">
          {loading && entries.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-sm font-medium">Querying cryptographic suppression vault...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No suppressions recorded</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                No addresses match your filter. Unsubscribes and bounces are automatically listed here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/90 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Masked Recipient</th>
                    <th className="px-4 py-4">Suppression Reason</th>
                    <th className="px-4 py-4">Scope</th>
                    <th className="px-4 py-4">Source / Context</th>
                    <th className="px-4 py-4">Date Added</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition text-xs">
                      <td className="px-6 py-4 font-mono font-semibold text-slate-900 flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        {entry.emailMasked}
                      </td>
                      <td className="px-4 py-4">{getReasonBadge(entry.reason)}</td>
                      <td className="px-4 py-4 uppercase font-semibold text-[10px] text-slate-500">
                        {entry.scope}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        <div className="line-clamp-1">
                          {entry.reasonDetail || entry.notes || entry.source}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-500">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setRemovingItem(entry);
                            setAuditReason('');
                            setForceRemove(false);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-rose-700 font-medium text-xs transition"
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
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <div>
                Page <span className="font-semibold text-slate-900">{page}</span> of{' '}
                <span className="font-semibold text-slate-900">{totalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium disabled:opacity-40 hover:bg-slate-50 transition flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium disabled:opacity-40 hover:bg-slate-50 transition flex items-center gap-1"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-indigo-600" />
                Add Address to Suppression List
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase text-slate-500 mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="recipient@example.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-500 mb-1.5">
                  Suppression Category
                </label>
                <select
                  value={addForm.reason}
                  onChange={(e) => setAddForm({ ...addForm, reason: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="manual">Manual Suppression (Precautionary)</option>
                  <option value="unsubscribe">Unsubscribed (Customer Request)</option>
                  <option value="hard_bounce">Hard Bounce (Invalid Mailbox)</option>
                  <option value="complaint">Spam Complaint</option>
                  <option value="administrative">Administrative Exclusion</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-500 mb-1.5">
                  Scope
                </label>
                <select
                  value={addForm.scope}
                  onChange={(e) => setAddForm({ ...addForm, scope: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="session">Account Workspace (Applies to your workspace)</option>
                  <option value="global">Global (Barred platform-wide)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-500 mb-1.5">
                  Internal Notes &amp; Justification
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. User requested removal via customer support ticket #1024"
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 transition"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Administrative Suppression Removal
              </h3>
              <button
                onClick={() => setRemovingItem(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Removing a suppression allows this email address (<span className="font-mono font-semibold text-slate-900">{removingItem.emailMasked}</span>) to receive future broadcasts.
            </p>

            {['complaint', 'hard_bounce'].includes(removingItem.reason) && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                <span className="font-bold">Strict Compliance Restriction:</span>
                <p>
                  This address is flagged as {removingItem.reason.toUpperCase()}. Re-sending to complaint or hard-bounce addresses directly damages your sending domain reputation.
                </p>
              </div>
            )}

            <form onSubmit={handleRemoveSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase text-slate-500 mb-1.5">
                  Documented Audit Justification <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g., Customer submitted signed re-opt-in confirmation and confirmed mailbox is active"
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              {['complaint', 'hard_bounce'].includes(removingItem.reason) && (
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={forceRemove}
                    onChange={(e) => setForceRemove(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Confirm override of compliance lock (Force Remove)</span>
                </label>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRemovingItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={removeLoading || (['complaint', 'hard_bounce'].includes(removingItem.reason) && !forceRemove)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 shadow-sm transition"
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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <SuppressionContent />
    </Suspense>
  );
}

