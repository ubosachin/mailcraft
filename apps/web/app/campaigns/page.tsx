'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardHeader } from '@/components/DashboardHeader';
import {
  Send,
  Plus,
  Search,
  RefreshCw,
  Play,
  Pause,
  XCircle,
  Copy,
  Trash2,
  Eye,
  Edit3,
  CheckCircle,
  Clock,
  AlertTriangle,
  Layers,
  Mail,
  Loader2,
  Download,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  BarChart3,
} from 'lucide-react';

interface CampaignItem {
  id: string;
  name: string;
  description?: string;
  subject: string;
  preheader?: string;
  status:
    | 'draft'
    | 'validating'
    | 'scheduled'
    | 'queued'
    | 'sending'
    | 'paused'
    | 'completed'
    | 'partially_completed'
    | 'failed'
    | 'cancelling'
    | 'cancelled';
  provider: string;
  brandName: string;
  brandId: string;
  connectionId?: string;
  audienceType?: string;
  recipientCount: number;
  eligibleRecipientCount: number;
  stats: {
    total: number;
    queued: number;
    processing: number;
    delivered: number;
    bounced: number;
    failed: number;
    skipped: number;
    opened: number;
    clicked: number;
    unsubscribed: number;
  };
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  pausedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface CampaignStats {
  total: number;
  draft: number;
  scheduled: number;
  queued: number;
  sending: number;
  completed: number;
  paused: number;
  failed: number;
  cancelled: number;
}

function CampaignsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [stats, setStats] = useState<CampaignStats>({
    total: 0,
    draft: 0,
    scheduled: 0,
    queued: 0,
    sending: 0,
    completed: 0,
    paused: 0,
    failed: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const limit = 15;

  // Notification
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/v1/campaigns?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = '/login?redirect=/campaigns';
        return;
      }
      const data = await res.json();

      if (data.success && data.data) {
        setCampaigns(data.data.campaigns || []);
        if (data.data.stats) setStats(data.data.stats);
        if (data.data.pagination) {
          setTotalPages(data.data.pagination.totalPages || 1);
          setTotalCount(data.data.pagination.total || 0);
        }
      } else {
        showNotification(data.message || 'Failed to load campaigns', 'error');
      }
    } catch {
      showNotification('Network error loading campaigns', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Periodic polling for campaigns in sending or queued state
  useEffect(() => {
    const hasActive = campaigns.some((c) =>
      ['queued', 'sending', 'validating'].includes(c.status)
    );
    if (!hasActive) return;

    const interval = setInterval(() => {
      fetchCampaigns();
    }, 5000);

    return () => clearInterval(interval);
  }, [campaigns, fetchCampaigns]);

  // Actions
  const handleDuplicate = async (id: string) => {
    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/v1/campaigns/${id}/duplicate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Campaign duplicated successfully into a new draft!', 'success');
        fetchCampaigns();
      } else {
        showNotification(data.message || 'Failed to duplicate campaign', 'error');
      }
    } catch {
      showNotification('Network error duplicating campaign', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePause = async (id: string) => {
    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/v1/campaigns/${id}/pause`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Campaign paused', 'info');
        fetchCampaigns();
      } else {
        showNotification(data.message || 'Failed to pause campaign', 'error');
      }
    } catch {
      showNotification('Network error pausing campaign', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResume = async (id: string) => {
    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/v1/campaigns/${id}/resume`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Campaign delivery resumed', 'success');
        fetchCampaigns();
      } else {
        showNotification(data.message || 'Failed to resume campaign', 'error');
      }
    } catch {
      showNotification('Network error resuming campaign', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this campaign? In-flight emails will halt.')) {
      return;
    }
    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/v1/campaigns/${id}/cancel`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Campaign cancelled', 'info');
        fetchCampaigns();
      } else {
        showNotification(data.message || 'Failed to cancel campaign', 'error');
      }
    } catch {
      showNotification('Network error cancelling campaign', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete campaign "${name}"? This cannot be undone.`)) {
      return;
    }
    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/v1/campaigns/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Campaign deleted successfully', 'success');
        fetchCampaigns();
      } else {
        showNotification(data.message || 'Failed to delete campaign', 'error');
      }
    } catch {
      showNotification('Network error deleting campaign', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: CampaignItem['status']) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Draft
          </span>
        );
      case 'validating':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-950/70 text-indigo-300 border border-indigo-800/80">
            <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
            Validating
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-950/70 text-amber-300 border border-amber-800/80">
            <Clock className="w-3 h-3 text-amber-400" />
            Scheduled
          </span>
        );
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-950/70 text-purple-300 border border-purple-800/80 animate-pulse">
            <Clock className="w-3 h-3 text-purple-400" />
            Queued
          </span>
        );
      case 'sending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-950/70 text-sky-300 border border-sky-800/80">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping inline-block" />
            Sending
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-950/70 text-yellow-300 border border-yellow-800/80">
            <Pause className="w-3 h-3 text-yellow-400" />
            Paused
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-800/80">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            Completed
          </span>
        );
      case 'partially_completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-950/70 text-teal-300 border border-teal-800/80">
            <CheckCircle className="w-3 h-3 text-teal-400" />
            Partially Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-950/70 text-rose-300 border border-rose-800/80">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            Failed
          </span>
        );
      case 'cancelled':
      case 'cancelling':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-900 text-slate-400 border border-slate-800">
            <XCircle className="w-3 h-3 text-slate-500" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  const getProviderBadge = (provider: string) => {
    switch (provider?.toLowerCase()) {
      case 'gmail':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-900/50">
            Gmail
          </span>
        );
      case 'brevo':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-900/50">
            Brevo
          </span>
        );
      case 'ses':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-900/50">
            AWS SES
          </span>
        );
      case 'smtp':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-900/50">
            Custom SMTP
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            Not Connected
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header Navigation */}
      <DashboardHeader
        activeNav="campaigns"
        showLogout
        rightActions={
          <Link
            href="/campaigns/create"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs sm:text-sm shadow-lg shadow-indigo-600/20 transition transform active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Campaign</span>
            <span className="sm:hidden">New</span>
          </Link>
        }
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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
              {notification.type === 'info' && <Clock className="w-5 h-5 text-sky-400" />}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Title & Quick Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              Campaigns &amp; Broadcasts
              <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300 font-normal">
                Phase 6 Engine
              </span>
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              Design, validate, schedule and dispatch high-deliverability promotional emails to your opted-in contacts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchCampaigns()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-sm font-medium transition"
              title="Refresh Campaigns"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              Refresh
            </button>
            <Link
              href="/templates"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-sm font-medium transition"
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              Browse Templates
            </Link>
          </div>
        </div>

        {/* Live Metric Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Campaigns</span>
              <Send className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">{stats.total}</div>
            <div className="text-xs text-slate-500 mt-1">Across all lifecycles</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Active / Sending</span>
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping inline-block" />
            </div>
            <div className="text-2xl font-bold text-sky-300 mt-2">
              {stats.sending + stats.queued}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {stats.sending} in progress, {stats.queued} queued
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Completed</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-300 mt-2">{stats.completed}</div>
            <div className="text-xs text-slate-500 mt-1">Successfully dispatched</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Drafts &amp; Scheduled</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-300 mt-2">
              {stats.draft + stats.scheduled}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {stats.draft} drafts, {stats.scheduled} scheduled
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Paused / Failed</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-rose-300 mt-2">
              {stats.paused + stats.failed}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {stats.paused} paused, {stats.failed} failed
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-3 w-full">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search campaigns by name or subject line..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 px-3 py-2 focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="all">All Lifecycles</option>
              <option value="draft">Drafts</option>
              <option value="scheduled">Scheduled</option>
              <option value="queued">Queued</option>
              <option value="sending">Sending</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="text-xs text-slate-400">
            Showing <span className="font-semibold text-white">{campaigns.length}</span> of{' '}
            <span className="font-semibold text-white">{totalCount}</span> campaigns
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          {loading && campaigns.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm">Loading campaign infrastructure...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 flex items-center justify-center mx-auto text-indigo-400 shadow-inner">
                <Send className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-semibold text-white">No campaigns found</h3>
                <p className="text-slate-400 text-sm mt-1">
                  {search || statusFilter !== 'all'
                    ? 'No campaigns match your active search or filters. Try resetting the filter.'
                    : 'Get started by creating your first promotional email campaign with real sender integration.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  href="/campaigns/create"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  Create Campaign
                </Link>
                <Link
                  href="/templates"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-sm transition"
                >
                  <Layers className="w-4 h-4" />
                  Explore Templates
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase font-semibold text-slate-400">
                  <tr>
                    <th scope="col" className="px-6 py-4">
                      Campaign &amp; Subject
                    </th>
                    <th scope="col" className="px-4 py-4">
                      Brand / Provider
                    </th>
                    <th scope="col" className="px-4 py-4">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-4">
                      Delivery Stats
                    </th>
                    <th scope="col" className="px-4 py-4">
                      Timeline
                    </th>
                    <th scope="col" className="px-6 py-4 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {campaigns.map((camp) => {
                    const totalRecipients = camp.recipientCount || camp.stats?.total || 0;
                    const deliveredCount = camp.stats?.delivered || 0;
                    const progressPercent =
                      totalRecipients > 0
                        ? Math.min(100, Math.round((deliveredCount / totalRecipients) * 100))
                        : 0;

                    return (
                      <tr
                        key={camp.id}
                        className="hover:bg-slate-800/40 transition group cursor-pointer"
                        onClick={(e) => {
                          // Prevent row click if clicked on an action button
                          if ((e.target as HTMLElement).closest('button, a')) return;
                          router.push(`/campaigns/${camp.id}`);
                        }}
                      >
                        {/* Name & Subject */}
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                              <Mail className="w-4 h-4" />
                            </div>
                            <div>
                              <Link
                                href={`/campaigns/${camp.id}`}
                                className="font-semibold text-white hover:text-indigo-400 transition"
                              >
                                {camp.name}
                              </Link>
                              <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                                <span className="text-slate-500 font-medium">Subject:</span>{' '}
                                {camp.subject || '(No subject set)'}
                              </div>
                              {camp.preheader && (
                                <div className="text-[11px] text-slate-500 line-clamp-1">
                                  {camp.preheader}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Brand & Provider */}
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-slate-200">
                              {camp.brandName || 'Default Brand'}
                            </div>
                            <div>{getProviderBadge(camp.provider)}</div>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="px-4 py-4">{getStatusBadge(camp.status)}</td>

                        {/* Delivery Progress Bar */}
                        <td className="px-4 py-4">
                          <div className="w-36 space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400 font-medium">
                                {camp.status === 'draft' ? (
                                  <span>{camp.eligibleRecipientCount || 0} eligible</span>
                                ) : (
                                  <span>
                                    {deliveredCount} / {totalRecipients}
                                  </span>
                                )}
                              </span>
                              {camp.status !== 'draft' && (
                                <span className="text-slate-500 text-[11px]">
                                  {progressPercent}%
                                </span>
                              )}
                            </div>
                            {camp.status !== 'draft' && (
                              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-500 ${
                                    camp.status === 'completed'
                                      ? 'bg-emerald-500'
                                      : camp.status === 'failed'
                                      ? 'bg-rose-500'
                                      : camp.status === 'paused'
                                      ? 'bg-yellow-500'
                                      : 'bg-indigo-500'
                                  }`}
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Timeline */}
                        <td className="px-4 py-4 text-xs text-slate-400">
                          {camp.status === 'scheduled' && camp.scheduledAt ? (
                            <div className="flex items-center gap-1.5 text-amber-300">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{new Date(camp.scheduledAt).toLocaleDateString()}</span>
                            </div>
                          ) : camp.completedAt ? (
                            <div>{new Date(camp.completedAt).toLocaleDateString()}</div>
                          ) : (
                            <div>{new Date(camp.createdAt).toLocaleDateString()}</div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Monitor / View Button */}
                            <Link
                              href={`/campaigns/${camp.id}`}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                              title="Monitor Campaign"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>

                            {/* Analytics Button */}
                            <Link
                              href={`/campaigns/${camp.id}/analytics`}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-900/60 text-slate-300 hover:text-indigo-300 transition"
                              title="Campaign Analytics"
                            >
                              <BarChart3 className="w-4 h-4 text-indigo-400" />
                            </Link>

                            {/* State sensitive controls */}
                            {camp.status === 'draft' && (
                              <Link
                                href={`/campaigns/create?id=${camp.id}`}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                                title="Edit Campaign"
                              >
                                <Edit3 className="w-4 h-4 text-indigo-400" />
                              </Link>
                            )}

                            {camp.status === 'sending' && (
                              <button
                                onClick={() => handlePause(camp.id)}
                                disabled={actionLoadingId === camp.id}
                                className="p-1.5 rounded-lg bg-yellow-950/60 hover:bg-yellow-900/80 text-yellow-300 border border-yellow-800 transition"
                                title="Pause Campaign"
                              >
                                {actionLoadingId === camp.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Pause className="w-4 h-4" />
                                )}
                              </button>
                            )}

                            {camp.status === 'paused' && (
                              <button
                                onClick={() => handleResume(camp.id)}
                                disabled={actionLoadingId === camp.id}
                                className="p-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800 transition"
                                title="Resume Campaign"
                              >
                                {actionLoadingId === camp.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                              </button>
                            )}

                            {(camp.status === 'queued' ||
                              camp.status === 'sending' ||
                              camp.status === 'scheduled') && (
                              <button
                                onClick={() => handleCancel(camp.id)}
                                disabled={actionLoadingId === camp.id}
                                className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800 transition"
                                title="Cancel Campaign"
                              >
                                {actionLoadingId === camp.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <XCircle className="w-4 h-4" />
                                )}
                              </button>
                            )}

                            {/* Duplicate */}
                            <button
                              onClick={() => handleDuplicate(camp.id)}
                              disabled={actionLoadingId === camp.id}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                              title="Duplicate Campaign"
                            >
                              {actionLoadingId === camp.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>

                            {/* Delete Draft/Finished */}
                            {['draft', 'completed', 'failed', 'cancelled'].includes(camp.status) && (
                              <button
                                onClick={() => handleDelete(camp.id, camp.name)}
                                disabled={actionLoadingId === camp.id}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 transition"
                                title="Delete Campaign"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      }
    >
      <CampaignsContent />
    </Suspense>
  );
}

