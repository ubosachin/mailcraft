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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Draft
          </span>
        );
      case 'validating':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
            Validating
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Scheduled
          </span>
        );
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 animate-pulse">
            <Clock className="w-3 h-3 text-purple-600" />
            Queued
          </span>
        );
      case 'sending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping inline-block" />
            Sending
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-800 border border-yellow-200">
            <Pause className="w-3 h-3 text-yellow-600" />
            Paused
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            Completed
          </span>
        );
      case 'partially_completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            <CheckCircle className="w-3 h-3 text-teal-600" />
            Partially Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Failed
          </span>
        );
      case 'cancelled':
      case 'cancelling':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
            <XCircle className="w-3 h-3 text-slate-400" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const getProviderBadge = (provider: string) => {
    switch (provider?.toLowerCase()) {
      case 'gmail':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
            Gmail
          </span>
        );
      case 'gmail_smtp':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
            Gmail App SMTP
          </span>
        );
      case 'brevo':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            Brevo
          </span>
        );
      case 'ses':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            AWS SES
          </span>
        );
      case 'smtp':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200">
            Custom SMTP
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
            Not Connected
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Header Navigation */}
      <DashboardHeader
        activeNav="campaigns"
        showLogout
        rightActions={
          <Link
            href="/campaigns/create"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-sm shadow-indigo-600/20 transition transform active:scale-95 whitespace-nowrap"
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
              {notification.type === 'info' && <Clock className="w-5 h-5 text-sky-600" />}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-700 p-1"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Title & Quick Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold mb-2">
              <Send className="w-3 h-3" />
              Broadcast Engine
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Campaigns &amp; Broadcasts
            </h1>
            <p className="text-slate-600 mt-1 text-sm">
              Design, validate, schedule, and dispatch high-deliverability campaigns to your opted-in contacts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchCampaigns()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-sm transition"
              title="Refresh Campaigns"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
              Refresh
            </button>
            <Link
              href="/templates"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-sm transition"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              Browse Templates
            </Link>
          </div>
        </div>

        {/* Live Metric Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="saas-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</span>
              <Send className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-2">{stats.total}</div>
            <div className="text-xs text-slate-500 mt-1">Across all lifecycles</div>
          </div>

          <div className="saas-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sky-700 uppercase tracking-wider">Active / Sending</span>
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping inline-block" />
            </div>
            <div className="text-2xl font-extrabold text-sky-600 mt-2">
              {stats.sending + stats.queued}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {stats.sending} in progress, {stats.queued} queued
            </div>
          </div>

          <div className="saas-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Completed</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-2">{stats.completed}</div>
            <div className="text-xs text-slate-500 mt-1">Successfully dispatched</div>
          </div>

          <div className="saas-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Drafts &amp; Scheduled</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-extrabold text-amber-600 mt-2">
              {stats.draft + stats.scheduled}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {stats.draft} drafts, {stats.scheduled} scheduled
            </div>
          </div>

          <div className="saas-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Paused / Failed</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-extrabold text-rose-600 mt-2">
              {stats.paused + stats.failed}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {stats.paused} paused, {stats.failed} failed
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="saas-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-3 w-full">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search campaigns by name or subject line..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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

          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-900">{campaigns.length}</span> of{' '}
            <span className="font-semibold text-slate-900">{totalCount}</span> campaigns
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="saas-card overflow-hidden">
          {loading && campaigns.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-sm font-medium">Loading campaign infrastructure...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center mx-auto text-indigo-600">
                <Send className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-bold text-slate-900">No campaigns found</h3>
                <p className="text-slate-600 text-sm mt-1">
                  {search || statusFilter !== 'all'
                    ? 'No campaigns match your active search or filters. Try resetting the filter.'
                    : 'Get started by creating your first promotional email campaign with connected provider delivery.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  href="/campaigns/create"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm shadow-indigo-600/20 transition"
                >
                  <Plus className="w-4 h-4" />
                  Create Campaign
                </Link>
                <Link
                  href="/templates"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-sm font-semibold transition"
                >
                  <Layers className="w-4 h-4" />
                  Explore Templates
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/90 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
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
                <tbody className="divide-y divide-slate-100">
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
                        className="hover:bg-slate-50/80 transition group cursor-pointer"
                        onClick={(e) => {
                          // Prevent row click if clicked on an action button
                          if ((e.target as HTMLElement).closest('button, a')) return;
                          router.push(`/campaigns/${camp.id}`);
                        }}
                      >
                        {/* Name & Subject */}
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                              <Mail className="w-4 h-4" />
                            </div>
                            <div>
                              <Link
                                href={`/campaigns/${camp.id}`}
                                className="font-semibold text-slate-900 hover:text-indigo-600 transition"
                              >
                                {camp.name}
                              </Link>
                              <div className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                                <span className="text-slate-400 font-medium">Subject:</span>{' '}
                                {camp.subject || '(No subject set)'}
                              </div>
                              {camp.preheader && (
                                <div className="text-[11px] text-slate-400 line-clamp-1">
                                  {camp.preheader}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Brand & Provider */}
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-slate-800">
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
                              <span className="text-slate-600 font-medium">
                                {camp.status === 'draft' ? (
                                  <span>{camp.eligibleRecipientCount || 0} eligible</span>
                                ) : (
                                  <span>
                                    {deliveredCount} / {totalRecipients}
                                  </span>
                                )}
                              </span>
                              {camp.status !== 'draft' && (
                                <span className="text-slate-500 font-mono text-[11px]">
                                  {progressPercent}%
                                </span>
                              )}
                            </div>
                            {camp.status !== 'draft' && (
                              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-500 ${
                                    camp.status === 'completed'
                                      ? 'bg-emerald-500'
                                      : camp.status === 'failed'
                                      ? 'bg-rose-500'
                                      : camp.status === 'paused'
                                      ? 'bg-amber-500'
                                      : 'bg-indigo-600'
                                  }`}
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Timeline */}
                        <td className="px-4 py-4 text-xs text-slate-500">
                          {camp.status === 'scheduled' && camp.scheduledAt ? (
                            <div className="flex items-center gap-1.5 text-amber-700 font-medium">
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
                              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition"
                              title="Monitor Campaign"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>

                            {/* Analytics Button */}
                            <Link
                              href={`/campaigns/${camp.id}/analytics`}
                              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 text-indigo-600 transition"
                              title="Campaign Analytics"
                            >
                              <BarChart3 className="w-4 h-4" />
                            </Link>

                            {/* State sensitive controls */}
                            {camp.status === 'draft' && (
                              <Link
                                href={`/campaigns/create?id=${camp.id}`}
                                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-indigo-50 text-indigo-600 transition"
                                title="Edit Campaign"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Link>
                            )}

                            {camp.status === 'sending' && (
                              <button
                                onClick={() => handlePause(camp.id)}
                                disabled={actionLoadingId === camp.id}
                                className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition"
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
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
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
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
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
                              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition"
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
                                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition"
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
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <CampaignsContent />
    </Suspense>
  );
}

