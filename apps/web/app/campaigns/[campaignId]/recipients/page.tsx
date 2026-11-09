'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  ShieldCheck,
} from 'lucide-react';

interface RecipientItem {
  id: string;
  email: string;
  status: string;
  provider?: string;
  providerMessageId?: string;
  attempts: number;
  errorCode?: string;
  errorMessage?: string;
  sentAt?: string;
  deliveredAt?: string;
  updatedAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email || 'anonymous';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

function RecipientsListContent() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [recipients, setRecipients] = useState<RecipientItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [maskEmails, setMaskEmails] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecipients = useCallback(
    async (pageToLoad = 1) => {
      try {
        setLoading(true);
        setError(null);
        const queryParams = new URLSearchParams();
        queryParams.set('page', String(pageToLoad));
        queryParams.set('limit', '25');
        if (statusFilter && statusFilter !== 'all') {
          queryParams.set('status', statusFilter);
        }
        if (searchQuery.trim()) {
          queryParams.set('search', searchQuery.trim());
        }

        const res = await fetch(`/api/v1/campaigns/${campaignId}/recipients?${queryParams.toString()}`);
        if (!res.ok) {
          throw new Error('Failed to load campaign recipients');
        }
        const json = await res.json();
        if (json.success) {
          setRecipients(json.data.recipients || []);
          setPagination(json.data.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 });
        } else {
          throw new Error(json.error?.message || 'Error parsing recipient data');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch recipients');
      } finally {
        setLoading(false);
      }
    },
    [campaignId, statusFilter, searchQuery]
  );

  useEffect(() => {
    fetchRecipients(1);
  }, [fetchRecipients]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Delivered
          </span>
        );
      case 'sent':
      case 'provider_accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3" /> Sent
          </span>
        );
      case 'bounced':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle className="w-3 h-3" /> Bounced
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      case 'skipped':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            Skipped
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href={`/campaigns/${campaignId}/analytics`}
              className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Campaign Analytics
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Recipients
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Recipient Dispatch Log</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review delivery status, attempts, bounce details and error codes per individual recipient.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setMaskEmails(!maskEmails)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
            title="Toggle email privacy mask"
          >
            <ShieldCheck className="w-4 h-4 text-slate-500" />
            {maskEmails ? 'Show Plain Email' : 'Mask Email'}
          </button>
          <a
            href={`/api/v1/campaigns/${campaignId}/report?format=csv&filter=all`}
            download
            className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            Export Recipients CSV
          </a>
          <button
            onClick={() => fetchRecipients(pagination.page)}
            className="p-2 text-slate-500 hover:text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 w-full md:w-auto items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search recipient email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchRecipients(1)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={() => fetchRecipients(1)}
            className="px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
          >
            Search
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Filter className="w-4 h-4 text-slate-400" />
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
              }}
              className="text-sm border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="bounced">Bounced</option>
              <option value="failed">Failed</option>
              <option value="skipped">Skipped</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-sm text-slate-500">Loading recipient logs...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 text-sm">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
            {error}
          </div>
        ) : recipients.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <Mail className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            No recipients found matching the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6">Recipient Email</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-center">Attempts</th>
                  <th className="py-3 px-6">Error / Diagnostic</th>
                  <th className="py-3 px-6">Sent / Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recipients.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-6 font-mono text-xs text-slate-900">
                      {maskEmails ? maskEmail(r.email) : r.email}
                      {r.providerMessageId && (
                        <div className="text-[10px] text-slate-400 truncate max-w-xs font-mono">
                          ID: {r.providerMessageId}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-6">{getStatusBadge(r.status)}</td>
                    <td className="py-3 px-6 text-center text-xs font-semibold text-slate-700">
                      {r.attempts}
                    </td>
                    <td className="py-3 px-6 text-xs text-slate-600 max-w-xs truncate">
                      {r.errorMessage || r.errorCode ? (
                        <span className="text-red-600" title={r.errorMessage || r.errorCode}>
                          {r.errorCode ? `[${r.errorCode}] ` : ''}
                          {r.errorMessage || 'Bounce or send error'}
                        </span>
                      ) : (
                        <span className="text-slate-400">&mdash;</span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-xs text-slate-500 whitespace-nowrap">
                      {r.sentAt ? new Date(r.sentAt).toLocaleString() : new Date(r.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} recipients
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchRecipients(pagination.page - 1)}
                className="p-1.5 rounded border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchRecipients(pagination.page + 1)}
                className="p-1.5 rounded border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CampaignRecipientsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <RecipientsListContent />
    </Suspense>
  );
}
