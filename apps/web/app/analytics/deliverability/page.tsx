'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Globe,
  Loader2,
  Server,
  Info,
} from 'lucide-react';

interface DeliverabilityData {
  metrics: {
    totalAttempted: number;
    providerAccepted: number;
    confirmedDeliveries: number;
    hardBounces: number;
    softBounces: number;
    totalBounces: number;
    complaints: number;
    deliveryRate: number | null;
    bounceRate: number | null;
    hardBounceRate: number | null;
    softBounceRate: number | null;
    complaintRate: number | null;
  };
  health: {
    reputationStatus: 'excellent' | 'good' | 'warning' | 'critical';
    warnings: string[];
  };
  bounces: {
    softReasons: Array<{ reason: string; count: number }>;
    hardReasons: Array<{ reason: string; count: number }>;
  };
  domains: Array<{
    domain: string;
    attempted: number;
    delivered: number;
    bounces: number;
    complaints: number;
  }>;
}

function DeliverabilityContent() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DeliverabilityData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/v1/analytics/deliverability');
      if (!res.ok) throw new Error('Failed to load deliverability report');
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        throw new Error(json.error?.message || 'Error parsing deliverability data');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching deliverability report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatRate = (rate: number | null, decimals = 1): string => {
    if (rate === null || rate === undefined) return 'N/A';
    return `${rate.toFixed(decimals)}%`;
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
            <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Deliverability
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Deliverability & Sender Reputation</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor mailbox placement health, spam complaint thresholds, bounce classifications, and domain reputation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/settings/email-authentication"
            className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            <Globe className="w-4 h-4 text-indigo-600" />
            Check SPF / DMARC DNS
          </Link>
          <button
            onClick={fetchData}
            className="p-2 text-slate-500 hover:text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-sm text-slate-500">Calculating deliverability diagnostics...</p>
        </div>
      ) : error || !data ? (
        <div className="p-8 text-center text-red-600 bg-red-50 border border-red-200 rounded-xl">
          <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-red-500" />
          {error || 'Failed to load deliverability diagnostics.'}
        </div>
      ) : (
        <>
          {/* Reputation Health Banner */}
          <div
            className={`p-5 rounded-xl border flex items-start gap-4 ${
              data.health.reputationStatus === 'critical'
                ? 'bg-red-50 border-red-200'
                : data.health.reputationStatus === 'warning'
                ? 'bg-amber-50 border-amber-200'
                : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            {data.health.reputationStatus === 'critical' ? (
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            ) : data.health.reputationStatus === 'warning' ? (
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            )}

            <div className="space-y-1">
              <h2
                className={`text-base font-bold ${
                  data.health.reputationStatus === 'critical'
                    ? 'text-red-900'
                    : data.health.reputationStatus === 'warning'
                    ? 'text-amber-900'
                    : 'text-emerald-900'
                }`}
              >
                Sender Health Status: {data.health.reputationStatus.toUpperCase()}
              </h2>
              {data.health.warnings.length === 0 ? (
                <p className="text-xs text-emerald-800">
                  All deliverability health metrics are within industry standard thresholds. Complaint rate is below 0.05% and bounce rate is below 2.0%.
                </p>
              ) : (
                <ul className="text-xs list-disc list-inside space-y-1 pt-1 text-slate-700">
                  {data.health.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Confirmed Delivery Rate</span>
              <div className="text-2xl font-bold text-emerald-600 mt-2">
                {formatRate(data.metrics.deliveryRate)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {data.metrics.confirmedDeliveries} confirmed / {data.metrics.totalAttempted} attempted
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Hard Bounce Rate</span>
              <div className="text-2xl font-bold text-red-600 mt-2">
                {formatRate(data.metrics.hardBounceRate)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {data.metrics.hardBounces} hard bounces (permanent)
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Soft Bounce Rate</span>
              <div className="text-2xl font-bold text-amber-600 mt-2">
                {formatRate(data.metrics.softBounceRate)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {data.metrics.softBounces} soft bounces (transient)
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Spam Complaint Rate</span>
              <div
                className={`text-2xl font-bold mt-2 ${
                  data.metrics.complaintRate && data.metrics.complaintRate > 0.1 ? 'text-red-600' : 'text-slate-900'
                }`}
              >
                {formatRate(data.metrics.complaintRate, 3)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Target: &lt; 0.10% (Google / Yahoo requirement)
              </p>
            </div>
          </div>

          {/* Bounce Categorization Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hard Bounces */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  Hard Bounces (Auto-Suppressed)
                </h3>
                <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded font-semibold border border-red-200">
                  {data.metrics.hardBounces} Total
                </span>
              </div>
              {data.bounces.hardReasons.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">No hard bounces encountered.</p>
              ) : (
                <div className="space-y-2">
                  {data.bounces.hardReasons.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-50 last:border-0">
                      <span className="text-slate-700 font-mono truncate max-w-xs">{item.reason}</span>
                      <span className="font-bold text-red-600">{item.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Soft Bounces */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Soft Bounces (Transient Issues)
                </h3>
                <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-semibold border border-amber-200">
                  {data.metrics.softBounces} Total
                </span>
              </div>
              {data.bounces.softReasons.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">No soft bounces encountered.</p>
              ) : (
                <div className="space-y-2">
                  {data.bounces.softReasons.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-50 last:border-0">
                      <span className="text-slate-700 font-mono truncate max-w-xs">{item.reason}</span>
                      <span className="font-bold text-amber-600">{item.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Domain Breakdown Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Destination Domain Performance</h2>
            </div>
            {data.domains.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No destination domain activity recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-6">Domain / ISP</th>
                      <th className="py-3 px-6 text-center">Attempted</th>
                      <th className="py-3 px-6 text-center">Delivered</th>
                      <th className="py-3 px-6 text-center">Bounces</th>
                      <th className="py-3 px-6 text-center">Complaints</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.domains.map((dom, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-6 font-mono text-xs text-slate-800 font-medium">
                          @{dom.domain}
                        </td>
                        <td className="py-3.5 px-6 text-center text-slate-700">{dom.attempted}</td>
                        <td className="py-3.5 px-6 text-center text-emerald-600 font-semibold">{dom.delivered}</td>
                        <td className="py-3.5 px-6 text-center text-red-600">{dom.bounces}</td>
                        <td className="py-3.5 px-6 text-center text-red-700 font-bold">{dom.complaints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function DeliverabilityPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <DeliverabilityContent />
    </Suspense>
  );
}
