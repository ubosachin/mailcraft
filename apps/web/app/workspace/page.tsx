'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MailCraftLogo } from '@/components/MailCraftLogo';
import { extractApiErrorMessage, getOAuthErrorMessage } from '@/lib/oauth-helpers';
import {
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
  UploadCloud,
  FileSpreadsheet,
  Trash2,
  Play,
  Pause,
  XCircle,
  Eye,
  ExternalLink,
  Plus,
  Key,
} from 'lucide-react';
import { TEMPLATE_CATALOG } from '@mailcraft/email-renderer';

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

interface UserState {
  id: string;
  email: string;
  name?: string;
  role: string;
  emailVerified: boolean;
  avatarUrl?: string;
  authProvider: string;
}

interface ConnectionSummary {
  id: string;
  provider: 'gmail' | 'gmail_smtp' | 'brevo' | 'ses';
  senderEmail: string;
  status: string;
  dailyQuotaLimit?: number | null;
  dailySentCount?: number;
  dailyRemaining?: number | null;
  verifiedAt?: string;
  createdAt: string;
}

interface ContactSummary {
  id: string;
  email: string;
  name?: string;
  consentStatus: string;
  consentSource: string;
  createdAt: string;
}

interface CampaignSummary {
  id: string;
  campaignName: string;
  subject: string;
  status: string;
  recipientCount: number;
  stats: {
    accepted: number;
    delivered: number;
    bounced: number;
    clicked: number;
    unsubscribed: number;
    failed: number;
  };
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export default function WorkspacePage() {
  const [activeTab, setActiveTab] = useState<'brand' | 'sending' | 'recipients' | 'templates' | 'campaigns'>('brand');
  const [session, setSession] = useState<SessionState | null>(null);
  const [user, setUser] = useState<UserState | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Brand State
  const [brand, setBrand] = useState<BrandState>({
    brandName: '',
    senderName: '',
    senderEmail: '',
    website: '',
    logoUrl: '',
    primaryColor: '#4F46E5',
    secondaryColor: '#10B981',
    footerAddress: '',
  });
  const [savingBrand, setSavingBrand] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  // OTP Verification state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);

  // 2. Connections State
  const [connections, setConnections] = useState<ConnectionSummary[]>([]);
  const [showConnectModal, setShowConnectModal] = useState<'brevo' | 'gmail' | 'gmail_smtp' | null>(null);
  const [brevoApiKey, setBrevoApiKey] = useState('');
  const [gmailSmtpForm, setGmailSmtpForm] = useState({
    email: '',
    appPassword: '',
    senderName: '',
  });
  const [connectingProvider, setConnectingProvider] = useState(false);

  // 3. Recipients State
  const [contacts, setContacts] = useState<ContactSummary[]>([]);
  const [pasteInput, setPasteInput] = useState('');
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [validatingRecipients, setValidatingRecipients] = useState(false);
  const [validationReport, setValidationReport] = useState<{
    totalSubmitted: number;
    validSyntaxCount: number;
    invalidSyntaxCount: number;
    duplicatesRemovedCount: number;
    suppressedCount: number;
    eligibleCount: number;
    eligibleEmails: string[];
    invalidEmails: string[];
  } | null>(null);

  // 4. Campaigns State
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [selectedCampaignForAnalytics, setSelectedCampaignForAnalytics] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<Record<string, unknown> | null>(null);
  const [showSendModal, setShowSendModal] = useState<CampaignSummary | null>(null);
  const [sendingCampaign, setSendingCampaign] = useState(false);

  // Initial Load
  useEffect(() => {
    async function initWorkspace() {
      try {
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const tabParam = params.get('tab');
          const statusParam = params.get('status');
          const providerParam = params.get('provider');
          const authParam = params.get('auth');
          const errorParam = params.get('error');

          if (
            tabParam === 'brand' ||
            tabParam === 'sending' ||
            tabParam === 'recipients' ||
            tabParam === 'templates' ||
            tabParam === 'campaigns'
          ) {
            setActiveTab(tabParam);
          }

          if (statusParam === 'connected' && providerParam === 'gmail') {
            setActiveTab('sending');
            setStatusMessage({
              type: 'success',
              text: 'Google Gmail sending account connected and tokens encrypted with AES-256-GCM!',
            });
          } else if (authParam === 'success') {
            setStatusMessage({
              type: 'success',
              text: 'Signed in with Google successfully!',
            });
          } else if (errorParam) {
            setStatusMessage({
              type: 'error',
              text: getOAuthErrorMessage(errorParam),
            });
          }
        }

        const authRes = await fetch('/api/v1/auth/me', {
          cache: 'no-store',
          credentials: 'same-origin',
        });

        if (authRes.status === 401) {
          window.location.assign('/login?redirect=/workspace');
          return;
        }

        if (!authRes.ok) {
          setStatusMessage({
            type: 'error',
            text: 'Unable to reach server to verify session. Please refresh and try again.',
          });
          setLoading(false);
          return;
        }

        const authData = await authRes.json();
        if (!authData.data?.authenticated || !authData.data?.user || !authData.data?.session) {
          window.location.assign('/login?redirect=/workspace');
          return;
        }

        setUser(authData.data.user);
        setSession(authData.data.session);

        // Fetch full brand settings
        const brandRes = await fetch('/api/v1/brands/current');
        if (brandRes.ok) {
          const brandJson = await brandRes.json();
          if (brandJson.data) {
            setBrand({
              id: brandJson.data.id,
              brandName: brandJson.data.brandName || '',
              senderName: brandJson.data.senderName || '',
              senderEmail: brandJson.data.senderEmail || authData.data.user.email || '',
              website: brandJson.data.website || '',
              logoUrl: brandJson.data.logoUrl || '',
              primaryColor: brandJson.data.primaryColor || '#4F46E5',
              secondaryColor: brandJson.data.secondaryColor || '#10B981',
              footerAddress: brandJson.data.footerAddress || '',
            });
          }
        } else {
          // Initialize brand defaults from user profile
          setBrand((prev) => ({
            ...prev,
            brandName: authData.data.user.name ? `${authData.data.user.name}'s Brand` : 'My Brand',
            senderName: authData.data.user.name || 'Marketing Team',
            senderEmail: authData.data.user.email || '',
          }));
        }

        // Fetch connections, contacts, and campaigns
        await Promise.all([fetchConnections(), fetchContacts(), fetchCampaigns()]);
      } catch (err) {
        console.error('Failed to load workspace data:', err);
      } finally {
        setLoading(false);
      }
    }

    initWorkspace();
  }, []);

