'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { MailCraftLogo } from '@/components/MailCraftLogo';
import {
  ShieldCheck,
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Server,
  ArrowLeft,
  Loader2,
  Info,
  Copy,
  ExternalLink,
  Layers,
  Users,
  Send,
  SlidersHorizontal,
  ShieldAlert,
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            Verified in Live DNS
          </span>
        );
      case 'action_required':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Action Required
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <XCircle className="w-3.5 h-3.5 text-slate-500" />
            Not Configured
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="group">
              <MailCraftLogo size="md" variant="dark" />
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link href="/templates" className="text-slate-400 hover:text-white transition flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                Templates
              </Link>
              <Link href="/connect" className="text-slate-400 hover:text-white transition flex items-center gap-1.5">
                <Server className="w-4 h-4" />
                Sender Accounts
              </Link>
              <Link href="/campaigns" className="text-slate-400 hover:text-white transition flex items-center gap-1.5">
                <Send className="w-4 h-4" />
                Campaigns
              </Link>
              <Link href="/analytics" className="text-slate-400 hover:text-white transition flex items-center gap-1.5">
                Analytics
              </Link>
              <Link href="/settings/email-authentication" className="text-indigo-400 border-b-2 border-indigo-500 pb-0.5 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Domain Authentication
              </Link>
            </nav>
          </div>

          <Link
            href="/connect"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:underline"
          >
            Manage Provider Accounts &rarr;
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Domain Authentication &amp; SPF/DKIM/DMARC Center
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Major mailbox providers (Google, Yahoo, Microsoft) require authenticated sender records. Perform authoritative live DNS queries and configure your domain for maximum inbox deliverability.
          </p>
        </div>

        {/* Live DNS Checker Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-400" />
              Authoritative Live DNS Inspection
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Queries global nameservers in real time without caching or simulated results.
            </p>
          </div>

          <form onSubmit={handleCheckDns} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="e.g. yourcompany.com"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              required
            />
            <button
              type="submit"
              disabled={checking || !domainInput.trim()}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
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
            <div className="space-y-4 pt-2">
              <div className="text-xs text-slate-400">
                Authoritative DNS report for <span className="font-mono text-white font-bold">{dnsResult.domain}</span>:
              </div>

              {/* SPF Result */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm text-white flex items-center gap-2">
                    <span>SPF Record</span>
                    <span className="text-[10px] text-slate-500 font-mono">TXT @</span>
                  </div>
                  {getStatusBadge(dnsResult.spf.status)}
                </div>
                {dnsResult.spf.record ? (
                  <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-xs text-emerald-300">
                    <span className="truncate mr-2">{dnsResult.spf.record}</span>
                    <button
                      onClick={() => copyToClipboard(dnsResult.spf.record!)}
                      className="text-slate-400 hover:text-white"
                      title="Copy SPF Record"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">{dnsResult.spf.guidance}</p>
                )}
              </div>

              {/* DMARC Result */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm text-white flex items-center gap-2">
                    <span>DMARC Record</span>
                    <span className="text-[10px] text-slate-500 font-mono">TXT _dmarc</span>
                  </div>
                  {getStatusBadge(dnsResult.dmarc.status)}
                </div>
                {dnsResult.dmarc.record ? (
                  <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-xs text-emerald-300">
                    <span className="truncate mr-2">{dnsResult.dmarc.record}</span>
                    <button
                      onClick={() => copyToClipboard(dnsResult.dmarc.record!)}
                      className="text-slate-400 hover:text-white"
                      title="Copy DMARC Record"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">{dnsResult.dmarc.guidance}</p>
                )}
              </div>

              {/* DKIM Guidance */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm text-white">DKIM Public Key Signatures</div>
                  <span className="text-slate-500">Selector Specific</span>
                </div>
                <p className="text-slate-400 pt-1">
                  DKIM keys are unique to each provider (e.g. Brevo or Amazon SES). View your exact CNAME selectors in <Link href="/connect" className="text-indigo-400 underline">Sender Accounts</Link>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Educational Reference Cards */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">The Three Pillars of Email Deliverability</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400 font-bold text-sm">
                SPF
              </div>
              <h3 className="font-bold text-white text-sm">Sender Policy Framework</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                SPF publishes a list of authorized IP addresses and servers allowed to send mail on your domain&apos;s behalf. Mailbox providers reject mail purporting to be from you from unauthorized IPs.
              </p>
              <div className="p-2 rounded bg-slate-950 font-mono text-[11px] text-slate-300 truncate">
                v=spf1 include:amazonses.com ~all
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-violet-950 border border-violet-800 flex items-center justify-center text-violet-400 font-bold text-sm">
                DKIM
              </div>
              <h3 className="font-bold text-white text-sm">DomainKeys Identified Mail</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                DKIM signs every outgoing email with an asymmetric private key. The receiving mail server uses the public key stored in your DNS to prove the email was unaltered in transit.
              </p>
              <div className="p-2 rounded bg-slate-950 font-mono text-[11px] text-slate-300 truncate">
                mail._domainkey.domain.com CNAME ...
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 font-bold text-sm">
                DMARC
              </div>
              <h3 className="font-bold text-white text-sm">Domain Message Authentication</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                DMARC enforces policies (none, quarantine, reject) when messages fail SPF or DKIM alignment, and sends automated forensic delivery reports back to your email administrator.
              </p>
              <div className="p-2 rounded bg-slate-950 font-mono text-[11px] text-slate-300 truncate">
                v=DMARC1; p=quarantine; rua=...
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function EmailAuthenticationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      }
    >
      <EmailAuthenticationContent />
    </Suspense>
  );
}

