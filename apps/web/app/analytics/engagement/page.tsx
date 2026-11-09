'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  MousePointer,
  Bot,
  UserCheck,
  TrendingUp,
  Clock,
  ExternalLink,
  RefreshCw,
  Loader2,
  Info,
  ShieldAlert,
} from 'lucide-react';

interface EngagementData {
  metrics: {
    totalOpens: number;
    uniqueOpens: number;
    totalClicks: number;
    uniqueClickers: number;
    humanClicks: number;
    botClicks: number;
    openRate: number | null;
    clickThroughRate: number | null;
    clickToOpenRate: number | null;
  };
  linkRankings: Array<{
    url: string;
    clicks: number;
    uniqueClickers: number;
    botClicks: number;
  }>;
  hourlyDistribution: Array<{
    hour: string;
    clicks: number;
  }>;
  botAnalysis: {
    totalBotClicks: number;
    botPercentage: number;
    explanation: string;
  };
}

function EngagementContent() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EngagementData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/v1/analytics/engagement');
      if (!res.ok) throw new Error('Failed to load engagement report');
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        throw new Error(json.error?.message || 'Error processing engagement data');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching engagement data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatRate = (rate: number | null): string => {
    if (rate === null || rate === undefined) return 'N/A';
    return `${rate.toFixed(1)}%`;
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/analytics"
              className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Analytics Dashboard
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Engagement
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Audience Engagement & Link Intelligence</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time link click activity, unique clickers, security bot filtering, and peak engagement times.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="p-2 text-slate-500 hover:text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
          <p className="text-sm text-slate-500">Compiling engagement metrics...</p>
        </div>
      ) : error || !data ? (
        <div className="p-8 text-center text-red-600 bg-red-50 border border-red-200 rounded-xl">
          <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-red-500" />
          {error || 'Failed to load engagement report.'}
        </div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Unique Clickers</span>
              <div className="text-2xl font-bold text-indigo-600 mt-2">
                {data.metrics.uniqueClickers}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                CTR: {formatRate(data.metrics.clickThroughRate)}
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Verified Human Clicks</span>
              <div className="text-2xl font-bold text-emerald-600 mt-2 flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-emerald-500" />
                {data.metrics.humanClicks}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Total clicks: {data.metrics.totalClicks}
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Security Bot Clicks</span>
              <div className="text-2xl font-bold text-amber-600 mt-2 flex items-center gap-2">
                <Bot className="w-6 h-6 text-amber-500" />
                {data.metrics.botClicks}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {data.botAnalysis.botPercentage}% of recorded link touches
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Click-to-Open (CTOR)</span>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {formatRate(data.metrics.clickToOpenRate)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Unique clicks / Unique opens
              </p>
            </div>
          </div>

          {/* Bot Analysis Explanation Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900">
            <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Bot Detection Heuristics:</strong> MailCraft inspects incoming user agents and click speed to identify enterprise anti-virus scanners (e.g. Barracuda, Proofpoint, Microsoft Defender SafeLinks). These automated touches are flagged to ensure true human engagement metrics remain uninflated.
            </div>
          </div>

          {/* Link Performance Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">Link Performance Leaderboard</h2>
              </div>
              <span className="text-xs text-slate-500">{data.linkRankings.length} tracked URLs</span>
            </div>

            {data.linkRankings.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No link click events recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-6">Rank</th>
                      <th className="py-3 px-6">Destination URL</th>
                      <th className="py-3 px-6 text-center">Total Clicks</th>
                      <th className="py-3 px-6 text-center">Unique Clickers</th>
                      <th className="py-3 px-6 text-center">Bot Touches</th>
                      <th className="py-3 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.linkRankings.map((link, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-6 font-bold text-slate-400 text-xs">
                          #{idx + 1}
                        </td>
                        <td className="py-3.5 px-6 font-mono text-xs text-slate-800 max-w-md truncate" title={link.url}>
                          {link.url}
                        </td>
                        <td className="py-3.5 px-6 text-center font-bold text-slate-900">
                          {link.clicks}
                        </td>
                        <td className="py-3.5 px-6 text-center font-semibold text-indigo-600">
                          {link.uniqueClickers}
                        </td>
                        <td className="py-3.5 px-6 text-center text-amber-600 text-xs">
                          {link.botClicks}
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

          {/* Hourly Click Distribution */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Hourly Click Engagement (UTC)
            </h2>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 text-center text-xs">
              {data.hourlyDistribution.map((h, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded border flex flex-col items-center justify-center ${
                    h.clicks > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold' : 'bg-slate-50 border-slate-100 text-slate-400'
                  }`}
                >
                  <span className="text-[10px]">{h.hour.split(':')[0]}h</span>
                  <span className="mt-1">{h.clicks}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function EngagementPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <EngagementContent />
    </Suspense>
  );
}

