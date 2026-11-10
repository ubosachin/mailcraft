'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { DashboardHeader } from '@/components/DashboardHeader';
import {
  ShieldCheck,
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  Loader2,
  Info,
  Copy,
  ExternalLink,
} from 'lucide-react';

interface DnsCheckResult {
  domain: string;
  spf: {
    configured: boolean;
    record?: string;
    status: 'verified' | 'action_required' | 'not_configured';
    guidance: string;
  };
  dkim: {
    configured: boolean;
    status: 'verified' | 'pending' | 'action_required' | 'not_configured';
    guidance: string;
  };
  dmarc: {
    configured: boolean;
    record?: string;
    policy?: 'none' | 'quarantine' | 'reject';
    status: 'verified' | 'action_required' | 'not_configured';
    guidance: string;
  };
}

function EmailAuthenticationContent() {
  const [domainInput, setDomainInput] = useState<string>('');
  const [checking, setChecking] = useState<boolean>(false);
  const [dnsResult, setDnsResult] = useState<DnsCheckResult | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    async function loadDefaults() {
      try {
        const res = await fetch('/api/v1/settings/email-authentication');
        const data = await res.json();
        if (data.success && data.data?.defaultDomain) {
          setDomainInput(data.data.defaultDomain);
        }
      } catch {
        //
      }
    }
    loadDefaults();
  }, []);

  const handleCheckDns = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!domainInput.trim()) return;

    try {
      setChecking(true);
      setDnsResult(null);

      const res = await fetch('/api/v1/settings/email-authentication/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainInput.trim() }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setDnsResult(data.data);
      }
    } catch {
      //
    } finally {
      setChecking(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            Verified in Live DNS
          </span>
        );
      case 'action_required':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Action Required
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <XCircle className="w-3.5 h-3.5 text-slate-400" />
            Not Configured
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Header */}
      <DashboardHeader
        activeNav="email-auth"
        showComplianceNav
        showLogout
        rightActions={
          <Link
            href="/connect"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline whitespace-nowrap"
          >
            <span className="hidden sm:inline">Manage Providers &rarr;</span>
            <span className="sm:hidden">Providers &rarr;</span>
          </Link>
        }
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Deliverability Security
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            Domain Authentication &amp; DNS Health
          </h1>
          <p className="text-slate-600 mt-1.5 text-sm leading-relaxed">
            Major mailbox providers (Google, Yahoo, Microsoft) require authenticated SPF, DKIM, and DMARC records. Run authoritative live DNS queries and configure your domain for optimal inbox placement.
          </p>
        </div>

        {/* Live DNS Checker Card */}
        <div className="saas-card p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-600" />
              Authoritative Live DNS Inspection
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Queries global nameservers in real time without caching or simulated results.
            </p>
          </div>

          <form onSubmit={handleCheckDns} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="e.g. yourcompany.com"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono transition"
              required
            />
            <button
              type="submit"
              disabled={checking || !domainInput.trim()}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm transition flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/20"
            >
              {checking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Inspecting DNS...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Perform DNS Check
                </>
              )}
            </button>
          </form>

          {/* Results Display */}
          {dnsResult && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="text-xs text-slate-600 pt-2">
                Authoritative DNS report for <span className="font-mono text-slate-900 font-bold">{dnsResult.domain}</span>:
              </div>

              {/* SPF Result */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                    <span>SPF Record</span>
                    <span className="text-[10px] text-slate-500 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">TXT @</span>
                  </div>
                  {getStatusBadge(dnsResult.spf.status)}
                </div>
                {dnsResult.spf.record ? (
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-xs text-emerald-700">
                    <span className="truncate mr-2">{dnsResult.spf.record}</span>
                    <button
                      onClick={() => copyToClipboard(dnsResult.spf.record!)}
                      className="text-slate-400 hover:text-slate-800 transition"
                      title="Copy SPF Record"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-600">{dnsResult.spf.guidance}</p>
                )}
              </div>

              {/* DMARC Result */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                    <span>DMARC Record</span>
                    <span className="text-[10px] text-slate-500 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">TXT _dmarc</span>
                  </div>
                  {getStatusBadge(dnsResult.dmarc.status)}
                </div>
                {dnsResult.dmarc.record ? (
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-xs text-emerald-700">
                    <span className="truncate mr-2">{dnsResult.dmarc.record}</span>
                    <button
                      onClick={() => copyToClipboard(dnsResult.dmarc.record!)}
                      className="text-slate-400 hover:text-slate-800 transition"
                      title="Copy DMARC Record"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-600">{dnsResult.dmarc.guidance}</p>
                )}
              </div>

              {/* DKIM Guidance */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-1 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm text-slate-900">DKIM Public Key Signatures</div>
                  <span className="text-slate-500 font-medium">Selector Specific</span>
                </div>
                <p className="text-slate-600 pt-1">
                  DKIM keys are unique to each provider (e.g. Brevo or Amazon SES). View your exact CNAME selectors in{' '}
                  <Link href="/connect" className="text-indigo-600 font-semibold hover:underline">
                    Sender Accounts
                  </Link>
                  .
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Educational Reference Cards */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">The Three Pillars of Email Deliverability</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="saas-card p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">
                SPF
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Sender Policy Framework</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                SPF publishes a list of authorized IP addresses and servers allowed to send mail on your domain&apos;s behalf. Mailbox providers reject mail purporting to be from you from unauthorized IPs.
              </p>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 truncate">
                v=spf1 include:amazonses.com ~all
              </div>
            </div>

            <div className="saas-card p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-700 font-bold text-xs">
                DKIM
              </div>
              <h3 className="font-bold text-slate-900 text-sm">DomainKeys Identified Mail</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                DKIM signs every outgoing email with an asymmetric private key. The receiving mail server uses the public key stored in your DNS to prove the email was unaltered in transit.
              </p>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 truncate">
                mail._domainkey.domain.com CNAME ...
              </div>
            </div>

            <div className="saas-card p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-xs">
                DMARC
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Domain Message Authentication</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                DMARC enforces policies (none, quarantine, reject) when messages fail SPF or DKIM alignment, and sends automated forensic delivery reports back to your email administrator.
              </p>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 truncate">
                v=DMARC1; p=quarantine; rua=...
              </div>
            </div>
          </div>
        </div>
      </main>

      {copiedText && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-lg flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          DNS record copied to clipboard
        </div>
      )}
    </div>
  );
}

export default function EmailAuthenticationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <EmailAuthenticationContent />
    </Suspense>
  );
}

