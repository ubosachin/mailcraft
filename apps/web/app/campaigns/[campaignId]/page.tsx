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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Draft
          </span>
        );
      case 'validating':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            Validating
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Scheduled
          </span>
        );
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-purple-600" />
            Queued
          </span>
        );
      case 'sending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping inline-block" />
            Sending Broadcast
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-800 border border-yellow-200">
            <Pause className="w-3.5 h-3.5 text-yellow-600" />
            Paused
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            Completed
          </span>
        );
      case 'partially_completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            <CheckCircle className="w-3.5 h-3.5 text-teal-600" />
            Partially Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Failed
          </span>
        );
      case 'cancelled':
      case 'cancelling':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <XCircle className="w-3.5 h-3.5 text-slate-400" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
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
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            Delivered
          </span>
        );
      case 'queued':
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
            <Clock className="w-3 h-3 text-purple-600" />
            Queued
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
            <Loader2 className="w-3 h-3 animate-spin text-sky-600" />
            Processing
          </span>
        );
      case 'bounced':
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            {status.toUpperCase()}
          </span>
        );
      case 'skipped':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
            <ShieldAlert className="w-3 h-3 text-amber-600" />
            Suppressed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium">Connecting to live campaign telemetry...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-center p-4">
        <AlertTriangle className="w-12 h-12 text-rose-500" />
        <h2 className="text-xl font-bold text-slate-900">Campaign Not Found</h2>
        <p className="text-slate-600 text-sm max-w-sm">
          The requested campaign does not exist or has been removed from your workspace.
        </p>
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm"
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Curved Frosted Light Header */}
      <div className="sticky top-0 z-40 px-3 sm:px-6 lg:px-8 pt-3 pointer-events-none">
        <header className="pointer-events-auto max-w-7xl mx-auto rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-lg shadow-slate-900/5 px-4 sm:px-5 min-h-14 py-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-5 min-w-0">
            <Link
              href="/campaigns"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Campaigns</span>
            </Link>
            <div className="h-4 w-px bg-slate-200 shrink-0" />
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span className="font-bold text-slate-900 text-sm truncate max-w-[160px] sm:max-w-xs">{campaign.campaignName}</span>
              {getStatusBadge(campaign.status)}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {campaign.status === 'sending' && (
              <button
                onClick={handlePause}
                disabled={actionLoading === 'pause'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold transition"
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold transition"
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold transition"
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition"
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition"
              title="View Complete Campaign Analytics"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              Analytics &amp; Engagement
            </Link>

            <a
              href={`/api/v1/campaigns/${campaignId}/report?format=csv`}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition"
              title="Download sanitized failure report CSV"
            >
              <Download className="w-3.5 h-3.5" />
              Export Failures
            </a>
          </div>
        </header>
      </div>

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
              {notification.type === 'info' && <Clock className="w-5 h-5 text-sky-600" />}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-700 p-1 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Campaign Header Overview */}
        <div className="saas-card p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-extrabold text-slate-900">{campaign.campaignName}</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 uppercase font-semibold">
                  {campaign.provider && campaign.provider !== 'unassigned' ? campaign.provider : 'Not Assigned'}
                </span>
              </div>
              <p className="text-sm text-slate-600 max-w-2xl">
                {campaign.description || 'Promotional broadcast campaign.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  fetchCampaign();
                  fetchRecipients();
                }}
                className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 shadow-xs transition"
                title="Refresh Live Progress"
              >
                <RefreshCw className="w-4 h-4 text-indigo-600" />
              </button>
            </div>
          </div>

          {/* Subject & Meta Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 font-semibold uppercase">Subject:</span>
              <div className="text-slate-900 font-semibold truncate mt-0.5">{campaign.subject}</div>
            </div>
            <div>
              <span className="text-slate-400 font-semibold uppercase">Preheader:</span>
              <div className="text-slate-700 truncate mt-0.5">
                {campaign.preheader || '(No preheader)'}
              </div>
            </div>
            <div>
              <span className="text-slate-400 font-semibold uppercase">Brand / Sender:</span>
              <div className="text-slate-700 truncate mt-0.5">
                {campaign.brand?.brandName || 'Brand'} &lt;{campaign.brand?.senderEmail}&gt;
              </div>
            </div>
            <div>
              <span className="text-slate-400 font-semibold uppercase">Created At:</span>
              <div className="text-slate-700 mt-0.5">
                {new Date(campaign.createdAt).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Delivery Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-slate-900 flex items-center gap-2">
                Overall Delivery Progress
                {['sending', 'queued'].includes(campaign.status) && (
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping inline-block" />
                )}
              </span>
              <span className="text-slate-600 font-medium">
                {resolvedCount} of {totalRecipients} processed ({progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 border border-slate-200 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  campaign.status === 'completed'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    : campaign.status === 'paused'
                    ? 'bg-amber-500'
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
          <div className="saas-card p-4">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Audience</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalRecipients}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Opted-in recipients</div>
          </div>

          <div className="saas-card p-4">
            <div className="text-xs text-emerald-700 font-semibold uppercase tracking-wider flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Delivered
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">{deliveredCount}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Provider accepted</div>
          </div>

          <div className="saas-card p-4">
            <div className="text-xs text-purple-700 font-semibold uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              In Queue
            </div>
            <div className="text-2xl font-extrabold text-purple-600 mt-1">{inQueueCount}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Pending delivery</div>
          </div>

          <div className="saas-card p-4">
            <div className="text-xs text-rose-700 font-semibold uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Failed / Bounce
            </div>
            <div className="text-2xl font-extrabold text-rose-600 mt-1">{failedCount}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Rejected by SMTP</div>
          </div>

          <div className="saas-card p-4">
            <div className="text-xs text-amber-700 font-semibold uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              Suppressed
            </div>
            <div className="text-2xl font-extrabold text-amber-600 mt-1">{skippedCount}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Auto-skipped safely</div>
          </div>

          <div className="saas-card p-4">
            <div className="text-xs text-indigo-700 font-semibold uppercase tracking-wider">Success Rate</div>
            <div className="text-2xl font-extrabold text-indigo-600 mt-1">{successRate}%</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Delivered / Attempted</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('recipients')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'recipients'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            Recipient Delivery Log ({recipientTotal})
          </button>

          <button
            onClick={() => setActiveTab('snapshot')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'snapshot'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Eye className="w-4 h-4" />
            Frozen Content Snapshot
          </button>
        </div>

        {/* TAB 1: RECIPIENT LOGS */}
        {activeTab === 'recipients' && (
          <div className="saas-card overflow-hidden space-y-4 p-4 md:p-6">
            {/* Filter controls */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-1 items-center gap-3 w-full">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search recipient email..."
                    value={recipientSearch}
                    onChange={(e) => {
                      setRecipientSearch(e.target.value);
                      setRecipientPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <select
                  value={recipientStatusFilter}
                  onChange={(e) => {
                    setRecipientStatusFilter(e.target.value);
                    setRecipientPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Export Failure CSV
                </a>
              </div>
            </div>

            {/* Recipient Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              {recipientsLoading && recipients.length === 0 ? (
                <div className="p-12 text-center text-slate-500 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                  <p className="text-xs font-medium">Loading recipient logs...</p>
                </div>
              ) : recipients.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">
                  No recipient records found matching active filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Recipient Email</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Provider ID / Code</th>
                        <th className="px-4 py-3">Dispatched At</th>
                        <th className="px-5 py-3">Failure Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recipients.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50/80 transition text-xs">
                          <td className="px-5 py-3 font-semibold text-slate-900">{rec.email}</td>
                          <td className="px-4 py-3">{getRecipientStatusBadge(rec.status)}</td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                            {rec.providerMessageId ? (
                              <span className="truncate max-w-[120px] inline-block">
                                {rec.providerMessageId}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {rec.acceptedAt
                              ? new Date(rec.acceptedAt).toLocaleTimeString()
                              : rec.deliveredAt
                              ? new Date(rec.deliveredAt).toLocaleTimeString()
                              : 'Pending'}
                          </td>
                          <td className="px-5 py-3 text-rose-600 font-medium">
                            {rec.lastErrorMessage ? (
                              <span className="line-clamp-1" title={rec.lastErrorMessage}>
                                {rec.lastErrorMessage}
                              </span>
                            ) : rec.lastErrorCode ? (
                              <span>{rec.lastErrorCode}</span>
                            ) : (
                              <span className="text-slate-400">—</span>
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
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <div>
                    Page <strong className="text-slate-900">{recipientPage}</strong> of{' '}
                    <strong className="text-slate-900">{recipientPages}</strong> ({recipientTotal} total records)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRecipientPage((p) => Math.max(1, p - 1))}
                      disabled={recipientPage <= 1}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition flex items-center gap-1 font-medium text-slate-700"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Prev
                    </button>
                    <button
                      onClick={() => setRecipientPage((p) => Math.min(recipientPages, p + 1))}
                      disabled={recipientPage >= recipientPages}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition flex items-center gap-1 font-medium text-slate-700"
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
          <div className="saas-card p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  Locked Delivery Snapshot
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  The compiled HTML and text contents are frozen at launch to ensure auditability and prevent template drift.
                </p>
              </div>

              {campaign.snapshot?.takenAt && (
                <span className="text-xs text-slate-500">
                  Snapshot taken: {new Date(campaign.snapshot.takenAt).toLocaleString()}
                </span>
              )}
            </div>

            <div className="flex justify-center bg-slate-100 p-6 rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-white text-slate-900 rounded-xl p-6 max-w-[600px] w-full shadow-lg border border-slate-200 max-h-[700px] overflow-y-auto">
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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <CampaignDetailContent />
    </Suspense>
  );
}

