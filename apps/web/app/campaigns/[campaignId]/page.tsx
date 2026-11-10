'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Send,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  Play,
  Pause,
  XCircle,
  Copy,
  Download,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Server,
  Users,
  Layers,
  SlidersHorizontal,
  Mail,
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  FileSpreadsheet,
  BarChart3,
} from 'lucide-react';

interface CampaignDetail {
  id: string;
  campaignName: string;
  description?: string;
  subject: string;
  preheader?: string;
  status: string;
  provider: string;
  brand?: {
    id?: string;
    _id?: string;
    brandName?: string;
    senderName?: string;
    senderEmail?: string;
  };
  connection?: {
    id?: string;
    _id?: string;
    provider?: string;
    senderEmail?: string;
  };
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
  snapshot?: {
    renderedHtml?: string;
    renderedText?: string;
    subject?: string;
    preheader?: string;
    senderName?: string;
    senderEmail?: string;
    takenAt?: string;
  };
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  pausedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface RecipientLogItem {
  id: string;
  email: string;
  status: string;
  provider?: string;
  providerMessageId?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  queuedAt?: string;
  acceptedAt?: string;
  deliveredAt?: string;
  bouncedAt?: string;
  failedAt?: string;
  createdAt: string;
}

function CampaignDetailContent() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.campaignId as string;

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'recipients' | 'snapshot'>('recipients');

  // Recipient Logs Table state
  const [recipients, setRecipients] = useState<RecipientLogItem[]>([]);
  const [recipientTotal, setRecipientTotal] = useState<number>(0);
  const [recipientPage, setRecipientPage] = useState<number>(1);
  const [recipientPages, setRecipientPages] = useState<number>(1);
  const [recipientStatusFilter, setRecipientStatusFilter] = useState<string>('all');
  const [recipientSearch, setRecipientSearch] = useState<string>('');
  const [recipientsLoading, setRecipientsLoading] = useState<boolean>(false);

