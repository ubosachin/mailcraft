'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Mail,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Send,
  Zap,
  Users,
  Palette,
  Globe,
  Sliders,
  Check,
  Copy,
  ExternalLink,
} from 'lucide-react';

interface BrandState {
  id?: string;
  brandName: string;
  senderName: string;
  senderEmail: string;
  website: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  footerAddress: string;
}

interface SessionState {
  id: string;
  status: string;
  verifiedEmail?: string | null;
  createdAt: string;
  expiresAt: string;
}

export default function WorkspacePage() {
  const [activeTab, setActiveTab] = useState<'brand' | 'sending' | 'recipients' | 'templates' | 'campaigns'>('brand');
  const [session, setSession] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingBrand, setSavingBrand] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Brand form state
  const [brand, setBrand] = useState<BrandState>({
    brandName: 'Aurora Studio',
    senderName: 'Sarah Connor',
    senderEmail: 'sarah@aurora.io',
    website: 'https://aurora.io',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=160&auto=format&fit=crop&q=80',
    primaryColor: '#4F46E5',
    secondaryColor: '#10B981',
    footerAddress: '100 Innovation Way, Suite 400, San Francisco, CA 94107',
  });

  // OTP Verification state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [otpDevCode, setOtpDevCode] = useState<string | null>(null);
  const [otpSentMessage, setOtpSentMessage] = useState<string | null>(null);

  // Initialize or fetch guest session on mount
  useEffect(() => {
    async function initWorkspace() {
      try {
        const res = await fetch('/api/v1/guest/me');
        if (res.ok) {
          const data = await res.json();
          if (data.data?.session) {
            setSession(data.data.session);
            if (data.data.brand) {
              setBrand({
                id: data.data.brand.id,
                brandName: data.data.brand.brandName || '',
                senderName: data.data.brand.senderName || '',
                senderEmail: data.data.brand.senderEmail || '',
                website: data.data.brand.website || '',
                logoUrl: data.data.brand.logoUrl || '',
                primaryColor: data.data.brand.primaryColor || '#4F46E5',
                secondaryColor: data.data.brand.secondaryColor || '#10B981',
                footerAddress: data.data.brand.footerAddress || '',
              });
            }
            setLoading(false);
            return;
          }
        }

        // If no session exists, auto-initialize one
        const startRes = await fetch('/api/v1/guest/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brandName: 'Aurora Studio',
            senderEmail: 'sarah@aurora.io',
          }),
        });
        const startData = await startRes.json();
        if (startData.data?.session) {
          setSession(startData.data.session);
        }
      } catch (err) {
        console.error('Failed to load guest workspace:', err);
      } finally {
        setLoading(false);
      }
    }

    initWorkspace();
  }, []);

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBrand(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/v1/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brand),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save brand details');
      }

      setBrand((prev) => ({ ...prev, id: data.data.id }));
      setStatusMessage({ type: 'success', text: 'Brand profile and design tokens saved successfully!' });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save brand',
      });
    } finally {
      setSavingBrand(false);
    }
  };

  const handleRequestOtp = async () => {
    setVerificationLoading(true);
    setOtpSentMessage(null);
    setOtpDevCode(null);
    try {
      const res = await fetch('/api/v1/guest/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: brand.senderEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setOtpSentMessage(`Verification OTP sent to ${brand.senderEmail}`);
      if (data.data?.devCode) {
        setOtpDevCode(data.data.devCode);
        setVerificationCode(data.data.devCode);
      }
      setShowVerifyModal(true);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Verification request failed',
      });
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleConfirmOtp = async () => {
    setVerificationLoading(true);
    try {
      const res = await fetch('/api/v1/guest/verify-email/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: brand.senderEmail,
          code: verificationCode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification confirmation failed');
      }

      setSession((prev) => (prev ? { ...prev, verifiedEmail: brand.senderEmail } : prev));
      setShowVerifyModal(false);
      setStatusMessage({
        type: 'success',
        text: `Sender email ${brand.senderEmail} is now verified!`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Invalid code',
      });
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleRefreshSession = async () => {
    try {
      const res = await fetch('/api/v1/guest/refresh', { method: 'POST' });
      const data = await res.json();
      if (res.ok && session) {
        setSession({ ...session, expiresAt: data.data.expiresAt });
        setStatusMessage({ type: 'success', text: 'Guest session extended by 7 days!' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to refresh session' });
    }
  };

  const handleEndSession = async () => {
    if (confirm('Are you sure you want to end this guest session? Your temporary session cookie will be cleared.')) {
      await fetch('/api/v1/guest/session', { method: 'DELETE' });
      window.location.href = '/';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-600">Connecting to guest workspace...</p>
        </div>
      </div>
    );
  }

  const isEmailVerified = session?.verifiedEmail && session.verifiedEmail.toLowerCase() === brand.senderEmail.toLowerCase();

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Workspace Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
                <Mail className="w-5 h-5" />
              </div>
              <span className="text-lg font-black tracking-tight text-slate-900">
                Mail<span className="text-indigo-600">Craft</span>
              </span>
            </Link>

            <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-200">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Guest Workspace
              </span>
              <span className="text-xs text-slate-400">ID: {session?.id.slice(-6)}</span>
            </div>
          </div>

          {/* Session Meta & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span>Expires: {session?.expiresAt ? new Date(session.expiresAt).toLocaleDateString() : '7 days'}</span>
              <button
                onClick={handleRefreshSession}
                title="Refresh 7-day TTL"
                className="hover:text-indigo-600 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={handleEndSession}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 hover:border-rose-200 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Wizard Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-8 overflow-x-auto text-sm font-medium">
            <button
              onClick={() => setActiveTab('brand')}
              className={`py-4 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === 'brand'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>1. Brand Setup</span>
            </button>

            <button
              onClick={() => setActiveTab('sending')}
              className={`py-4 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === 'sending'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>2. Sending Accounts</span>
            </button>

            <button
              onClick={() => setActiveTab('recipients')}
              className={`py-4 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === 'recipients'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>3. Recipients</span>
            </button>

            <button
              onClick={() => setActiveTab('templates')}
              className={`py-4 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === 'templates'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>4. Email Studio (12 Themes)</span>
            </button>

            <button
              onClick={() => setActiveTab('campaigns')}
              className={`py-4 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === 'campaigns'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>5. Campaigns & Analytics</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Workspace Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Status Notification Toast */}
        {statusMessage && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center justify-between text-sm ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-xs font-semibold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: BRAND SETUP */}
        {activeTab === 'brand' && (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Left 7 Cols: Brand Editor Form */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Brand & Sender Profile</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    These design tokens and sender addresses will automatically populate all outgoing email templates.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isEmailVerified ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Sender Verified
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      disabled={verificationLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition"
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>Verify Sender Email</span>
                    </button>
                  )}
                </div>
              </div>

              <form onSubmit={handleSaveBrand} className="mt-6 space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Brand Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={brand.brandName}
                      onChange={(e) => setBrand({ ...brand, brandName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Sender Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={brand.senderName}
                      onChange={(e) => setBrand({ ...brand, senderName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Sender Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={brand.senderEmail}
                      onChange={(e) => setBrand({ ...brand, senderEmail: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Website URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com"
                      value={brand.website}
                      onChange={(e) => setBrand({ ...brand, website: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Logo Image URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://yourbrand.com/logo.png"
                    value={brand.logoUrl}
                    onChange={(e) => setBrand({ ...brand, logoUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Color Tokens */}
                <div className="grid sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Primary Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={brand.primaryColor}
                        onChange={(e) => setBrand({ ...brand, primaryColor: e.target.value })}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                      />
                      <input
                        type="text"
                        value={brand.primaryColor}
                        onChange={(e) => setBrand({ ...brand, primaryColor: e.target.value })}
                        className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-mono text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Secondary Accent Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={brand.secondaryColor}
                        onChange={(e) => setBrand({ ...brand, secondaryColor: e.target.value })}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                      />
                      <input
                        type="text"
                        value={brand.secondaryColor}
                        onChange={(e) => setBrand({ ...brand, secondaryColor: e.target.value })}
                        className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-mono text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Physical Business Address (CAN-SPAM Requirement)
                  </label>
                  <textarea
                    rows={2}
                    value={brand.footerAddress}
                    onChange={(e) => setBrand({ ...brand, footerAddress: e.target.value })}
                    placeholder="123 Market St, Suite 400, San Francisco, CA"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Mandatory for commercial email compliance across US CAN-SPAM, GDPR, and Indian DPDP standards.
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={savingBrand}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-75 text-white font-semibold text-sm rounded-lg shadow-sm shadow-indigo-200 transition flex items-center gap-2"
                  >
                    {savingBrand ? 'Saving...' : 'Save Brand Settings'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('sending')}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <span>Next: Sending Accounts</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>

            {/* Right 5 Cols: Live Dynamic Brand Mockup Card */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Dynamic Preview</span>
                  <span className="text-[11px] font-medium text-slate-400">Desktop & Mobile Mockup</span>
                </div>

                {/* Simulated Email Card Render */}
                <div className="mt-6 rounded-xl border border-slate-200 overflow-hidden shadow-inner bg-slate-50">
                  {/* Fake Email Client Bar */}
                  <div className="bg-slate-200/80 px-4 py-2 border-b border-slate-300/80 flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                      </div>
                      <span className="font-semibold ml-2">Inbox Preview</span>
                    </div>
                    <span className="text-[10px] text-slate-500">To: customer@example.com</span>
                  </div>

                  {/* Email Body Preview */}
                  <div className="p-6 bg-white space-y-5">
                    {/* Brand Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                      {brand.logoUrl ? (
                        <img
                          src={brand.logoUrl}
                          alt={brand.brandName}
                          className="h-9 max-w-[120px] object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div
                          style={{ backgroundColor: brand.primaryColor }}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-black text-sm"
                        >
                          {brand.brandName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs font-bold text-slate-800">{brand.brandName}</span>
                    </div>

                    {/* Email Hero Content */}
                    <div
                      style={{
                        background: `linear-gradient(135deg, ${brand.primaryColor}15, ${brand.secondaryColor}20)`,
                        borderLeft: `4px solid ${brand.primaryColor}`,
                      }}
                      className="p-4 rounded-lg"
                    >
                      <span
                        style={{ color: brand.primaryColor }}
                        className="text-[11px] font-bold uppercase tracking-wider"
                      >
                        Special Launch Announcement
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1">
                        Discover what’s next from {brand.brandName}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                        We designed our latest collection to give your brand an unfair advantage. Enjoy exclusive early access.
                      </p>
                    </div>

                    {/* CTA Button */}
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        style={{ backgroundColor: brand.primaryColor }}
                        className="px-6 py-2.5 text-white text-xs font-bold rounded-lg shadow-sm hover:opacity-95 transition"
                      >
                        Explore Exclusive Collection →
                      </button>
                    </div>

                    {/* Footer Address */}
                    <div className="pt-6 border-t border-slate-100 text-[10px] text-slate-400 space-y-1 text-center">
                      <p>Sent by {brand.senderName} ({brand.senderEmail})</p>
                      <p>{brand.footerAddress || 'Physical address will be placed here'}</p>
                      <p className="text-indigo-600 underline cursor-pointer">Unsubscribe from these emails</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Primary Color:</span>
                    <span className="font-mono font-semibold" style={{ color: brand.primaryColor }}>{brand.primaryColor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Secondary Accent:</span>
                    <span className="font-mono font-semibold" style={{ color: brand.secondaryColor }}>{brand.secondaryColor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sender Status:</span>
                    <span className="font-semibold text-emerald-600">
                      {isEmailVerified ? 'Ownership Verified' : 'Pending Verification'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SENDING ACCOUNTS */}
        {activeTab === 'sending' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Phase 3 Ready</span>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">Connect Your Sending Accounts</h2>
              <p className="text-sm text-slate-600 mt-2">
                MailCraft never asks for raw passwords or app passwords. All credentials are encrypted using AES-256-GCM.
              </p>

              <div className="grid md:grid-cols-2 gap-6 mt-8">
                {/* Google OAuth Card */}
                <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold mb-4">
                      G
                    </div>
                    <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Low-Volume Channel</span>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">Connect Gmail</h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Authorize sending via Google OAuth 2.0 PKCE. Suitable for test emails and personal campaigns under 500 recipients per day.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => alert('Gmail OAuth PKCE flow initialized in Phase 3. Configured with AES-256-GCM token vault.')}
                    className="mt-6 w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded-lg text-xs shadow-sm transition flex items-center justify-center gap-2"
                  >
                    <span>Connect with Google</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Brevo / Bulk Provider Card */}
                <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mb-4">
                      <Zap className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Bulk Blast Channel</span>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">Connect Brevo or SES</h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Deliver high-throughput promotional campaigns to thousands of opt-in contacts backed by BullMQ workers and webhook bounce tracking.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => alert('Brevo / SES connection initialized in Phase 3. API key stored encrypted.')}
                    className="mt-6 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs shadow-sm transition flex items-center justify-center gap-2"
                  >
                    <span>Add Provider API Key</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RECIPIENTS */}
        {activeTab === 'recipients' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Audience & Consent</span>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">Recipient Management</h2>
              <p className="text-sm text-slate-600 mt-2">
                Import permission-based contacts. MailCraft automatically runs syntax validation, duplicate removal, and suppression checks.
              </p>

              <div className="mt-6 p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-900">
                  <p className="font-semibold">Anti-Spam Consent Gate</p>
                  <p className="mt-0.5 text-indigo-700">
                    Only recipients who have affirmatively consented to receive promotional updates from {brand.brandName} are eligible.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 mt-6">
                <div className="p-4 rounded-xl border border-slate-200 bg-white text-center">
                  <span className="text-xs text-slate-500 font-medium">Eligible Contacts</span>
                  <p className="text-2xl font-black text-slate-900 mt-1">0</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-white text-center">
                  <span className="text-xs text-slate-500 font-medium">Duplicates Filtered</span>
                  <p className="text-2xl font-black text-slate-900 mt-1">0</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-white text-center">
                  <span className="text-xs text-slate-500 font-medium">Suppression List</span>
                  <p className="text-2xl font-black text-slate-900 mt-1">0</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TEMPLATES */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-slate-900">12 Pre-Built Promotional Themes</h2>
              <p className="text-xs text-slate-600 mt-1">
                Each theme automatically adopts your brand’s primary color ({brand.primaryColor}) and logo.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
              {[
                'Minimal Premium',
                'Colorful Sale',
                'Luxury Brand',
                'Tech Launch',
                'Festive Special',
                'Food & Restaurant',
                'Startup Modern',
                'Fashion Store',
                'Corporate',
                'Flash Sale',
                'Welcome Offer',
                'Product Launch',
              ].map((name, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 p-4 bg-white shadow-sm hover:border-indigo-400 transition cursor-pointer flex flex-col justify-between"
                >
                  <div className="h-28 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500">
                    Template #{i + 1}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">JSON Schema</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: CAMPAIGNS & ANALYTICS */}
        {activeTab === 'campaigns' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Guest Analytics</span>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">Campaign Overview</h2>
              <p className="text-xs text-slate-600 mt-1">
                Track delivery, bounce, clicks, and unsubscribes associated with this guest session.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-xs text-slate-500 font-medium">Emails Sent</span>
                  <p className="text-xl font-bold text-slate-900 mt-1">0</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-xs text-slate-500 font-medium">Delivered</span>
                  <p className="text-xl font-bold text-emerald-600 mt-1">0%</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-xs text-slate-500 font-medium">Bounces</span>
                  <p className="text-xl font-bold text-amber-600 mt-1">0</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-xs text-slate-500 font-medium">Unsubscribes</span>
                  <p className="text-xl font-bold text-slate-600 mt-1">0</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Email Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Verify Sender Email</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Enter the 6-digit confirmation code sent to <span className="font-semibold text-slate-900">{brand.senderEmail}</span>.
              </p>

              {otpDevCode && (
                <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                  <p className="font-semibold">Development Code Detected:</p>
                  <p className="text-lg font-mono font-bold tracking-widest mt-0.5">{otpDevCode}</p>
                </div>
              )}
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="123456"
                  className="w-full text-center tracking-[0.5em] text-2xl font-bold py-3 px-4 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <button
                type="button"
                onClick={handleConfirmOtp}
                disabled={verificationLoading || verificationCode.length !== 6}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg shadow-sm transition"
              >
                {verificationLoading ? 'Verifying...' : 'Confirm Verification Code'}
              </button>

              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
