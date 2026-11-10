'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Zap,
  ShieldCheck,
  Send,
  Sparkles,
  ArrowRight,
  Layers,
  CheckCircle2,
  Users,
  Lock,
  Key,
  BarChart3,
  Globe,
  Mail,
} from 'lucide-react';
import { PublicNavbar } from '@/components/PublicNavbar';
import { PublicFooter } from '@/components/PublicFooter';

const INITIAL_TEMPLATES = [
  { name: 'Minimal Premium', category: 'Premium Brands', color: 'from-slate-800 to-slate-950', badge: 'High Conversion' },
  { name: 'Colorful Sale', category: 'Discounts', color: 'from-rose-500 to-orange-500', badge: 'Promotional' },
  { name: 'Luxury Brand', category: 'Fashion', color: 'from-zinc-800 to-stone-900', badge: 'Elegant' },
  { name: 'Tech Launch', category: 'Technology', color: 'from-blue-600 to-indigo-900', badge: 'SaaS' },
  { name: 'Festive Special', category: 'Festivals', color: 'from-red-600 to-amber-600', badge: 'Seasonal' },
  { name: 'Food & Restaurant', category: 'Culinary', color: 'from-emerald-600 to-teal-800', badge: 'Food' },
  { name: 'Startup Modern', category: 'Startups', color: 'from-violet-600 to-purple-900', badge: 'Trending' },
  { name: 'Fashion Store', category: 'Ecommerce', color: 'from-pink-500 to-rose-700', badge: 'Apparel' },
  { name: 'Corporate Business', category: 'B2B', color: 'from-slate-700 to-slate-900', badge: 'Executive' },
  { name: 'Flash Sale Urgent', category: 'Offers', color: 'from-amber-500 to-red-600', badge: 'Countdown' },
  { name: 'Welcome Offer', category: 'Onboarding', color: 'from-cyan-600 to-blue-700', badge: 'Subscriber' },
  { name: 'Product Launch', category: 'New Arrivals', color: 'from-teal-600 to-emerald-900', badge: 'Announcement' },
];

const CHANNELS = [
  {
    icon: Send,
    tint: 'bg-rose-50 text-rose-600 border-rose-200/70',
    badge: 'OAuth 2.0 PKCE',
    title: 'Google OAuth (Gmail)',
    quota: 'Up to 500 / day',
    desc: 'Send directly from your verified Gmail address with zero DNS configuration for VIP outreach and fast tests.',
    bullets: ['Strict OAuth 2.0 PKCE (S256)', 'AES-256-GCM encrypted refresh tokens', 'Zero App Passwords required'],
  },
  {
    icon: Key,
    tint: 'bg-emerald-50 text-emerald-600 border-emerald-200/70',
    badge: 'SMTP SSL • Strict Cap',
    title: 'Gmail + App Password',
    quota: '1,500 / day enforced',
    desc: 'Connect personal Gmail or Google Workspace using a 16-character App Password with automatic 1,500/day protection.',
    bullets: ['Atomic 1,500 emails/day counter', 'Pre-flight & per-send quota gate', 'Automated UTC midnight reset'],
  },
  {
    icon: Zap,
    tint: 'bg-indigo-50 text-indigo-600 border-indigo-200/70',
    badge: 'Bulk Delivery',
    title: 'Brevo & Amazon SES',
    quota: '50,000+ / day',
    desc: 'Connect enterprise REST APIs and AWS SigV4 credentials for massive promotional drops backed by automated webhooks.',
    bullets: ['SPF, DKIM & DMARC verification', 'Webhook bounce & complaint sync', 'One-click List-Unsubscribe headers'],
  },
];

