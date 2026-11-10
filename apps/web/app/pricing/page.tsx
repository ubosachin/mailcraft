import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Zap, Send, ShieldCheck, Key, ArrowRight } from 'lucide-react';
import { PublicNavbar } from '@/components/PublicNavbar';
import { PublicFooter } from '@/components/PublicFooter';

const FEATURE_ROWS = [
  { feature: 'Visual Drag-and-Drop Email Studio', studio: 'Included', channels: 'All Channels' },
  { feature: '12+ Mobile-Responsive Themes', studio: 'Included', channels: 'All Channels' },
  { feature: 'AES-256-GCM Credential Vault', studio: 'Included', channels: 'All Channels' },
  { feature: 'OTP & Domain SPF/DKIM Verification', studio: 'Included', channels: 'All Channels' },
  { feature: 'CSV / Excel Deduplication & Suppression', studio: 'Included', channels: 'All Channels' },
  { feature: 'Real-Time Click, Bounce & Unsubscribe Analytics', studio: 'Included', channels: 'All Channels' },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicNavbar activePage="pricing" />

      {/* Header */}
      <section className="pt-14 pb-12 bg-saas-grid border-b border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-indigo-200 text-indigo-700 text-xs font-semibold shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            Transparent Economics &bull; Zero Platform Markup
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-tight mt-4">
            Free Studio. Connect Any Sending Channel.
          </h1>
          <p className="text-base text-slate-600 mt-4 leading-relaxed max-w-2xl mx-auto">
            MailCraft charges $0 platform fees for designing, managing audiences, and analytics. You
            plug in your own Gmail, Brevo, or Amazon SES account directly with full reputation ownership.
          </p>
        </div>
      </section>

      {/* Main Cards */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 flex-1 w-full space-y-16">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
          {/* Card 1: Starter Studio */}
          <div className="bg-gradient-to-br from-indigo-50/90 via-white to-white rounded-2xl border-2 border-indigo-500 p-7 shadow-xl shadow-indigo-500/10 relative flex flex-col justify-between">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-bold uppercase tracking-wider mb-4">
                Included For Everyone
              </span>
              <h3 className="text-2xl font-extrabold text-slate-950">MailCraft Studio</h3>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-4xl font-black text-slate-950 tabular-nums">$0</span>
                <span className="text-xs text-slate-500 font-medium">/ forever</span>
              </div>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                Complete campaign studio, contact hygiene, visual builder, and tracking analytics.
              </p>

              <ul className="mt-6 space-y-3 text-xs text-slate-700">
                {[
                  'All 12+ responsive studio templates',
                  'Visual drag-and-drop block editor',
                  'Unlimited saved brand profiles',
                  'Deduplication & global suppression list',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/signup"
              className="mt-8 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl text-center transition inline-flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <span>Start Free Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: Gmail App Password (1,500/day) */}
          <div className="saas-card p-7 flex flex-col justify-between border-emerald-200/90 ring-1 ring-emerald-500/10">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <Key className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase">
                  Popular
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                App Password SMTP
              </span>
              <h3 className="text-xl font-bold text-slate-950 mt-1">Gmail App Password</h3>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-950 tabular-nums">1,500</span>
                <span className="text-xs text-slate-500">emails / day</span>
              </div>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                Send straight from Gmail or Google Workspace via encrypted TLS SMTP with strict daily enforcement.
              </p>

              <ul className="mt-6 space-y-3 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Hard 1,500 emails/day protection</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Zero DNS records required</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Encrypted AES-256-GCM credential vault</span>
                </li>
              </ul>
            </div>

            <Link
              href="/connect"
              prefetch={false}
              className="mt-8 w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold text-xs rounded-xl text-center transition"
            >
              Connect App Password &rarr;
            </Link>
          </div>

          {/* Card 3: Google OAuth */}
          <div className="saas-card p-7 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 mb-4">
                <Send className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                Personal Outreach
              </span>
              <h3 className="text-xl font-bold text-slate-950 mt-1">Google OAuth (Gmail)</h3>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-950 tabular-nums">500</span>
                <span className="text-xs text-slate-500">emails / day</span>
              </div>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                One-click OAuth 2.0 PKCE connection for personal previews and small subscriber updates.
              </p>

              <ul className="mt-6 space-y-3 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Up to 500/day personal, 2,000 Workspace</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>OAuth 2.0 PKCE (S256) verified flow</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Direct Gmail inbox origin</span>
                </li>
              </ul>
            </div>

            <Link
              href="/connect"
              prefetch={false}
              className="mt-8 w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold text-xs rounded-xl text-center transition"
            >
              Authorize Gmail OAuth &rarr;
            </Link>
          </div>

          {/* Card 4: Brevo & SES */}
          <div className="saas-card p-7 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                Enterprise Scale
              </span>
              <h3 className="text-xl font-bold text-slate-950 mt-1">Brevo &amp; Amazon SES</h3>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-950 tabular-nums">100K+</span>
                <span className="text-xs text-slate-500">emails / day</span>
              </div>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                High-throughput promotional broadcasts with full SPF, DKIM, DMARC, and webhook bounce telemetry.
              </p>

              <ul className="mt-6 space-y-3 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Brevo free tier (300/day) or paid plans</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>AWS SES pay-as-you-go (~$0.10 / 1,000)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Easy-DKIM CNAME &amp; delivery webhooks</span>
                </li>
              </ul>
            </div>

            <Link
              href="/connect"
              prefetch={false}
              className="mt-8 w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold text-xs rounded-xl text-center transition"
            >
              Connect Bulk Provider &rarr;
            </Link>
          </div>
        </div>

        {/* Comparison Matrix */}
        <div className="saas-card overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Included Across Every Workspace</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Zero feature gating — every user gets full compliance, security, and analytics tools.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Capability</th>
                  <th className="px-6 py-3.5">Starter Studio ($0)</th>
                  <th className="px-6 py-3.5">Delivery Support</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {FEATURE_ROWS.map((row) => (
                  <tr key={row.feature} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3.5 font-medium text-slate-800">{row.feature}</td>
                    <td className="px-6 py-3.5 font-semibold text-emerald-700">{row.studio}</td>
                    <td className="px-6 py-3.5 text-slate-600">{row.channels}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