  const fetchConnections = async () => {
    try {
      const res = await fetch('/api/v1/connections');
      if (res.ok) {
        const data = await res.json();
        setConnections(data.data || []);
      }
    } catch {
      // Ignored
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/v1/contacts?limit=100');
      if (res.ok) {
        const data = await res.json();
        setContacts(data.data?.contacts || []);
      }
    } catch {
      // Ignored
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/v1/campaigns');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.data || []);
      }
    } catch {
      // Ignored
    }
  };

  // --- BRAND ACTIONS ---
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
      if (!res.ok) throw new Error(data.error || 'Failed to save brand');

      setBrand((prev) => ({ ...prev, id: data.data.id }));
      setStatusMessage({ type: 'success', text: 'Brand configuration saved successfully!' });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Save failed',
      });
    } finally {
      setSavingBrand(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    setStatusMessage(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/v1/brands/logo', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload logo');

      setBrand((prev) => ({ ...prev, logoUrl: data.data.logoUrl }));
      setStatusMessage({ type: 'success', text: 'Brand logo uploaded successfully!' });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Upload failed',
      });
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRequestOtp = async () => {
    setVerificationLoading(true);
    try {
      const res = await fetch('/api/v1/account/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: brand.senderEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request OTP');

      setShowVerifyModal(true);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to request verification code',
      });
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleConfirmOtp = async () => {
    setVerificationLoading(true);
    try {
      const res = await fetch('/api/v1/account/verify-email/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: brand.senderEmail,
          code: verificationCode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid code');

      setSession((prev) => (prev ? { ...prev, verifiedEmail: brand.senderEmail } : prev));
      setShowVerifyModal(false);
      setStatusMessage({
        type: 'success',
        text: `Sender email ${brand.senderEmail} is verified!`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Confirmation failed',
      });
    } finally {
      setVerificationLoading(false);
    }
  };

  // --- CONNECTION ACTIONS ---
  const handleConnectGmail = async () => {
    setConnectingProvider(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/v1/connections/gmail/start?format=json&returnTo=/workspace', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      const json = await res.json();
      if (res.ok && json.success && json.data?.url) {
        window.location.assign(json.data.url);
        return;
      }
      throw new Error(extractApiErrorMessage(json, 'Could not initiate Google OAuth flow.'));
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Network error initiating Google OAuth.',
      });
      setConnectingProvider(false);
    }
  };

  const handleConnectGmailSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectingProvider(true);
    setStatusMessage(null);
    try {
      const targetEmail = (gmailSmtpForm.email || brand.senderEmail || user?.email || '').trim();
      const res = await fetch('/api/v1/connections/provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'gmail_smtp',
          senderEmail: targetEmail,
          senderName: gmailSmtpForm.senderName.trim() || brand.senderName || undefined,
          credentials: { appPassword: gmailSmtpForm.appPassword },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(extractApiErrorMessage(data, 'Failed to verify Gmail App Password'));

      setShowConnectModal(null);
      setGmailSmtpForm({ email: '', appPassword: '', senderName: '' });
      await fetchConnections();
      setStatusMessage({
        type: 'success',
        text: 'Gmail App Password verified & encrypted with AES-256-GCM (strict 1,500 emails/day limit enabled)!',
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gmail App Password verification failed',
      });
    } finally {
      setConnectingProvider(false);
    }
  };

  const handleConnectBrevo = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectingProvider(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/v1/connections/provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'brevo',
          senderEmail: brand.senderEmail,
          credentials: { apiKey: brevoApiKey },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect Brevo');

      setShowConnectModal(null);
      setBrevoApiKey('');
      await fetchConnections();
      setStatusMessage({ type: 'success', text: 'Brevo sending account connected with AES-256-GCM encryption!' });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Connection failed',
      });
    } finally {
      setConnectingProvider(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm('Disconnect this email sending account?')) return;
    try {
      await fetch(`/api/v1/connections/${id}`, { method: 'DELETE' });
      await fetchConnections();
      setStatusMessage({ type: 'success', text: 'Sending account disconnected' });
    } catch {
      setStatusMessage({ type: 'error', text: 'Disconnect failed' });
    }
  };

  // --- RECIPIENTS ACTIONS ---
  const handleValidatePaste = async () => {
    if (!pasteInput.trim()) return;
    setValidatingRecipients(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/v1/contacts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput: pasteInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Validation failed');

      setValidationReport(data.data);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Validation error',
      });
    } finally {
      setValidatingRecipients(false);
    }
  };

  const handleImportValidatedContacts = async () => {
    if (!validationReport?.eligibleEmails?.length) return;
    if (!consentConfirmed) {
      alert('You must confirm that all recipients provided explicit opt-in consent.');
      return;
    }

    try {
      const contactsToImport = validationReport.eligibleEmails.map((email) => ({
        email,
        name: email.split('@')[0],
      }));

      const res = await fetch('/api/v1/contacts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts: contactsToImport,
          consentConfirmed: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      setPasteInput('');
      setValidationReport(null);
      await fetchContacts();
      setStatusMessage({
        type: 'success',
        text: `Successfully imported ${data.data.importedCount} permission-based contacts!`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Import failed',
      });
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      await fetch(`/api/v1/contacts/${id}`, { method: 'DELETE' });
      await fetchContacts();
    } catch {
      // Ignored
    }
  };

  // --- CAMPAIGN ACTIONS ---
  const handleLaunchCampaign = async () => {
    if (!showSendModal) return;
    setSendingCampaign(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/v1/campaigns/${showSendModal.id}/send`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch campaign');

      setShowSendModal(null);
      await fetchCampaigns();
      setStatusMessage({
        type: 'success',
        text: `Campaign "${showSendModal.campaignName}" submitted to BullMQ queue for background sending!`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Dispatch failed',
      });
    } finally {
      setSendingCampaign(false);
    }
  };

  const handlePauseResume = async (campaign: CampaignSummary, action: 'pause' | 'resume') => {
    try {
      const res = await fetch(`/api/v1/campaigns/${campaign.id}/${action}`, { method: 'POST' });
      if (res.ok) {
        await fetchCampaigns();
        setStatusMessage({ type: 'success', text: `Campaign ${action}d` });
      }
    } catch {
      setStatusMessage({ type: 'error', text: `Failed to ${action} campaign` });
    }
  };

  const handleOpenAnalytics = async (campId: string) => {
    setSelectedCampaignForAnalytics(campId);
    try {
      const res = await fetch(`/api/v1/campaigns/${campId}/analytics`);
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data.data);
      }
    } catch {
      // Ignored
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-600">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  const isEmailVerified =
    session?.verifiedEmail && session.verifiedEmail.toLowerCase() === brand.senderEmail.toLowerCase();

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="group">
              <MailCraftLogo size="md" variant="light" />
            </Link>

            {user && (
              <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-200">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                  {user.name || user.email}
                </span>
                <span className="text-xs text-slate-500 font-medium hidden md:inline">({user.email})</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/editor"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                <span className="hidden sm:inline">Email </span>Studio
              </span>
            </Link>

            <button
              onClick={() => {
                if (confirm('Log out of your MailCraft account?')) {
                  fetch('/api/v1/auth/logout', { method: 'POST' }).then(() => {
                    window.location.href = '/login';
                  });
                }
              }}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
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
                activeTab === 'brand' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>1. Brand Setup</span>
            </button>

            <button
              onClick={() => setActiveTab('sending')}
              className={`py-4 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === 'sending' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>2. Sending Accounts</span>
              {connections.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('recipients')}
              className={`py-4 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === 'recipients' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>3. Recipients</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] text-slate-600 font-mono">
                {contacts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('templates')}
              className={`py-4 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === 'templates' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>4. Email Studio (12 Themes)</span>
            </button>

            <button
              onClick={() => setActiveTab('campaigns')}
              className={`py-4 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === 'campaigns' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>5. Campaigns & Analytics</span>
              {campaigns.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-[10px] text-indigo-700 font-mono">
                  {campaigns.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Main Workspace Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Status Toast Notification */}
        {statusMessage && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center justify-between text-xs sm:text-sm ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-xs font-semibold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: BRAND SETUP */}
        {activeTab === 'brand' && (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Brand & Sender Profile</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Design tokens and sender credentials automatically populate email templates.
                  </p>
                </div>
                <div>
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

              <form onSubmit={handleSaveBrand} className="mt-6 space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Brand Name *</label>
                    <input
                      type="text"
                      required
                      value={brand.brandName}
                      onChange={(e) => setBrand({ ...brand, brandName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Sender Name *</label>
                    <input
                      type="text"
                      required
                      value={brand.senderName}
                      onChange={(e) => setBrand({ ...brand, senderName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Sender Email *</label>
                    <input
                      type="email"
                      required
                      value={brand.senderEmail}
                      onChange={(e) => setBrand({ ...brand, senderEmail: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Website URL</label>
                    <input
                      type="url"
                      placeholder="https://aurora.io"
                      value={brand.website}
                      onChange={(e) => setBrand({ ...brand, website: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Logo Section */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Brand Logo</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="url"
                      placeholder="https://yourbrand.com/logo.png"
                      value={brand.logoUrl}
                      onChange={(e) => setBrand({ ...brand, logoUrl: e.target.value })}
                      className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
                    />
                    <label className="cursor-pointer px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{logoUploading ? 'Uploading...' : 'Upload File'}</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* Colors */}
                <div className="grid sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brand.primaryColor}
                        onChange={(e) => setBrand({ ...brand, primaryColor: e.target.value })}
                        className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                      />
                      <input
                        type="text"
                        value={brand.primaryColor}
                        onChange={(e) => setBrand({ ...brand, primaryColor: e.target.value })}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono text-slate-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Secondary Accent</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brand.secondaryColor}
                        onChange={(e) => setBrand({ ...brand, secondaryColor: e.target.value })}
                        className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                      />
                      <input
                        type="text"
                        value={brand.secondaryColor}
                        onChange={(e) => setBrand({ ...brand, secondaryColor: e.target.value })}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Physical Business Address (CAN-SPAM Required)
                  </label>
                  <textarea
                    rows={2}
                    value={brand.footerAddress}
                    onChange={(e) => setBrand({ ...brand, footerAddress: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
                  />
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={savingBrand}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-75 text-white font-semibold text-xs rounded-lg transition"
                  >
                    {savingBrand ? 'Saving...' : 'Save Brand Settings'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('sending')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <span>Next: Sending Accounts</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>

            {/* Dynamic Brand Mockup */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-4">Live Preview</span>
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                <div className="bg-slate-200/80 px-4 py-2 border-b border-slate-300 text-xs font-semibold text-slate-600 flex justify-between">
                  <span>Inbox Preview</span>
                  <span className="text-[10px] text-slate-500">To: recipient@example.com</span>
                </div>
                <div className="p-6 bg-white space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    {brand.logoUrl ? (
                      <img src={brand.logoUrl} alt="Logo" className="h-8 max-w-[120px] object-contain" />
                    ) : (
                      <span style={{ color: brand.primaryColor }} className="font-extrabold text-lg">
                        {brand.brandName}
                      </span>
                    )}
                    <span className="text-xs font-bold text-slate-700">{brand.brandName}</span>
                  </div>

                  <div
                    style={{
                      background: `linear-gradient(135deg, ${brand.primaryColor}15, ${brand.secondaryColor}20)`,
                      borderLeft: `4px solid ${brand.primaryColor}`,
                    }}
                    className="p-4 rounded-lg"
                  >
                    <span style={{ color: brand.primaryColor }} className="text-[10px] font-bold uppercase tracking-wider">
                      Promotional Blast
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">Exclusive Announcement from {brand.brandName}</h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Designed with your brand tokens. Real-time rendering applied instantly.
                    </p>
                  </div>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      style={{ backgroundColor: brand.primaryColor }}
                      className="px-5 py-2 text-white text-xs font-bold rounded-lg shadow-sm"
                    >
                      Shop Exclusive Offers →
                    </button>
                  </div>

                  <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 text-center space-y-0.5">
                    <p>Sent by {brand.senderName} ({brand.senderEmail})</p>
                    <p>{brand.footerAddress}</p>
                    <p className="text-indigo-600 underline">Unsubscribe</p>
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
              <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Email Sending Infrastructure</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Connect personal Gmail or commercial bulk delivery. All credentials are encrypted with AES-256-GCM.
                  </p>
                </div>
              </div>

              {/* Active Connections List */}
              <div className="mt-6">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-3">Connected Accounts</span>
                {connections.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                    No sending accounts connected yet. Connect Gmail, Brevo, or Amazon SES below to send emails.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {connections.map((c) => (
                      <div
                        key={c.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center uppercase text-xs">
                            {c.provider.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-slate-900 text-sm uppercase">
                                {c.provider === 'gmail_smtp' ? 'Gmail App Password' : c.provider}
                              </h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                Active & Encrypted
                              </span>
                              {c.provider === 'gmail_smtp' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                                  {c.dailySentCount ?? 0} / {c.dailyQuotaLimit ?? 1500} today
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">Sender: {c.senderEmail}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDisconnect(c.id)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 hover:border-rose-300 hover:text-rose-600 text-xs font-semibold text-slate-600 transition"
                        >
                          Disconnect
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Connect Providers Grid */}
              <div className="grid md:grid-cols-3 gap-6 mt-8 pt-8 border-t border-slate-100">
                {/* Brevo Card */}
                <div className="p-6 rounded-xl border border-slate-200 bg-white flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-3">
                      <Zap className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Bulk Delivery Channel</span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">Brevo (Sendinblue)</h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      High-throughput delivery with dedicated IP options, DKIM/SPF headers, and automated bounce tracking.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConnectModal('brevo')}
                    className="mt-6 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition"
                  >
                    Configure Brevo Key
                  </button>
                </div>

                {/* Gmail App Password Card */}
                <div className="p-6 rounded-xl border border-slate-200 bg-white flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-3">
                      <Key className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                      1,500 Emails / Day Cap
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">Gmail + App Password</h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Send straight from your Gmail or Google Workspace inbox via encrypted SMTP SSL with a strict 1,500 mails/day cap.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setGmailSmtpForm({
                        email: brand.senderEmail || user?.email || '',
                        appPassword: '',
                        senderName: brand.senderName || '',
                      });
                      setShowConnectModal('gmail_smtp');
                    }}
                    className="mt-6 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition"
                  >
                    Connect Gmail App Password
                  </button>
                </div>

                {/* Gmail Card */}
                <div className="p-6 rounded-xl border border-slate-200 bg-white flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold mb-3">
                      <Send className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Low-Volume Channel</span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">Google OAuth (Gmail)</h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Personal sender outreach for small VIP announcements and test emails under 500 recipients per day.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleConnectGmail}
                    disabled={connectingProvider}
                    className="mt-6 w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-800 font-semibold rounded-lg text-xs transition flex items-center justify-center gap-1.5"
                  >
                    {connectingProvider ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Redirecting to Google...</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {connections.some((c) => c.provider === 'gmail' && c.status === 'connected')
                            ? 'Reconnect Google OAuth'
                            : 'Connect Google OAuth'}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RECIPIENTS & AUDIENCE */}
        {activeTab === 'recipients' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Permission-Based Audience</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Paste email addresses or upload CSV files. System deduplicates and filters suppressions automatically.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
                  {contacts.length} Total Contacts
                </span>
              </div>

              {/* Input Area */}
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Paste Email Addresses (Comma, Semicolon, Space, or Newline separated)
                  </label>
                  <textarea
                    rows={4}
                    value={pasteInput}
                    onChange={(e) => setPasteInput(e.target.value)}
                    placeholder="alice@company.com, bob@acme.org&#10;carol@domain.io, dave@startup.co"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleValidatePaste}
                    disabled={validatingRecipients || !pasteInput.trim()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition"
                  >
                    {validatingRecipients ? 'Validating...' : 'Validate Recipients'}
                  </button>

                  <label className="cursor-pointer px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Upload CSV File</span>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const form = new FormData();
                        form.append('file', file);
                        form.append('consentConfirmed', 'true');
                        try {
                          const res = await fetch('/api/v1/contacts/upload', {
                            method: 'POST',
                            body: form,
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error);
                          await fetchContacts();
                          setStatusMessage({ type: 'success', text: data.data.message });
                        } catch (err) {
                          setStatusMessage({
                            type: 'error',
                            text: err instanceof Error ? err.message : 'Upload failed',
                          });
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Validation Summary Card */}
                {validationReport && (
                  <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/60 space-y-3">
                    <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                      Validation Audit Breakdown
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2 bg-white rounded-lg border border-indigo-100">
                        <span className="text-slate-500 text-[10px]">Submitted</span>
                        <p className="font-bold text-slate-900 text-sm">{validationReport.totalSubmitted}</p>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-indigo-100">
                        <span className="text-slate-500 text-[10px]">Valid Syntax</span>
                        <p className="font-bold text-emerald-600 text-sm">{validationReport.validSyntaxCount}</p>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-indigo-100">
                        <span className="text-slate-500 text-[10px]">Duplicates Stripped</span>
                        <p className="font-bold text-amber-600 text-sm">{validationReport.duplicatesRemovedCount}</p>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-indigo-100">
                        <span className="text-slate-500 text-[10px]">Eligible</span>
                        <p className="font-bold text-indigo-600 text-sm">{validationReport.eligibleCount}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="consent-check"
                        checked={consentConfirmed}
                        onChange={(e) => setConsentConfirmed(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600"
                      />
                      <label htmlFor="consent-check" className="text-xs text-slate-700">
                        I certify that all {validationReport.eligibleCount} recipients gave explicit opt-in consent.
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={handleImportValidatedContacts}
                      disabled={!consentConfirmed || validationReport.eligibleCount === 0}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition"
                    >
                      Import {validationReport.eligibleCount} Opt-In Contacts →
                    </button>
                  </div>
                )}
              </div>

              {/* Saved Contacts Table */}
              <div className="mt-8 pt-6 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-3">
                  Registered Contacts ({contacts.length})
                </span>
                {contacts.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No contacts added yet.</p>
                ) : (
                  <div className="max-h-60 overflow-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5">Email</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Source</th>
                          <th className="p-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {contacts.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/80">
                            <td className="p-2.5 font-mono text-slate-800">{c.email}</td>
                            <td className="p-2.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  c.consentStatus === 'opted_in'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {c.consentStatus}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-500">{c.consentSource}</td>
                            <td className="p-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteContact(c.id)}
                                className="p-1 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TEMPLATES */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Email Studio Themes</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select any of the 12 production templates to customize in the visual editor.
                </p>
              </div>
              <Link
                href="/editor"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Open Visual Editor</span>
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {TEMPLATE_CATALOG.map((tpl) => (
                <div
                  key={tpl.slug}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:border-indigo-400 transition flex flex-col justify-between"
                >
                  <div className="h-32 bg-slate-100 overflow-hidden relative">
                    <img src={tpl.thumbnail} alt={tpl.name} className="w-full h-full object-cover" />
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-900/80 text-white">
                      {tpl.category}
                    </span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{tpl.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{tpl.description}</p>
                    </div>
                    <Link
                      href="/editor"
                      className="mt-4 w-full py-1.5 px-3 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-lg text-center text-xs font-semibold transition"
                    >
                      Customize in Studio →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: CAMPAIGNS & LIVE ANALYTICS */}
        {activeTab === 'campaigns' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Campaign Operations & Analytics</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage background campaign broadcasts, review delivery outcomes, and observe real sending progress.
                  </p>
                </div>
                <Link
                  href="/editor"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Campaign</span>
                </Link>
              </div>

              {/* Campaigns List */}
              <div className="mt-6 space-y-4">
                {campaigns.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    <p>No campaigns created yet. Click Create Campaign or open the Email Studio to design your first broadcast.</p>
                  </div>
                ) : (
                  campaigns.map((camp) => (
                    <div
                      key={camp.id}
                      className="p-5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-base">{camp.campaignName}</h3>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                camp.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : camp.status === 'sending' || camp.status === 'queued'
                                  ? 'bg-blue-100 text-blue-800 animate-pulse'
                                  : camp.status === 'paused'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {camp.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">Subject: {camp.subject}</p>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2">
                          {camp.status === 'draft' && (
                            <button
                              type="button"
                              onClick={() => setShowSendModal(camp)}
                              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Launch Broadcast</span>
                            </button>
                          )}

                          {camp.status === 'sending' && (
                            <button
                              type="button"
                              onClick={() => handlePauseResume(camp, 'pause')}
                              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs transition flex items-center gap-1"
                            >
                              <Pause className="w-3.5 h-3.5" />
                              <span>Pause</span>
                            </button>
                          )}

                          {camp.status === 'paused' && (
                            <button
                              type="button"
                              onClick={() => handlePauseResume(camp, 'resume')}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs transition flex items-center gap-1"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Resume</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenAnalytics(camp.id)}
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition"
                          >
                            Analytics
                          </button>
                        </div>
                      </div>

                      {/* Delivery Stats Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-400">Recipients</span>
                          <p className="font-bold text-slate-900">{camp.recipientCount}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-400">Accepted</span>
                          <p className="font-bold text-indigo-600">{camp.stats.accepted}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-400">Delivered</span>
                          <p className="font-bold text-emerald-600">{camp.stats.delivered}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-400">Bounces</span>
                          <p className="font-bold text-amber-600">{camp.stats.bounced}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-400">Clicks</span>
                          <p className="font-bold text-blue-600">{camp.stats.clicked}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-400">Unsubscribes</span>
                          <p className="font-bold text-rose-600">{camp.stats.unsubscribed}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Analytics Detail Drawer */}
            {selectedCampaignForAnalytics && analyticsData && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">
                    Live Delivery Log & Timeline
                  </h3>
                  <button
                    onClick={() => setSelectedCampaignForAnalytics(null)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Close
                  </button>
                </div>

                <div className="max-h-60 overflow-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Recipient</th>
                        <th className="p-2.5">Delivery Status</th>
                        <th className="p-2.5">Provider Message ID</th>
                        <th className="p-2.5">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {((analyticsData.recipients as unknown[]) || []).map((r: any) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono text-slate-800">{r.email}</td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r.status === 'delivered'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : r.status === 'bounced' || r.status === 'failed'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-[10px] text-slate-500">{r.providerMessageId || '-'}</td>
                          <td className="p-2.5 text-slate-400">{r.deliveredAt ? new Date(r.deliveredAt).toLocaleTimeString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Pre-Flight Send Confirmation Modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Pre-Flight Campaign Check</h3>
            <p className="text-xs text-slate-600">
              Review your campaign pre-flight requirements before dispatching to background BullMQ queues:
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span>Campaign:</span>
                <span className="font-bold text-slate-900">{showSendModal.campaignName}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span>Sender Email:</span>
                <span className="font-bold text-slate-900">{brand.senderEmail}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span>Eligible Opt-In Contacts:</span>
                <span className="font-bold text-indigo-600">{contacts.length} recipients</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span>Sender Verified:</span>
                <span className={`font-bold ${isEmailVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {isEmailVerified ? 'Verified' : 'Pending OTP Verification'}
                </span>
              </div>
            </div>

            {!isEmailVerified && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                You must verify your sender email before launching a live campaign.
              </div>
            )}

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleLaunchCampaign}
                disabled={sendingCampaign || !isEmailVerified || contacts.length === 0}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition"
              >
                {sendingCampaign ? 'Queueing Broadcast...' : 'Confirm & Launch Now'}
              </button>
              <button
                type="button"
                onClick={() => setShowSendModal(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connect Gmail App Password Modal */}
      {showConnectModal === 'gmail_smtp' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Connect Gmail + Google App Password</h3>
              <p className="text-xs text-slate-500 mt-1">
                Credentials are verified over TLS and stored with AES-256-GCM. Hard limit: <strong>1,500 emails/day</strong>.
              </p>
            </div>

            <form onSubmit={handleConnectGmailSmtp} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Gmail Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@gmail.com"
                  value={gmailSmtpForm.email}
                  onChange={(e) => setGmailSmtpForm({ ...gmailSmtpForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Google App Password (16 characters)
                </label>
                <input
                  type="password"
                  required
                  placeholder="abcd efgh ijkl mnop"
                  value={gmailSmtpForm.appPassword}
                  onChange={(e) => setGmailSmtpForm({ ...gmailSmtpForm, appPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Google Account &rarr; Security &rarr; Enable 2-Step Verification &rarr; App passwords.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Sender Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="My Brand"
                  value={gmailSmtpForm.senderName}
                  onChange={(e) => setGmailSmtpForm({ ...gmailSmtpForm, senderName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={connectingProvider || !gmailSmtpForm.email.trim() || !gmailSmtpForm.appPassword.trim()}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition"
                >
                  {connectingProvider ? 'Verifying SMTP...' : 'Verify & Connect'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConnectModal(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Connect Brevo Modal */}
      {showConnectModal === 'brevo' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Connect Brevo Account</h3>
            <p className="text-xs text-slate-500">
              Enter your Brevo API key (v3). Credentials are encrypted at rest with AES-256-GCM.
            </p>

            <form onSubmit={handleConnectBrevo} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Brevo API Key (xkeysib-...)</label>
                <input
                  type="password"
                  required
                  placeholder="xkeysib-..."
                  value={brevoApiKey}
                  onChange={(e) => setBrevoApiKey(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={connectingProvider || !brevoApiKey.trim()}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition"
                >
                  {connectingProvider ? 'Encrypting & Saving...' : 'Save Encrypted Key'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConnectModal(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Verify Sender Email</h3>
            <p className="text-xs text-slate-600">
              Enter the 6-digit verification code sent to <span className="font-semibold text-slate-900">{brand.senderEmail}</span>.
            </p>


            <input
              type="text"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="123456"
              className="w-full text-center tracking-[0.4em] text-2xl font-bold py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleConfirmOtp}
                disabled={verificationLoading || verificationCode.length !== 6}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition"
              >
                {verificationLoading ? 'Verifying...' : 'Confirm Verification'}
              </button>
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition"
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