export default function HomePage() {
  const router = useRouter();
  const [brandName, setBrandName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    fetch('/api/v1/auth/me', { cache: 'no-store', credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data?.authenticated) {
          setIsAuthenticated(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleStartCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const meRes = await fetch('/api/v1/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.data?.authenticated) {
          router.push('/workspace');
          return;
        }
      }

      const params = new URLSearchParams();
      if (brandName.trim()) params.set('brandName', brandName.trim());
      if (senderEmail.trim()) params.set('email', senderEmail.trim());
      router.push(`/signup${params.toString() ? `?${params.toString()}` : ''}`);
    } catch {
      router.push('/signup');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Announcement Bar */}
      <div className="bg-indigo-50/90 text-indigo-900 px-4 py-2 text-xs text-center font-medium flex items-center justify-center gap-2 border-b border-indigo-200/70">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider">
          New
        </span>
        <span className="truncate">
          Gmail + Google App Password SMTP now live with strict 1,500 mails/day enforcement.
        </span>
        <Link
          href="/pricing"
          className="hidden sm:inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-800 font-semibold shrink-0"
        >
          Explore Channels <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Curved Floating Public Navbar */}
      <PublicNavbar activePage="home" isAuthenticated={isAuthenticated} />

      {/* Architectural Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-16 lg:pb-24 bg-saas-grid">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[420px] bg-gradient-to-tr from-indigo-500/15 via-violet-500/10 to-sky-400/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Copy & Metrics */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-indigo-200/80 shadow-xs text-indigo-700 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Promotional Email SaaS &bull; Own Your Sender Infrastructure</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold text-slate-950 tracking-tight leading-[1.08]">
                Email campaigns engineered for{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500">
                  primary inbox delivery.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                Design responsive promotional emails in minutes, enforce list hygiene automatically,
                and dispatch through your own Gmail OAuth, Google App Password, Brevo, or Amazon SES
                credentials protected by AES-256-GCM encryption.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href={isAuthenticated ? '/workspace' : '/signup'}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition"
                >
                  <span>{isAuthenticated ? 'Open Studio Workspace' : 'Start Free Workspace'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/templates"
                  prefetch={false}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-sm font-semibold shadow-xs transition"
                >
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Browse 12+ Templates</span>
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200/80 max-w-lg">
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-slate-950 tabular-nums">
                    4 Channels
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Gmail, App Pass, Brevo, SES</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-slate-950 tabular-nums">
                    AES-256
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">GCM credential encryption</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-slate-950 tabular-nums">
                    100%
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Opt-in &amp; CAN-SPAM ready</div>
                </div>
              </div>
            </div>

            {/* Right Interactive Launch Card */}
            <div className="lg:col-span-5">
              <div className="saas-card p-6 sm:p-8 relative bg-white/95 backdrop-blur-md">
                <div className="flex items-center justify-between pb-5 border-b border-slate-100">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                      Instant Onboarding
                    </span>
                    <h2 className="text-xl font-bold text-slate-950 mt-0.5">Launch your workspace</h2>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    $0 Studio
                  </span>
                </div>

                <form onSubmit={handleStartCampaign} className="mt-5 space-y-4">
                  {errorMsg && (
                    <div className="p-3 text-xs rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
                      {errorMsg}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Brand or Company Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Aurora Apparel"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Work or Gmail Address
                    </label>
                    <input
                      type="email"
                      placeholder="you@gmail.com"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-75 text-white font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 group text-sm"
                  >
                    {loading ? (
                      <span>Preparing Studio...</span>
                    ) : (
                      <>
                        <span>{isAuthenticated ? 'Continue to Workspace' : 'Create Free Workspace'}</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Zero credit card required</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">PKCE + AES-256</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Product Capabilities (Luminous Light Showcase) */}
      <section className="py-20 bg-white border-y border-slate-200 relative overflow-hidden">
        <div className="bg-saas-grid absolute inset-0 pointer-events-none opacity-65" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-xs font-bold uppercase tracking-wider text-indigo-700">
              Unified Platform Suite
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 mt-3 tracking-tight">
              Everything required to design, govern, and ship campaigns at scale.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Layers,
                title: 'Visual Email Studio',
                desc: 'Drag-and-drop hero banners, product grids, coupons, buttons, and brand tokens compiled to bulletproof email HTML.',
                tag: '19 Block Types',
              },
              {
                icon: Users,
                title: 'Audience & Segments',
                desc: 'CSV/Excel import with automatic deduplication, disposable email blocking, tags, and dynamic filter segments.',
                tag: 'List Hygiene',
              },
              {
                icon: ShieldCheck,
                title: 'Deliverability Firewall',
                desc: 'Pre-flight SPF, DKIM, and DMARC checks paired with mandatory CAN-SPAM footers and instant global suppression.',
                tag: 'Inbox Trust',
              },
              {
                icon: BarChart3,
                title: 'Delivery Intelligence',
                desc: 'Live provider acceptance telemetry, click-tracking redirects, bounce classification, and CSV compliance exports.',
                tag: 'Real-Time',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="saas-card p-6 bg-white/95 backdrop-blur-sm flex flex-col justify-between gap-5"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {item.tag}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sending Channels Section */}
      <section id="sending" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Architectural Separation
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 mt-2 tracking-tight">
              Choose the right sending engine for every volume
            </h2>
            <p className="text-base text-slate-600 mt-3">
              Keep personal outreach clean and scale promotional drops with direct provider keys.
              Zero markup on sending volume.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {CHANNELS.map((ch) => {
              const Icon = ch.icon;
              return (
                <div key={ch.title} className="saas-card p-7 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div
                        className={`w-11 h-11 rounded-xl border flex items-center justify-center ${ch.tint}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                        {ch.quota}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                      {ch.badge}
                    </span>
                    <h3 className="text-xl font-bold text-slate-950 mt-1">{ch.title}</h3>
                    <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">{ch.desc}</p>
                    <ul className="mt-5 space-y-2.5 text-xs text-slate-700">
                      {ch.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100">
                    <Link
                      href={isAuthenticated ? '/connect' : '/signup'}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      <span>Configure channel</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Templates Gallery Section */}
      <section id="templates" className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Email Studio Themes
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 mt-2 tracking-tight">
                12 Production-Ready Templates
              </h2>
              <p className="text-base text-slate-600 mt-2">
                Mobile-responsive table layouts tested across Gmail, Apple Mail, and Outlook.
              </p>
            </div>
            <Link
              href="/templates"
              prefetch={false}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shrink-0 transition shadow-sm shadow-indigo-600/20"
            >
              <span>Explore Full Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {INITIAL_TEMPLATES.map((tpl, i) => (
              <div
                key={i}
                className="group rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs hover:shadow-md hover:border-indigo-200 transition flex flex-col"
              >
                <div
                  className={`h-36 bg-gradient-to-br ${tpl.color} p-4 flex flex-col justify-between text-white relative`}
                >
                  <span className="self-end px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-white/15 backdrop-blur-sm border border-white/20">
                    {tpl.badge}
                  </span>
                  <div>
                    <p className="text-[11px] font-medium text-white/80">{tpl.category}</p>
                    <h3 className="font-bold text-base leading-tight mt-0.5">{tpl.name}</h3>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50/70 flex items-center justify-between border-t border-slate-100 text-xs">
                  <span className="text-slate-500 font-medium inline-flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> Responsive
                  </span>
                  <Link
                    href="/workspace"
                    prefetch={false}
                    className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <span>Customize</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works / 4 Steps */}
      <section id="how-it-works" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Streamlined Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 mt-2 tracking-tight">
              From Concept to Inbox in 4 Steps
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Brand Identity',
                desc: 'Set brand colors, logo, sender address, and CAN-SPAM physical footer with live preview.',
              },
              {
                step: '02',
                title: 'Connect Channel',
                desc: 'Connect Gmail OAuth, Gmail App Password (1,500/day), Brevo API, or Amazon SES.',
              },
              {
                step: '03',
                title: 'Design Campaign',
                desc: 'Pick a studio template and customize headlines, product grids, coupons, and buttons.',
              },
              {
                step: '04',
                title: 'Validate & Dispatch',
                desc: 'Clean recipient lists, verify SPF/DKIM, send a preview test, and track live delivery.',
              },
            ].map((item) => (
              <div key={item.step} className="saas-card p-6 relative">
                <div className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono text-xs font-bold mb-4">
                  {item.step}
                </div>
                <h4 className="font-bold text-slate-950 text-base">{item.title}</h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance & FAQ */}
      <section id="faq" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Trust &amp; Governance
            </span>
            <h2 className="text-3xl font-extrabold text-slate-950 mt-2 tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            <div className="saas-card p-6">
              <h4 className="font-bold text-slate-950 text-base flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-600" />
                How does Gmail App Password vs Gmail OAuth work?
              </h4>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                You can authorize Gmail via Google OAuth 2.0 PKCE for quick low-volume sends (~500/day)
                or connect your Gmail + 16-character Google App Password over TLS SMTP with a strictly
                enforced 1,500 emails/day limit.
              </p>
            </div>

            <div className="saas-card p-6">
              <h4 className="font-bold text-slate-950 text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                How does MailCraft enforce anti-spam compliance?
              </h4>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Every campaign runs through pre-flight validation checking sender ownership,
                permission-based opt-in status, physical footer address, one-click List-Unsubscribe
                headers, and global suppression exclusions.
              </p>
            </div>

            <div className="saas-card p-6">
              <h4 className="font-bold text-slate-950 text-base flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-600" />
                How are API keys and App Passwords protected?
              </h4>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                All OAuth refresh tokens, Google App Passwords, Brevo keys, and AWS secrets are
                encrypted at rest using AES-256-GCM with unique IVs and authentication tags, and never
                exposed to client browsers.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
