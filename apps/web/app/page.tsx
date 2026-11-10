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
  Eye,
  Lock,
} from 'lucide-react';
import { MailCraftLogo } from '@/components/MailCraftLogo';

const INITIAL_TEMPLATES = [
  { name: 'Minimal Premium', category: 'Premium Brands', color: 'from-amber-600 to-amber-900', badge: 'High Conversion' },
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
    <div className="flex flex-col min-h-screen">
      {/* Top Banner */}
      <div className="bg-slate-900 text-slate-300 px-4 py-2 text-xs md:text-sm text-center font-medium flex items-center justify-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>MailCraft – Create. Customize. Send. Sign up with your Gmail ID to launch promotional campaigns.</span>
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="group">
            <MailCraftLogo size="md" variant="light" badge="Studio" />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link href="/templates" prefetch={false} className="hover:text-indigo-600 transition">12+ Templates</Link>
            <Link href="/pricing" className="hover:text-indigo-600 transition">Pricing & Quotas</Link>
            <a href="#how-it-works" className="hover:text-indigo-600 transition">How it Works</a>
            <a href="#sending" className="hover:text-indigo-600 transition">Sending Channels</a>
            <Link href="/privacy" className="hover:text-indigo-600 transition">Privacy & Trust</Link>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  href="/campaigns"
                  className="text-sm font-semibold text-slate-700 hover:text-indigo-600 px-3 py-2 transition"
                >
                  Campaigns
                </Link>
                <Link
                  href="/workspace"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
                >
                  Open Workspace
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-semibold text-slate-700 hover:text-indigo-600 px-3 py-2 transition"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
                >
                  Sign up
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-white via-indigo-50/30 to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Heading & Value Prop */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Persistent Cloud Workspace · Instant Campaign Dispatch</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                Your brand deserves <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600">
                  better emails.
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-2xl">
                MailCraft is the modern promotional email marketing platform. Design professional, mobile-ready emails, customize your brand identity, connect your sending account, and launch to your permission-based audience in minutes.
              </p>

              <div className="flex flex-wrap items-center gap-6 pt-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Sign up with Gmail &amp; password</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Gmail OAuth + Brevo + SES</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>100% CAN-SPAM compliant</span>
                </div>
              </div>
            </div>

            {/* Right Column: Instant Campaign Creation Card */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl shadow-xl shadow-indigo-100/60 border border-slate-200/80 p-6 sm:p-8 relative">
                <div className="flex items-center justify-between pb-5 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">MailCraft Studio</span>
                    <h2 className="text-xl font-bold text-slate-900">Start your workspace</h2>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Free Account
                  </span>
                </div>

                <form onSubmit={handleStartCampaign} className="mt-6 space-y-4">
                  {errorMsg && (
                    <div className="p-3 text-xs rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                      {errorMsg}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Brand Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Aurora Apparel"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Your Gmail ID / Email
                    </label>
                    <input
                      type="email"
                      placeholder="you@gmail.com"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Create an account to save drafts, brands, and analytics across devices.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-75 text-white font-semibold rounded-lg shadow-md shadow-indigo-200 transition flex items-center justify-center gap-2 group text-sm"
                  >
                    {loading ? (
                      <span>Redirecting to Setup...</span>
                    ) : (
                      <>
                        <span>Get Started Free</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Encrypted AES-256 vault</span>
                  </div>
                  <span>Multi-device sync</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Templates Gallery Section */}
      <section id="templates" className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Email Studio Themes</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2">
              12 Production-Ready Templates
            </h2>
            <p className="text-base text-slate-600 mt-3">
              Crafted with responsive layouts, email client bulletproofing, and structured JSON schemas ready for instant brand customization.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {INITIAL_TEMPLATES.map((tpl, i) => (
              <div
                key={i}
                className="group relative rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition flex flex-col"
              >
                <div className={`h-36 bg-gradient-to-br ${tpl.color} p-4 flex flex-col justify-between text-white relative`}>
                  <span className="self-end px-2 py-0.5 text-[10px] font-bold rounded-full bg-white/20 backdrop-blur-sm border border-white/20">
                    {tpl.badge}
                  </span>
                  <div>
                    <p className="text-xs font-medium text-white/80">{tpl.category}</p>
                    <h3 className="font-bold text-base leading-tight mt-0.5">{tpl.name}</h3>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 flex items-center justify-between border-t border-slate-100 text-xs">
                  <span className="text-slate-500 font-medium">Responsive HTML</span>
                  <Link
                    href="/workspace"
                    className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <span>Use Template</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sending Architecture Section */}
      <section id="sending" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Architectural Separation</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2">
              Two Dedicated Sending Channels
            </h2>
            <p className="text-base text-slate-600 mt-3">
              MailCraft enforces clear separation between personal low-volume outreach and high-throughput bulk campaigns to protect deliverability and reputation.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Channel 1: Gmail OAuth */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-5">
                <Send className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Low-Volume Outreach</span>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">Google OAuth (Gmail API)</h3>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                Send directly from your verified Google Workspace or personal Gmail. Perfect for test campaigns, VIP announcements, and small subscriber batches without configuring DNS.
              </p>
              <ul className="mt-5 space-y-2 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Secure OAuth 2.0 PKCE (No App Passwords)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>AES-256-GCM encrypted refresh tokens</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Strict daily quota throttling (&lt; 500/day)</span>
                </li>
              </ul>
            </div>

            {/* Channel 2: Bulk Delivery */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5">
                <Zap className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Bulk Campaigns</span>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">Brevo & Amazon SES</h3>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                Connect your dedicated transactional and promotional email provider. Deliver thousands of emails backed by dedicated BullMQ queue workers, rate limit pacing, and automated bounce handling.
              </p>
              <ul className="mt-5 space-y-2 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>DKIM, SPF, and DMARC header verification</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Asynchronous BullMQ worker processing</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>One-click List-Unsubscribe automatic headers</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works / 4 Steps */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Effortless Workflow</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2">
              From Concept to Inbox in 4 Steps
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="relative p-6 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm mb-4">
                1
              </div>
              <h4 className="font-bold text-slate-900 text-lg">Brand Identity</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Set brand colors, logo, sender address, and CAN-SPAM physical footer. Real-time preview updates immediately.
              </p>
            </div>

            <div className="relative p-6 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm mb-4">
                2
              </div>
              <h4 className="font-bold text-slate-900 text-lg">Connect Sender</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Authorize Gmail or enter your Brevo API key. All keys are encrypted at rest with AES-256-GCM.
              </p>
            </div>

            <div className="relative p-6 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm mb-4">
                3
              </div>
              <h4 className="font-bold text-slate-900 text-lg">Pick & Edit Theme</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Choose from 12+ pre-made templates. Customize hero banners, product grids, discount coupons, and CTA buttons.
              </p>
            </div>

            <div className="relative p-6 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm mb-4">
                4
              </div>
              <h4 className="font-bold text-slate-900 text-lg">Validate & Send</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Upload contacts via CSV/paste. System deduplicates, verifies opt-in, sends a test email, then queues the campaign.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance & Anti-Spam FAQ */}
      <section id="faq" className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Trust & Safety</span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-2">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-900 text-base">How do accounts and workspaces work?</h4>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Sign up with your Gmail ID and password or click Continue with Google. Passwords are salted and hashed with scrypt, and authentication sessions are secured via 256-bit HttpOnly cookies. All your brands, templates, contacts, and campaign analytics stay permanently synchronized across your devices.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-900 text-base">How does MailCraft prevent spam campaigns?</h4>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                We enforce mandatory sender email ownership verification via OTP before any campaign can be dispatched. Furthermore, every message includes mandatory sender identification, CAN-SPAM physical address headers, one-click List-Unsubscribe headers, and a global suppression filter. Scraped lists are strictly prohibited.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-900 text-base">Are my provider credentials safe?</h4>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Yes. Gmail OAuth tokens and Brevo API keys are encrypted using AES-256-GCM with unique initialization vectors and authentication tags. Plaintext credentials are never exposed to the browser or stored unencrypted.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <MailCraftLogo size="xs" variant="footer" />
            <span className="text-slate-500">· Promotional email marketing platform</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <Link href="/workspace" prefetch={false} className="hover:text-slate-200 transition">Workspace</Link>
            <Link href="/templates" prefetch={false} className="hover:text-slate-200 transition">Templates</Link>
            <Link href="/pricing" className="hover:text-slate-200 transition">Pricing & Quotas</Link>
            <Link href="/privacy" className="hover:text-slate-200 transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-200 transition">Terms & Anti-Spam</Link>
            <Link href="/contact" className="hover:text-slate-200 transition">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

