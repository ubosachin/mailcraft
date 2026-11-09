'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  Download,
  RefreshCw,
  ExternalLink,
  Users,
  MousePointer,
  MailCheck,
  ShieldAlert,
  Loader2,
  TrendingUp,
  Info,
} from 'lucide-react';

interface CampaignAnalyticsData {
  campaignId: string;
  campaignName: string;
  subject: string;
  provider: string;
  senderName: string;
  senderEmail: string;
  sentDate?: string;
  status: string;
  targetRecipients: number;
  totalAttempted: number;
  providerAccepted: number;
  confirmedDeliveries: number;
  hardBounces: number;
  softBounces: number;
  totalBounces: number;
  complaints: number;
  totalClicks: number;
  uniqueClickers: number;
  uniqueOpens: number;
  totalOpens: number;
  unsubscribes: number;
  failedSends: number;
  acceptanceRate: number | null;
  deliveryRate: number | null;
  bounceRate: number | null;
  complaintRate: number | null;
  clickThroughRate: number | null;
  unsubscribeRate: number | null;
  links: Array<{ url: string; clickCount: number; uniqueClickers: number }>;
  timeline: Array<{ timestamp: string; deliveries: number; bounces: number; clicks: number; opens: number }>;
}

function AnalyticsContent() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CampaignAnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/analytics/campaigns/${campaignId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Campaign not found.');
          return;
        }
        throw new Error('Failed to load campaign analytics');
      }
      const json = await res.json();
      if (json.success && json.data?.analytics) {
        setData(json.data.analytics);
      } else {
        throw new Error(json.error?.message || 'Failed to parse analytics data');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred loading analytics');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatRate = (rate: number | null): string => {
    if (rate === null || rate === undefined) return 'N/A';
    return `${rate.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-sm font-medium text-slate-600">Calculating campaign metrics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-red-900 mb-1">Unable to Load Analytics</h2>
          <p className="text-sm text-red-700 mb-6">{error || 'Campaign details unavailable.'}</p>
          <div className="flex justify-center gap-3">
            <Link
              href="/campaigns"
              className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back to Campaigns
            </Link>
            <button
              onClick={fetchAnalytics}
              className="px-4 py-2 bg-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href={`/campaigns/${campaignId}`}
              className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Campaign
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Analytics Detail
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{data.campaignName}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Subject: <span className="text-slate-700 font-medium">{data.subject}</span> &bull; Provider: {data.provider}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/campaigns/${campaignId}/recipients`}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Users className="w-4 h-4 text-slate-500" />
            Recipients Log
          </Link>
          <a
            href={`/api/v1/analytics/export?type=events&campaignId=${campaignId}`}
            download
            className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            Export Events CSV
          </a>
          <button
            onClick={fetchAnalytics}
            className="p-2 text-slate-500 hover:text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            title="Refresh analytics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attempted & Accepted */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Attempted & Accepted</span>
            <MailCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{data.totalAttempted}</span>
            <span className="text-xs text-slate-500">attempted</span>
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Provider Accepted:</span>
            <span className="font-semibold text-slate-700">{data.providerAccepted}</span>
          </div>
          <div className="text-xs text-slate-500 flex items-center justify-between pt-1">
            <span>Acceptance Rate:</span>
            <span className="font-semibold text-slate-700">{formatRate(data.acceptanceRate)}</span>
          </div>
        </div>

        {/* Confirmed Delivery */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Confirmed Delivered</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{data.confirmedDeliveries}</span>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              {formatRate(data.deliveryRate)}
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500 border-t border-slate-100 pt-2">
            {data.confirmedDeliveries === 0 && data.providerAccepted > 0 ? (
              <span className="text-amber-600 flex items-center gap-1">
                <Info className="w-3 h-3" /> Awaiting mailbox webhook
              </span>
            ) : (
              <span>Downstream delivery verified</span>
            )}
          </div>
        </div>

        {/* Clicks & Engagement */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Click Engagement</span>
            <MousePointer className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-600">{data.uniqueClickers}</span>
            <span className="text-xs text-slate-500">unique clickers</span>
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Total Clicks:</span>
            <span className="font-semibold text-slate-700">{data.totalClicks}</span>
          </div>
          <div className="text-xs text-slate-500 flex items-center justify-between pt-1">
            <span>Click-Through Rate (CTR):</span>
            <span className="font-semibold text-slate-700">{formatRate(data.clickThroughRate)}</span>
          </div>
        </div>

        {/* Bounces & Complaints */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Bounces & Complaints</span>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-red-600">{data.totalBounces}</span>
            <span className="text-xs text-slate-500">({formatRate(data.bounceRate)} bounce)</span>
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Hard: {data.hardBounces} &bull; Soft: {data.softBounces}</span>
            <span className="font-semibold text-slate-700">{data.complaints} complaints</span>
          </div>
          <div className="text-xs text-slate-500 flex items-center justify-between pt-1">
            <span>Spam Complaint Rate:</span>
            <span className={`font-semibold ${data.complaintRate && data.complaintRate > 0.1 ? 'text-red-600' : 'text-slate-700'}`}>
              {formatRate(data.complaintRate)}
            </span>
          </div>
        </div>
      </div>

      {/* Disclaimers & Notes Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p>
            <strong className="text-slate-700">Analytics Transparency Notice:</strong> Provider acceptance records that the upstream server accepted the transmission. Confirmed delivery requires verified webhook confirmation from the recipient domain.
          </p>
          <p>
            Open tracking ({data.totalOpens} events, {data.uniqueOpens} unique) is indicative; modern privacy protections (Apple MPP, proxy scanners) may pre-fetch images.
          </p>
        </div>
      </div>

      {/* Link Click Performance Leaderboard */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Link Performance Breakdown</h2>
          </div>
          <span className="text-xs text-slate-500">{data.links.length} destination links tracked</span>
        </div>

        {data.links.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No tracked click activity has been registered for this campaign yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6">Destination URL</th>
                  <th className="py-3 px-6 text-center">Total Clicks</th>
                  <th className="py-3 px-6 text-center">Unique Clickers</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.links.map((link, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-6 font-mono text-xs text-slate-800 max-w-md truncate" title={link.url}>
                      {link.url}
                    </td>
                    <td className="py-3.5 px-6 text-center font-bold text-slate-900">
                      {link.clickCount}
                    </td>
                    <td className="py-3.5 px-6 text-center font-semibold text-indigo-600">
                      {link.uniqueClickers}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-indigo-600"
                      >
                        Visit <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hourly Timeline of Activity */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          Event Activity Timeline
        </h2>
        {data.timeline.length === 0 ? (
          <p className="text-sm text-slate-500">No time-series data recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {data.timeline.map((point, i) => (
              <div key={i} className="flex items-center text-xs justify-between py-2 border-b border-slate-100 last:border-0">
                <span className="font-mono text-slate-600 w-36">{point.timestamp}</span>
                <div className="flex items-center gap-6 text-slate-700">
                  <span>Deliveries: <strong className="text-emerald-600">{point.deliveries}</strong></span>
                  <span>Clicks: <strong className="text-indigo-600">{point.clicks}</strong></span>
                  <span>Bounces: <strong className="text-red-600">{point.bounces}</strong></span>
                  <span>Opens: <strong className="text-slate-800">{point.opens}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CampaignAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <AnalyticsContent />
    </Suspense>
  );
}