  // Notifications
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Fetch campaign details
  const fetchCampaign = useCallback(async () => {
    if (!campaignId) return;
    try {
      const res = await fetch(`/api/v1/campaigns/${campaignId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setCampaign(data.data);
      } else {
        showNotification(data.message || 'Failed to load campaign', 'error');
      }
    } catch {
      showNotification('Network error loading campaign', 'error');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  // Fetch recipient logs
  const fetchRecipients = useCallback(async () => {
    if (!campaignId) return;
    try {
      setRecipientsLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.set('page', recipientPage.toString());
      queryParams.set('limit', '15');
      if (recipientStatusFilter !== 'all') queryParams.set('status', recipientStatusFilter);
      if (recipientSearch.trim()) queryParams.set('search', recipientSearch.trim());

      const res = await fetch(`/api/v1/campaigns/${campaignId}/recipients?${queryParams.toString()}`);
      const data = await res.json();

      if (data.success && data.data) {
        setRecipients(data.data.recipients || []);
        if (data.data.pagination) {
          setRecipientPages(data.data.pagination.totalPages || 1);
          setRecipientTotal(data.data.pagination.total || 0);
        }
      }
    } catch {
      //
    } finally {
      setRecipientsLoading(false);
    }
  }, [campaignId, recipientPage, recipientStatusFilter, recipientSearch]);

  useEffect(() => {
    fetchCampaign();
    fetchRecipients();
  }, [fetchCampaign, fetchRecipients]);

  // Auto-polling when campaign is actively delivering
  useEffect(() => {
    if (!campaign) return;
    const isActive = ['queued', 'sending', 'validating'].includes(campaign.status);
    if (!isActive) return;

    const interval = setInterval(() => {
      fetchCampaign();
      fetchRecipients();
    }, 4000);

    return () => clearInterval(interval);
  }, [campaign, fetchCampaign, fetchRecipients]);

  // Action Handlers
  const handlePause = async () => {
    try {
      setActionLoading('pause');
      const res = await fetch(`/api/v1/campaigns/${campaignId}/pause`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showNotification('Campaign sending paused', 'info');
        fetchCampaign();
      } else {
        showNotification(data.message || 'Failed to pause campaign', 'error');
      }
    } catch {
      showNotification('Network error pausing campaign', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async () => {
    try {
      setActionLoading('resume');
      const res = await fetch(`/api/v1/campaigns/${campaignId}/resume`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showNotification('Campaign delivery resumed', 'success');
        fetchCampaign();
      } else {
        showNotification(data.message || 'Failed to resume campaign', 'error');
      }
    } catch {
      showNotification('Network error resuming campaign', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this campaign? In-flight emails will halt.')) {
      return;
    }
    try {
      setActionLoading('cancel');
      const res = await fetch(`/api/v1/campaigns/${campaignId}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showNotification('Campaign cancelled', 'info');
        fetchCampaign();
        fetchRecipients();
      } else {
        showNotification(data.message || 'Failed to cancel campaign', 'error');
      }
    } catch {
      showNotification('Network error cancelling campaign', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicate = async () => {
    try {
      setActionLoading('duplicate');
      const res = await fetch(`/api/v1/campaigns/${campaignId}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.data?.id) {
        showNotification('Campaign cloned into draft! Redirecting...', 'success');
        router.push(`/campaigns/${data.data.id}`);
      } else {
        showNotification(data.message || 'Failed to duplicate campaign', 'error');
      }
    } catch {
      showNotification('Network error duplicating campaign', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            Draft
          </span>
        );
      case 'validating':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            Validating
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Scheduled
          </span>
        );
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-950 text-purple-300 border border-purple-800 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            Queued
          </span>
        );
      case 'sending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-950 text-sky-300 border border-sky-800">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping inline-block" />
            Sending Broadcast
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-950 text-yellow-300 border border-yellow-800">
            <Pause className="w-3.5 h-3.5 text-yellow-400" />
            Paused
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            Completed
          </span>
        );
      case 'partially_completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-950 text-teal-300 border border-teal-800">
            <CheckCircle className="w-3.5 h-3.5 text-teal-400" />
            Partially Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-800">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Failed
          </span>
        );
      case 'cancelled':
      case 'cancelling':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 text-slate-400 border border-slate-800">
            <XCircle className="w-3.5 h-3.5 text-slate-500" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  const getRecipientStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-900/60 font-medium">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            Delivered
          </span>
        );
      case 'queued':
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-purple-950/70 text-purple-300 border border-purple-900/60 font-medium">
            <Clock className="w-3 h-3 text-purple-400" />
            Queued
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-sky-950/70 text-sky-300 border border-sky-900/60 font-medium">
            <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
            Processing
          </span>
        );
      case 'bounced':
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-rose-950/70 text-rose-300 border border-rose-900/60 font-medium">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            {status.toUpperCase()}
          </span>
        );
      case 'skipped':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-900/60 font-medium">
            <ShieldAlert className="w-3 h-3 text-amber-400" />
            Suppressed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 font-medium">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm">Connecting to live campaign telemetry...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-center p-4">
        <AlertTriangle className="w-12 h-12 text-rose-400" />
        <h2 className="text-xl font-bold text-white">Campaign Not Found</h2>
        <p className="text-slate-400 text-sm max-w-sm">
          The requested campaign does not exist or has been removed from your workspace.
        </p>
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Campaigns
        </Link>
      </div>
    );
  }

  // Calculate delivery stats
  const totalRecipients = campaign.recipientCount || campaign.stats?.total || 0;
  const deliveredCount = campaign.stats?.delivered || 0;
  const inQueueCount = (campaign.stats?.queued || 0) + (campaign.stats?.processing || 0);
  const failedCount = (campaign.stats?.failed || 0) + (campaign.stats?.bounced || 0);
  const skippedCount = campaign.stats?.skipped || 0;
  const resolvedCount = deliveredCount + failedCount + skippedCount;
  const progressPercent =
    totalRecipients > 0 ? Math.min(100, Math.round((resolvedCount / totalRecipients) * 100)) : 0;
  const successRate =
    resolvedCount > 0 ? Math.round((deliveredCount / Math.max(1, resolvedCount - skippedCount)) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/campaigns"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Campaigns
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-3">
              <span className="font-semibold text-white text-sm">{campaign.campaignName}</span>
              {getStatusBadge(campaign.status)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {campaign.status === 'sending' && (
              <button
                onClick={handlePause}
                disabled={actionLoading === 'pause'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-950/70 hover:bg-yellow-900 border border-yellow-800 text-yellow-300 text-xs font-medium transition"
              >
                {actionLoading === 'pause' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Pause className="w-3.5 h-3.5" />
                )}
                Pause Sending
              </button>
            )}

            {campaign.status === 'paused' && (
              <button
                onClick={handleResume}
                disabled={actionLoading === 'resume'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-medium transition"
              >
                {actionLoading === 'resume' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                Resume Sending
              </button>
            )}

            {(campaign.status === 'queued' ||
              campaign.status === 'sending' ||
              campaign.status === 'scheduled') && (
              <button
                onClick={handleCancel}
                disabled={actionLoading === 'cancel'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-medium transition"
              >
                {actionLoading === 'cancel' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                Cancel
              </button>
            )}

            <button
              onClick={handleDuplicate}
              disabled={actionLoading === 'duplicate'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
              title="Duplicate into a new draft"
            >
              {actionLoading === 'duplicate' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              Clone Draft
            </button>

            <Link
              href={`/campaigns/${campaignId}/analytics`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 text-xs font-medium border border-indigo-700 transition"
              title="View Complete Campaign Analytics"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
              Analytics &amp; Engagement
            </Link>

            <a
              href={`/api/v1/campaigns/${campaignId}/report?format=csv`}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
              title="Download sanitized failure report CSV"
            >
              <Download className="w-3.5 h-3.5" />
              Export Failures
            </a>
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
              {notification.type === 'info' && <Clock className="w-5 h-5 text-sky-400" />}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              ×
            </button>
          </div>
        )}

        {/* Campaign Header Overview */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{campaign.campaignName}</h1>
                <span className="text-xs px-2.5 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-300 uppercase font-semibold">
                  {campaign.provider || 'mock'}
                </span>
              </div>
              <p className="text-sm text-slate-400 max-w-2xl">
                {campaign.description || 'Promotional broadcast campaign.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  fetchCampaign();
                  fetchRecipients();
                }}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                title="Refresh Live Progress"
              >
                <RefreshCw className="w-4 h-4 text-indigo-400" />
              </button>
            </div>
          </div>

          {/* Subject & Meta Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-500 font-semibold uppercase">Subject:</span>
              <div className="text-white font-medium truncate mt-0.5">{campaign.subject}</div>
            </div>
            <div>
              <span className="text-slate-500 font-semibold uppercase">Preheader:</span>
              <div className="text-slate-300 truncate mt-0.5">
                {campaign.preheader || '(No preheader)'}
              </div>
            </div>
            <div>
              <span className="text-slate-500 font-semibold uppercase">Brand / Sender:</span>
              <div className="text-slate-300 truncate mt-0.5">
                {campaign.brand?.brandName || 'Brand'} &lt;{campaign.brand?.senderEmail}&gt;
              </div>
            </div>
            <div>
              <span className="text-slate-500 font-semibold uppercase">Created At:</span>
              <div className="text-slate-300 mt-0.5">
                {new Date(campaign.createdAt).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Delivery Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-white flex items-center gap-2">
                Overall Delivery Progress
                {['sending', 'queued'].includes(campaign.status) && (
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping inline-block" />
                )}
              </span>
              <span className="text-slate-400 font-medium">
                {resolvedCount} of {totalRecipients} processed ({progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  campaign.status === 'completed'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500'
                    : campaign.status === 'paused'
                    ? 'bg-yellow-500'
                    : campaign.status === 'failed'
                    ? 'bg-rose-500'
                    : 'bg-gradient-to-r from-indigo-600 to-violet-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Real-time Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow">
            <div className="text-xs text-slate-400 font-medium">Total Audience</div>
            <div className="text-2xl font-bold text-white mt-1">{totalRecipients}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Opted-in recipients</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow">
            <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Delivered
            </div>
            <div className="text-2xl font-bold text-emerald-300 mt-1">{deliveredCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Provider accepted</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow">
            <div className="text-xs text-purple-400 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              In Queue
            </div>
            <div className="text-2xl font-bold text-purple-300 mt-1">{inQueueCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Pending delivery</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow">
            <div className="text-xs text-rose-400 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Failed / Bounce
            </div>
            <div className="text-2xl font-bold text-rose-300 mt-1">{failedCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Rejected by SMTP</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow">
            <div className="text-xs text-amber-400 font-medium flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              Suppressed
            </div>
            <div className="text-2xl font-bold text-amber-300 mt-1">{skippedCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Auto-skipped safely</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow">
            <div className="text-xs text-indigo-400 font-medium">Success Rate</div>
            <div className="text-2xl font-bold text-indigo-300 mt-1">{successRate}%</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Delivered / Attempted</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 gap-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('recipients')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'recipients'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Recipient Delivery Log ({recipientTotal})
          </button>

          <button
            onClick={() => setActiveTab('snapshot')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'snapshot'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-4 h-4" />
            Frozen Content Snapshot
          </button>
        </div>

        {/* TAB 1: RECIPIENT LOGS */}
        {activeTab === 'recipients' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-4 md:p-6">
            {/* Filter controls */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-1 items-center gap-3 w-full">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search recipient email..."
                    value={recipientSearch}
                    onChange={(e) => {
                      setRecipientSearch(e.target.value);
                      setRecipientPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <select
                  value={recipientStatusFilter}
                  onChange={(e) => {
                    setRecipientStatusFilter(e.target.value);
                    setRecipientPage(1);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 px-3 py-2 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Delivery States</option>
                  <option value="delivered">Delivered / Accepted</option>
                  <option value="queued">Queued / Pending</option>
                  <option value="processing">Processing</option>
                  <option value="bounced">Bounced</option>
                  <option value="failed">Failed</option>
                  <option value="skipped">Suppressed / Skipped</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`/api/v1/campaigns/${campaignId}/report?format=csv`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  Export Failure CSV
                </a>
              </div>
            </div>

            {/* Recipient Table */}
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              {recipientsLoading && recipients.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
                  <p className="text-xs">Loading recipient logs...</p>
                </div>
              ) : recipients.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">
                  No recipient records found matching active filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950/80 border-b border-slate-800 text-xs uppercase font-semibold text-slate-400">
                      <tr>
                        <th className="px-5 py-3">Recipient Email</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Provider ID / Code</th>
                        <th className="px-4 py-3">Dispatched At</th>
                        <th className="px-5 py-3">Failure Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {recipients.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-800/30 transition text-xs">
                          <td className="px-5 py-3 font-medium text-white">{rec.email}</td>
                          <td className="px-4 py-3">{getRecipientStatusBadge(rec.status)}</td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                            {rec.providerMessageId ? (
                              <span className="truncate max-w-[120px] inline-block">
                                {rec.providerMessageId}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-400">
                            {rec.acceptedAt
                              ? new Date(rec.acceptedAt).toLocaleTimeString()
                              : rec.deliveredAt
                              ? new Date(rec.deliveredAt).toLocaleTimeString()
                              : 'Pending'}
                          </td>
                          <td className="px-5 py-3 text-rose-400">
                            {rec.lastErrorMessage ? (
                              <span className="line-clamp-1" title={rec.lastErrorMessage}>
                                {rec.lastErrorMessage}
                              </span>
                            ) : rec.lastErrorCode ? (
                              <span>{rec.lastErrorCode}</span>
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

              {/* Pagination */}
              {recipientPages > 1 && (
                <div className="px-5 py-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div>
                    Page {recipientPage} of {recipientPages} ({recipientTotal} total records)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRecipientPage((p) => Math.max(1, p - 1))}
                      disabled={recipientPage <= 1}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-40 hover:bg-slate-800 transition flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Prev
                    </button>
                    <button
                      onClick={() => setRecipientPage((p) => Math.min(recipientPages, p + 1))}
                      disabled={recipientPage >= recipientPages}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-40 hover:bg-slate-800 transition flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: FROZEN CONTENT SNAPSHOT */}
        {activeTab === 'snapshot' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-400" />
                  Locked Delivery Snapshot
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  The compiled HTML and text contents are frozen at launch to ensure auditability and prevent template drift.
                </p>
              </div>

              {campaign.snapshot?.takenAt && (
                <span className="text-xs text-slate-500">
                  Snapshot taken: {new Date(campaign.snapshot.takenAt).toLocaleString()}
                </span>
              )}
            </div>

            <div className="flex justify-center bg-slate-950 p-6 rounded-xl border border-slate-800 overflow-hidden">
              <div className="bg-white text-slate-900 rounded-lg p-6 max-w-[600px] w-full shadow-2xl max-h-[700px] overflow-y-auto">
                {campaign.snapshot?.renderedHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: campaign.snapshot.renderedHtml }} />
                ) : (
                  <div className="text-center py-12 text-slate-500 text-sm">
                    No frozen snapshot captured yet (campaign is in draft).
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CampaignDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      }
    >
      <CampaignDetailContent />
    </Suspense>
  );
}

