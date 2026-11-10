'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { extractApiErrorMessage } from '@/lib/oauth-helpers';
import {
  BarChart3,
  TrendingUp,
  MailCheck,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  MousePointer,
  Users,
  Download,
  RefreshCw,
  Filter,
  Calendar,
  ShieldCheck,
  Globe,
  Loader2,
  Info,
  ExternalLink,
} from 'lucide-react';

interface AnalyticsOverview {
  totalCampaigns: number;
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
}

interface TimelinePoint {
  timestamp: string;
  deliveries: number;
  bounces: number;
  clicks: number;
  opens: number;
}

interface ProviderBreakdown {
  provider: string;
  attempted: number;
  delivered: number;
  bounces: number;
  complaints: number;
  clicks: number;
}

function AnalyticsDashboardContent() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [providers, setProviders] = useState<ProviderBreakdown[]>([]);
  const [providerFilter, setProviderFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = new URL('/api/v1/analytics/overview', window.location.origin);
      if (providerFilter && providerFilter !== 'all') {
        url.searchParams.set('provider', providerFilter);
      }

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to load analytics overview');
      const json = await res.json();
      if (json.success && json.data) {
        setOverview(json.data.overview);
        setTimeline(json.data.timeline || []);
        setProviders(json.data.providers || []);
      } else {
        throw new Error(extractApiErrorMessage(json, 'Error processing analytics data'));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [providerFilter]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatRate = (rate: number | null): string => {
    if (rate === null || rate === undefined) return 'N/A';
    return `${rate.toFixed(1)}%`;
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campaign Analytics & Intelligence</h1>
          <p className="text-sm text-slate-500 mt-1">
            End-to-end delivery metrics, link engagement, bounce diagnostics, and compliance reporting.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/analytics/deliverability"
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Deliverability
          </Link>
          <Link
            href="/analytics/engagement"
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <MousePointer className="w-4 h-4 text-indigo-600" />
            Engagement
          </Link>
          <a
            href="/api/v1/analytics/export?type=campaigns"
            download
            className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            Export CSV
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

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold uppercase text-slate-600 tracking-wider">Filter by Provider:</span>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Providers</option>
            <option value="gmail">Google Gmail</option>
            <option value="brevo">Brevo API</option>
            <option value="ses">Amazon SES</option>
          </select>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500">
          <Link href="/settings/email-authentication" className="text-indigo-600 hover:underline flex items-center gap-1 font-medium">
            <Globe className="w-3.5 h-3.5" /> DNS & Auth Setup
          </Link>
          <span className="text-slate-300">|</span>
          <Link href="/suppression" className="text-indigo-600 hover:underline flex items-center gap-1 font-medium">
            <ShieldAlert className="w-3.5 h-3.5" /> Suppression Center
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
          <p className="text-sm text-slate-500">Aggregating workspace analytics...</p>
        </div>
      ) : error || !overview ? (
        <div className="p-8 text-center text-red-600 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-500" />
          {error || 'Failed to aggregate analytics.'}
        </div>
      ) : (
        <>
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Attempted */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Attempted</span>
                <MailCheck className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{overview.totalAttempted}</span>
                <span className="text-xs text-slate-500">across {overview.totalCampaigns} campaigns</span>
              </div>
              <div className="mt-3 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
                <span>Provider Accepted:</span>
                <span className="font-semibold text-slate-700">{overview.providerAccepted}</span>
              </div>
              <div className="text-xs text-slate-500 flex items-center justify-between pt-1">
                <span>Acceptance Rate:</span>
                <span className="font-semibold text-slate-700">{formatRate(overview.acceptanceRate)}</span>
              </div>
            </div>

            {/* Confirmed Delivery */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Confirmed Delivered</span>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-600">{overview.confirmedDeliveries}</span>
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {formatRate(overview.deliveryRate)}
                </span>
              </div>
              <div className="mt-3 text-xs text-slate-500 border-t border-slate-100 pt-2">
                <span>Delivery confirms downstream mailbox receipt.</span>
              </div>
            </div>

            {/* Click Engagement */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Click Engagement</span>
                <MousePointer className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-indigo-600">{overview.uniqueClickers}</span>
                <span className="text-xs text-slate-500">unique clickers</span>
              </div>
              <div className="mt-3 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
                <span>Total Clicks:</span>
                <span className="font-semibold text-slate-700">{overview.totalClicks}</span>
              </div>
              <div className="text-xs text-slate-500 flex items-center justify-between pt-1">
                <span>Click-Through Rate (CTR):</span>
                <span className="font-semibold text-slate-700">{formatRate(overview.clickThroughRate)}</span>
              </div>
            </div>

            {/* Bounces & Spam Complaints */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Bounces & Complaints</span>
                <ShieldAlert className="w-4 h-4 text-red-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-red-600">{overview.totalBounces}</span>
                <span className="text-xs text-slate-500">({formatRate(overview.bounceRate)} bounce)</span>
              </div>
              <div className="mt-3 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
                <span>Hard: {overview.hardBounces} &bull; Soft: {overview.softBounces}</span>
                <span className="font-semibold text-slate-700">{overview.complaints} complaints</span>
              </div>
              <div className="text-xs text-slate-500 flex items-center justify-between pt-1">
                <span>Spam Complaint Rate:</span>
                <span className={`font-semibold ${overview.complaintRate && overview.complaintRate > 0.1 ? 'text-red-600' : 'text-slate-700'}`}>
                  {formatRate(overview.complaintRate)}
                </span>
              </div>
            </div>
          </div>

          {/* Privacy Disclaimer */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-600">
            <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Open Tracking Note:</strong> Recorded {overview.totalOpens} opens ({overview.uniqueOpens} unique). Pixel open metrics are estimated indicators due to Apple Mail Privacy Protection (MPP) and email client image proxies.
            </div>
          </div>

          {/* Provider Performance Comparison */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Provider Performance Comparison</h2>
            </div>
            {providers.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No provider activity recorded in this period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-6">Email Provider</th>
                      <th className="py-3 px-6 text-center">Attempted</th>
                      <th className="py-3 px-6 text-center">Delivered</th>
                      <th className="py-3 px-6 text-center">Bounces</th>
                      <th className="py-3 px-6 text-center">Complaints</th>
                      <th className="py-3 px-6 text-center">Clicks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {providers.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-6 font-semibold uppercase text-xs text-slate-800">
                          {p.provider}
                        </td>
                        <td className="py-3.5 px-6 text-center text-slate-700 font-medium">{p.attempted}</td>
                        <td className="py-3.5 px-6 text-center text-emerald-600 font-semibold">{p.delivered}</td>
                        <td className="py-3.5 px-6 text-center text-red-600 font-medium">{p.bounces}</td>
                        <td className="py-3.5 px-6 text-center text-red-700 font-semibold">{p.complaints}</td>
                        <td className="py-3.5 px-6 text-center text-indigo-600 font-semibold">{p.clicks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Daily Event Distribution
            </h2>
            {timeline.length === 0 ? (
              <p className="text-sm text-slate-500">No time-series data available yet.</p>
            ) : (
              <div className="space-y-3">
                {timeline.map((point, idx) => (
                  <div key={idx} className="flex items-center text-xs justify-between py-2 border-b border-slate-100 last:border-0">
                    <span className="font-mono text-slate-600 w-32">{point.timestamp}</span>
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
        </>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <AnalyticsDashboardContent />
    </Suspense>
  );
}

