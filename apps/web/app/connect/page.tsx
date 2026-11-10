'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { DashboardHeader } from '@/components/DashboardHeader';
import { extractApiErrorMessage, getOAuthErrorMessage } from '@/lib/oauth-helpers';
import {
  Mail,
  CheckCircle2,
  AlertTriangle,
  X,
  XCircle,
  Send,
  Key,
  RefreshCw,
  Copy,
  ExternalLink,
  ShieldCheck,
  Server,
  Cloud,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface ConnectionItem {
  id: string;
  provider: 'gmail' | 'gmail_smtp' | 'brevo' | 'ses';
  senderEmail: string;
  senderName?: string;
  status:
    | 'connected'
    | 'disconnected'
    | 'revoked'
    | 'verification_required'
    | 'auth_failed'
    | 'connecting';
  senderVerificationStatus?: 'verified' | 'pending' | 'unverified' | 'failed';
  providerAccountStatus?: string;
  dailyQuotaLimit?: number | null;
  dailySentCount?: number;
  dailyRemaining?: number | null;
  lastVerifiedAt?: string;
  lastError?: string;
  verifiedAt?: string;
  createdAt: string;
}

interface DnsRecord {
  type: 'TXT' | 'CNAME' | 'MX';
  name: string;
  value: string;
  status: 'verified' | 'pending' | 'missing';
  description?: string;
}

interface SenderVerificationDetails {
  verified: boolean;
  senderEmail: string;
  domain?: string;
  domainVerified?: boolean;
  spfStatus?: 'verified' | 'pending' | 'unverified';
  dkimStatus?: 'verified' | 'pending' | 'unverified';
  dmarcStatus?: 'verified' | 'pending' | 'unverified';
  dnsRecords?: DnsRecord[];
  instructions?: string[];
}

const AWS_REGIONS = [
  { id: 'us-east-1', label: 'US East (N. Virginia) [us-east-1]' },
  { id: 'us-east-2', label: 'US East (Ohio) [us-east-2]' },
  { id: 'us-west-2', label: 'US West (Oregon) [us-west-2]' },
  { id: 'eu-west-1', label: 'Europe (Ireland) [eu-west-1]' },
  { id: 'eu-central-1', label: 'Europe (Frankfurt) [eu-central-1]' },
  { id: 'ap-south-1', label: 'Asia Pacific (Mumbai) [ap-south-1]' },
  { id: 'ap-southeast-1', label: 'Asia Pacific (Singapore) [ap-southeast-1]' },
  { id: 'ap-northeast-1', label: 'Asia Pacific (Tokyo) [ap-northeast-1]' },
];

function ConnectPageContent() {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Modals state
  const [activeModal, setActiveModal] = useState<
    'gmail_smtp' | 'brevo' | 'ses' | 'test' | 'dns' | 'disconnect' | null
  >(null);
  const [selectedConnection, setSelectedConnection] = useState<ConnectionItem | null>(null);

  // Form states
  const [gmailSmtpForm, setGmailSmtpForm] = useState({
    gmailAddress: '',
    appPassword: '',
    senderName: '',
  });

  const [brevoForm, setBrevoForm] = useState({
    apiKey: '',
    senderEmail: '',
    senderName: '',
  });

  const [sesForm, setSesForm] = useState({
    accessKeyId: '',
    secretAccessKey: '',
    region: 'us-east-1',
    senderEmail: '',
    senderName: '',
  });

  const [testForm, setTestForm] = useState({
    recipientEmail: '',
    subject: '',
  });

  const [dnsDetails, setDnsDetails] = useState<SenderVerificationDetails | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [testingSend, setTestingSend] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    messageId?: string;
    message?: string;
  } | null>(null);
  const [verifyingDns, setVerifyingDns] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Load existing connections
  const fetchConnections = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/connections', {
        headers: { Accept: 'application/json' },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setConnections(data.data);
      }
    } catch {
      // Quiet fail on initial load
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Handle URL notifications from OAuth redirects
  useEffect(() => {
    const statusParam = searchParams.get('status');
    const providerParam = searchParams.get('provider');
    const errorParam = searchParams.get('error');

    if (statusParam === 'connected' && providerParam === 'gmail') {
      setNotification({
        type: 'success',
        message: 'Google Gmail sending account connected and verified successfully!',
      });
      fetchConnections();
    } else if (errorParam) {
      setNotification({
        type: 'error',
        message: getOAuthErrorMessage(errorParam),
      });
    }
  }, [searchParams, fetchConnections]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Gmail OAuth connect
  const handleConnectGmail = async () => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/v1/connections/gmail/start?format=json', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      const json = await res.json();
      if (json.success && json.data?.url) {
        window.location.href = json.data.url;
      } else {
        setNotification({
          type: 'error',
          message: extractApiErrorMessage(json, 'Could not initiate Google OAuth flow.'),
        });
      }
    } catch {
      setNotification({
        type: 'error',
        message: 'Network error connecting to Google OAuth.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Connect Gmail + App Password (strict 1,500/day limit)
  const handleConnectGmailSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmailSmtpForm.gmailAddress || !gmailSmtpForm.appPassword) {
      setNotification({
        type: 'error',
        message: 'Please provide both your Gmail address and 16-character Google App Password.',
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/v1/connections/provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'gmail_smtp',
          senderEmail: gmailSmtpForm.gmailAddress,
          senderName: gmailSmtpForm.senderName || undefined,
          credentials: {
            appPassword: gmailSmtpForm.appPassword,
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        setNotification({
          type: 'success',
          message: 'Gmail + App Password verified & connected (limit: 1,500 emails/day)!',
        });
        setActiveModal(null);
        setGmailSmtpForm({ gmailAddress: '', appPassword: '', senderName: '' });
        await fetchConnections();
      } else {
        setNotification({
          type: 'error',
          message: extractApiErrorMessage(json, 'Failed to authenticate Gmail App Password.'),
        });
      }
    } catch {
      setNotification({
        type: 'error',
        message: 'Network error verifying Gmail App Password credentials.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Connect Brevo
  const handleConnectBrevo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brevoForm.apiKey || !brevoForm.senderEmail) {
      setNotification({
        type: 'error',
        message: 'Please provide both Brevo API Key and Sender Email.',
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/v1/connections/provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'brevo',
          senderEmail: brevoForm.senderEmail,
          senderName: brevoForm.senderName || undefined,
          credentials: {
            apiKey: brevoForm.apiKey,
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        setNotification({
          type: 'success',
          message: 'Brevo sending account connected and authenticated!',
        });
        setActiveModal(null);
        setBrevoForm({ apiKey: '', senderEmail: '', senderName: '' });
        await fetchConnections();
      } else {
        setNotification({
          type: 'error',
          message: extractApiErrorMessage(json, 'Failed to authenticate Brevo API credentials.'),
        });
      }
    } catch {
      setNotification({
        type: 'error',
        message: 'Network error connecting Brevo sending account.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Connect SES
  const handleConnectSes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sesForm.accessKeyId || !sesForm.secretAccessKey || !sesForm.senderEmail) {
      setNotification({
        type: 'error',
        message: 'Please provide AWS Access Key, Secret Key, and Sender Email.',
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/v1/connections/provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'ses',
          senderEmail: sesForm.senderEmail,
          senderName: sesForm.senderName || undefined,
          credentials: {
            accessKeyId: sesForm.accessKeyId,
            secretAccessKey: sesForm.secretAccessKey,
            region: sesForm.region,
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        setNotification({
          type: 'success',
          message: 'Amazon SES credentials verified and connected!',
        });
        setActiveModal(null);
        setSesForm({
          accessKeyId: '',
          secretAccessKey: '',
          region: 'us-east-1',
          senderEmail: '',
          senderName: '',
        });
        await fetchConnections();
      } else {
        setNotification({
          type: 'error',
          message: extractApiErrorMessage(json, 'Failed to authenticate AWS credentials.'),
        });
      }
    } catch {
      setNotification({
        type: 'error',
        message: 'Network error connecting Amazon SES account.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Disconnect connection
  const handleDisconnect = async () => {
    if (!selectedConnection) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/v1/connections/${selectedConnection.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setNotification({
          type: 'info',
          message: `Disconnected ${selectedConnection.provider.toUpperCase()} sending account.`,
        });
        setActiveModal(null);
        setSelectedConnection(null);
        await fetchConnections();
      } else {
        setNotification({
          type: 'error',
          message: extractApiErrorMessage(json, 'Failed to disconnect account.'),
        });
      }
    } catch {
      setNotification({
        type: 'error',
        message: 'Network error disconnecting account.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Trigger test email
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConnection || !testForm.recipientEmail) return;

    try {
      setTestingSend(true);
      setTestResult(null);

      const res = await fetch(`/api/v1/connections/${selectedConnection.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: testForm.recipientEmail,
          subject: testForm.subject || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setTestResult({
          success: true,
          messageId: json.data?.messageId,
          message: `Test email dispatched to ${testForm.recipientEmail}`,
        });
      } else {
        setTestResult({
          success: false,
          message: extractApiErrorMessage(json, 'Test email delivery failed.'),
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: 'Network error during test delivery dispatch.',
      });
    } finally {
      setTestingSend(false);
    }
  };

  // Open DNS verification modal
  const handleOpenDnsModal = async (conn: ConnectionItem) => {
    setSelectedConnection(conn);
    setActiveModal('dns');
    setVerifyingDns(true);
    setDnsDetails(null);

    try {
      const res = await fetch(`/api/v1/connections/${conn.id}/verify-sender`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success && json.data?.details) {
        setDnsDetails(json.data.details);
      }
    } catch {
      // Ignore
    } finally {
      setVerifyingDns(false);
    }
  };

  // Refresh DNS records check
  const handleRefreshDns = async () => {
    if (!selectedConnection) return;
    setVerifyingDns(true);
    try {
      const res = await fetch(`/api/v1/connections/${selectedConnection.id}/verify-sender`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success && json.data?.details) {
        setDnsDetails(json.data.details);
        await fetchConnections();
        if (json.data.details.verified) {
          setNotification({
            type: 'success',
            message: 'Sender identity verified and ready for live delivery!',
          });
        }
      }
    } catch {
      //
    } finally {
      setVerifyingDns(false);
    }
  };

  // Helper getters
  const getConnectionForProvider = (provider: 'gmail' | 'gmail_smtp' | 'brevo' | 'ses') =>
    connections.find((c) => c.provider === provider && c.status !== 'disconnected');

  const gmailConn = getConnectionForProvider('gmail');
  const gmailSmtpConn = getConnectionForProvider('gmail_smtp');
  const brevoConn = getConnectionForProvider('brevo');
  const sesConn = getConnectionForProvider('ses');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Navigation */}
      <DashboardHeader
        activeNav="connect"
        showLogout
        rightActions={
          <Link
            href="/templates"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm shadow-indigo-600/20 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Templates</span>
            <span className="sm:hidden">Themes</span>
          </Link>
        }
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Toast Notification */}
        {notification && (
          <div
            className={`mb-8 p-4 rounded-xl flex items-start justify-between border shadow-sm ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : notification.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-indigo-50 border-indigo-200 text-indigo-900'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : notification.type === 'error' ? (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0" />
              )}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-700 ml-4"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            Encrypted Credentials Vault &bull; AES-256-GCM
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Email Delivery Providers
          </h1>
          <p className="mt-3 text-base text-slate-600 max-w-3xl leading-relaxed">
            Connect your own sending infrastructure. MailCraft separates low-volume personal sends (Gmail)
            from dedicated bulk delivery engines (Brevo, Amazon SES) to protect sender reputation.
            All credentials are encrypted at rest with AES-256-GCM.
          </p>
        </div>

        {/* Providers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
          {/* 1. Google Gmail Card */}
          <div className="saas-card p-6 flex flex-col justify-between transition">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-rose-600" />
                </div>
                {gmailConn?.status === 'connected' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Connected
                  </span>
                ) : gmailConn?.status === 'auth_failed' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    <XCircle className="w-3.5 h-3.5" />
                    Auth Failed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    Not Connected
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-1">Google Gmail</h3>
              <p className="text-xs font-semibold text-indigo-600 mb-3">OAuth 2.0 &bull; Low-Volume Channel</p>

              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Direct inbox delivery from your verified Google account. Ideal for testing designs, sending internal
                previews, or VIP low-volume blasts without configuring DNS records.
              </p>

              <div className="space-y-2.5 mb-6 text-xs text-slate-700">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Daily Recipient Limit</span>
                  <span className="font-semibold text-slate-900">500 / day</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Authentication</span>
                  <span className="font-semibold text-slate-900">Google OAuth 2.0 PKCE</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">DNS Configuration</span>
                  <span className="font-semibold text-emerald-600">Zero DNS Required</span>
                </div>
                {gmailConn && (
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Sender Address</span>
                    <span className="font-mono text-indigo-600 font-semibold truncate max-w-[180px]">
                      {gmailConn.senderEmail}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              {gmailConn?.status === 'connected' ? (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setSelectedConnection(gmailConn);
                      setActiveModal('test');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 transition shadow-sm shadow-indigo-600/20"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send Test Email
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={handleConnectGmail}
                      disabled={submitting}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center gap-1.5 transition"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Reconnect
                    </button>
                    <button
                      onClick={() => {
                        setSelectedConnection(gmailConn);
                        setActiveModal('disconnect');
                      }}
                      className="py-2 px-3 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center gap-1.5 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleConnectGmail}
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 shadow-sm flex items-center justify-center gap-2 transition"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                  ) : (
                    <>
                      <Mail className="w-4 h-4 text-rose-600" />
                      Connect with Google
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* 2. Gmail App Password (SMTP) Card */}
          <div className="saas-card p-6 flex flex-col justify-between transition">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                  <Key className="w-6 h-6 text-indigo-600" />
                </div>
                {gmailSmtpConn?.status === 'connected' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Connected
                  </span>
                ) : gmailSmtpConn?.status === 'auth_failed' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    <XCircle className="w-3.5 h-3.5" />
                    Auth Failed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    Not Connected
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-1">Gmail App Password</h3>
              <p className="text-xs font-semibold text-indigo-600 mb-3">SMTP SSL &bull; 1,500 / Day Cap</p>

              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Connect your Gmail or Google Workspace inbox directly with a 16-character App Password. Strict
                1,500 emails/day limit enforced automatically.
              </p>

              <div className="space-y-2.5 mb-6 text-xs text-slate-700">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Strict Daily Limit</span>
                  <span className="font-semibold text-indigo-600">1,500 / day</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Authentication</span>
                  <span className="font-semibold text-slate-900">Google App Password</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Vault Security</span>
                  <span className="font-semibold text-emerald-600">AES-256-GCM</span>
                </div>
                {gmailSmtpConn && (
                  <>
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Sender Address</span>
                      <span className="font-mono text-indigo-600 font-semibold truncate max-w-[160px]">
                        {gmailSmtpConn.senderEmail}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Sent Today</span>
                      <span className="font-mono text-slate-900 font-semibold">
                        {gmailSmtpConn.dailySentCount ?? 0} / {gmailSmtpConn.dailyQuotaLimit ?? 1500}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              {gmailSmtpConn ? (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedConnection(gmailSmtpConn);
                        setActiveModal('test');
                      }}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5 transition shadow-sm shadow-indigo-600/20"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Test Send
                    </button>
                    <button
                      onClick={() => {
                        setGmailSmtpForm({
                          gmailAddress: gmailSmtpConn.senderEmail,
                          appPassword: '',
                          senderName: gmailSmtpConn.senderName || '',
                        });
                        setActiveModal('gmail_smtp');
                      }}
                      className="py-2 px-3 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                    >
                      Update
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedConnection(gmailSmtpConn);
                      setActiveModal('disconnect');
                    }}
                    className="w-full py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 transition text-center"
                  >
                    Disconnect App Password
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setActiveModal('gmail_smtp')}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 transition shadow-sm shadow-indigo-600/20"
                >
                  <Key className="w-4 h-4" />
                  Connect App Password
                </button>
              )}
            </div>
          </div>

          {/* 3. Brevo Card */}
          <div className="saas-card p-6 flex flex-col justify-between transition">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <Cloud className="w-6 h-6 text-emerald-600" />
                </div>
                {brevoConn?.status === 'connected' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Connected
                  </span>
                ) : brevoConn?.status === 'verification_required' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    DNS Setup Needed
                  </span>
                ) : brevoConn?.status === 'auth_failed' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    <XCircle className="w-3.5 h-3.5" />
                    Auth Failed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    Not Connected
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-1">Brevo</h3>
              <p className="text-xs font-semibold text-emerald-600 mb-3">REST API v3 &bull; Bulk Marketing Channel</p>

              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                High-throughput marketing email delivery platform with real-time webhooks, bounce suppression,
                dedicated IPs, and automated domain reputation tracking.
              </p>

              <div className="space-y-2.5 mb-6 text-xs text-slate-700">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Daily Recipient Limit</span>
                  <span className="font-semibold text-slate-900">50,000+ / day</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Authentication</span>
                  <span className="font-semibold text-slate-900">REST API Key (v3)</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">DNS Alignment</span>
                  <span className="font-semibold text-amber-600">SPF + DKIM Recommended</span>
                </div>
                {brevoConn && (
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Sender Address</span>
                    <span className="font-mono text-emerald-700 font-semibold truncate max-w-[180px]">
                      {brevoConn.senderEmail}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              {brevoConn ? (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenDnsModal(brevoConn)}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center gap-1.5 transition"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      DNS Records
                    </button>
                    <button
                      onClick={() => {
                        setSelectedConnection(brevoConn);
                        setActiveModal('test');
                      }}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5 transition shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Test Send
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedConnection(brevoConn);
                      setActiveModal('disconnect');
                    }}
                    className="w-full py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 transition text-center"
                  >
                    Disconnect Brevo
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setActiveModal('brevo')}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 transition shadow-sm shadow-emerald-600/20"
                >
                  <Key className="w-4 h-4" />
                  Configure Brevo API Key
                </button>
              )}
            </div>
          </div>

          {/* 4. Amazon SES Card */}
          <div className="saas-card p-6 flex flex-col justify-between transition">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                  <Server className="w-6 h-6 text-amber-600" />
                </div>
                {sesConn?.status === 'connected' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Connected
                  </span>
                ) : sesConn?.status === 'verification_required' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Domain Verify Needed
                  </span>
                ) : sesConn?.status === 'auth_failed' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    <XCircle className="w-3.5 h-3.5" />
                    Auth Failed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    Not Connected
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-1">Amazon SES</h3>
              <p className="text-xs font-semibold text-amber-600 mb-3">AWS SigV4 &bull; Enterprise Bulk Pipeline</p>

              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Enterprise cloud email infrastructure at minimal cost ($0.10 per 1,000 emails).
                Full ISP feedback loop integration with Easy-DKIM token automation.
              </p>

              <div className="space-y-2.5 mb-6 text-xs text-slate-700">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Daily Recipient Limit</span>
                  <span className="font-semibold text-slate-900">100,000+ / day</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Authentication</span>
                  <span className="font-semibold text-slate-900">AWS IAM Access Key (SigV4)</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">DKIM Authentication</span>
                  <span className="font-semibold text-amber-600">Easy DKIM 3x CNAME</span>
                </div>
                {sesConn && (
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Sender Address</span>
                    <span className="font-mono text-amber-700 font-semibold truncate max-w-[180px]">
                      {sesConn.senderEmail}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              {sesConn ? (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenDnsModal(sesConn)}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center gap-1.5 transition"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      DNS Records
                    </button>
                    <button
                      onClick={() => {
                        setSelectedConnection(sesConn);
                        setActiveModal('test');
                      }}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5 transition shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Test Send
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedConnection(sesConn);
                      setActiveModal('disconnect');
                    }}
                    className="w-full py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 transition text-center"
                  >
                    Disconnect Amazon SES
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setActiveModal('ses')}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-2 transition shadow-sm shadow-amber-600/20"
                >
                  <Key className="w-4 h-4" />
                  Configure Amazon SES
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Deliverability Best Practices */}
        <div className="saas-card p-6">
          <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Deliverability Checklist for Promotional Campaigns
          </h3>
          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            MailCraft automatically inserts mandatory CAN-SPAM / GDPR unsubscribe headers, while optimal inbox placement
            relies on proper DNS domain authentication.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="font-semibold text-slate-900 block mb-1">1. SPF Alignment</span>
              <p className="text-slate-600">
                Authorizes Brevo or Amazon SES servers to send mail originating from your custom brand domain.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="font-semibold text-slate-900 block mb-1">2. DKIM Cryptographic Signature</span>
              <p className="text-slate-600">
                Cryptographically seals every email body so Gmail, Outlook, and Yahoo verify it wasn&apos;t modified in transit.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="font-semibold text-slate-900 block mb-1">3. DMARC Policy</span>
              <p className="text-slate-600">
                Instructs receiving mailbox providers on how to handle unauthenticated spoofing attempts.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* --- MODALS --- */}

      {/* Gmail App Password Modal */}
      {activeModal === 'gmail_smtp' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                <Key className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Connect Gmail App Password</h3>
                <p className="text-xs text-slate-500">SMTP over TLS (smtp.gmail.com) &bull; Strict 1,500 emails/day limit</p>
              </div>
            </div>

            <form onSubmit={handleConnectGmailSmtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Gmail / Google Workspace Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@gmail.com"
                  value={gmailSmtpForm.gmailAddress}
                  onChange={(e) => setGmailSmtpForm({ ...gmailSmtpForm, gmailAddress: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none text-xs text-slate-900 placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Google App Password (16 characters) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="abcd efgh ijkl mnop"
                  value={gmailSmtpForm.appPassword}
                  onChange={(e) => setGmailSmtpForm({ ...gmailSmtpForm, appPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none text-xs text-slate-900 placeholder-slate-400 font-mono"
                />
                <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                  Google Account &rarr; Security &rarr; Enable 2-Step Verification &rarr; App passwords. Stored encrypted with AES-256-GCM.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Sender Display Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Acme Marketing"
                  value={gmailSmtpForm.senderName}
                  onChange={(e) => setGmailSmtpForm({ ...gmailSmtpForm, senderName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none text-xs text-slate-900 placeholder-slate-400"
                />
              </div>

              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200/80 text-[11px] text-indigo-800">
                Strict Quota Guard: This sending channel is hard-capped at <strong>1,500 emails per day</strong> across campaigns and test sends.
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 transition shadow-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Verifying SMTP Login...
                    </>
                  ) : (
                    'Verify & Connect'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Brevo Setup Modal */}
      {activeModal === 'brevo' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <Cloud className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Connect Brevo Account</h3>
                <p className="text-xs text-slate-500">REST API Key v3 authentication</p>
              </div>
            </div>

            <form onSubmit={handleConnectBrevo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Brevo API Key (v3) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="xkeysib-..."
                  value={brevoForm.apiKey}
                  onChange={(e) => setBrevoForm({ ...brevoForm, apiKey: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none text-xs text-slate-900 placeholder-slate-400 font-mono"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Generate in your Brevo Dashboard &rarr; SMTP &amp; API &rarr; API Keys.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Sender Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="marketing@yourbrand.com"
                  value={brevoForm.senderEmail}
                  onChange={(e) => setBrevoForm({ ...brevoForm, senderEmail: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none text-xs text-slate-900 placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Sender Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Acme Promotions"
                  value={brevoForm.senderName}
                  onChange={(e) => setBrevoForm({ ...brevoForm, senderName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none text-xs text-slate-900 placeholder-slate-400"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 transition shadow-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Verifying with Brevo...
                    </>
                  ) : (
                    'Verify & Connect'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Amazon SES Setup Modal */}
      {activeModal === 'ses' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                <Server className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Connect Amazon SES</h3>
                <p className="text-xs text-slate-500">AWS IAM Credentials with ses:SendEmail permissions</p>
              </div>
            </div>

            <form onSubmit={handleConnectSes} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  AWS Region <span className="text-rose-500">*</span>
                </label>
                <select
                  value={sesForm.region}
                  onChange={(e) => setSesForm({ ...sesForm, region: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none"
                >
                  {AWS_REGIONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  AWS Access Key ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="AKIA..."
                  value={sesForm.accessKeyId}
                  onChange={(e) => setSesForm({ ...sesForm, accessKeyId: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none text-xs text-slate-900 placeholder-slate-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  AWS Secret Access Key <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                  value={sesForm.secretAccessKey}
                  onChange={(e) => setSesForm({ ...sesForm, secretAccessKey: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none text-xs text-slate-900 placeholder-slate-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sender Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="newsletter@brand.com"
                  value={sesForm.senderEmail}
                  onChange={(e) => setSesForm({ ...sesForm, senderEmail: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none text-xs text-slate-900 placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sender Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Brand Updates"
                  value={sesForm.senderName}
                  onChange={(e) => setSesForm({ ...sesForm, senderName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none text-xs text-slate-900 placeholder-slate-400"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2 transition shadow-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Authenticating AWS SigV4...
                    </>
                  ) : (
                    'Verify & Connect'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DNS Records & Verification Modal */}
      {activeModal === 'dns' && selectedConnection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">DNS Records &amp; Sender Verification</h3>
                <p className="text-xs text-slate-500">
                  {selectedConnection.provider.toUpperCase()} &bull; {selectedConnection.senderEmail}
                </p>
              </div>
            </div>

            {verifyingDns ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
                <p className="text-sm font-semibold text-slate-800">Querying DNS Records...</p>
                <p className="text-xs text-slate-500">Checking SPF, DKIM and DMARC status with provider</p>
              </div>
            ) : dnsDetails ? (
              <div className="space-y-5">
                {/* Status overview */}
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    dnsDetails.verified
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {dnsDetails.verified ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-bold">
                        {dnsDetails.verified ? 'Sender Fully Verified' : 'DNS Records Setup Required'}
                      </p>
                      <p className="text-[11px] opacity-80">
                        {dnsDetails.verified
                          ? 'Your domain is authenticated and ready to deliver at high inbox placement rates.'
                          : 'Add the DNS records below into your DNS host (Cloudflare, GoDaddy, Route53, Namecheap).'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRefreshDns}
                    disabled={verifyingDns}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition shrink-0 ml-3"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Re-check
                  </button>
                </div>

                {/* DNS Records Table */}
                {dnsDetails.dnsRecords && dnsDetails.dnsRecords.length > 0 ? (
                  <div>
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Required DNS Records
                    </h4>
                    <div className="space-y-3">
                      {dnsDetails.dnsRecords.map((record, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-indigo-700 font-mono font-bold text-[10px]">
                              {record.type}
                            </span>
                            <span
                              className={`text-[11px] font-semibold ${
                                record.status === 'verified'
                                  ? 'text-emerald-600'
                                  : 'text-amber-600'
                              }`}
                            >
                              {record.status === 'verified' ? 'Verified' : 'Pending Verification'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[11px] text-slate-500 block mb-0.5">Name / Host:</span>
                            <div className="flex items-center justify-between bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg font-mono text-[11px] text-slate-800">
                              <span className="truncate mr-2">{record.name}</span>
                              <button
                                onClick={() => copyToClipboard(record.name, `name-${idx}`)}
                                className="text-slate-400 hover:text-slate-800"
                                title="Copy Name"
                              >
                                {copiedKey === `name-${idx}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div>
                            <span className="text-[11px] text-slate-500 block mb-0.5">Value / Target:</span>
                            <div className="flex items-center justify-between bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg font-mono text-[11px] text-slate-800">
                              <span className="truncate mr-2">{record.value}</span>
                              <button
                                onClick={() => copyToClipboard(record.value, `val-${idx}`)}
                                className="text-slate-400 hover:text-slate-800"
                                title="Copy Value"
                              >
                                {copiedKey === `val-${idx}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          {record.description && (
                            <p className="text-[10px] text-slate-500 mt-1">{record.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    No custom DNS records needed for this provider identity.
                  </p>
                )}

                {/* Instructions */}
                {dnsDetails.instructions && dnsDetails.instructions.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs font-semibold text-slate-800 block mb-1.5">
                      Propagation Notice
                    </span>
                    <ul className="list-disc pl-4 space-y-1 text-slate-600 text-xs">
                      {dnsDetails.instructions.map((inst, i) => (
                        <li key={i}>{inst}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-500">
                Could not retrieve DNS guidance. Please ensure your provider credentials are valid.
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Email Modal */}
      {activeModal === 'test' && selectedConnection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => {
                setActiveModal(null);
                setTestResult(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                <Send className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Send Test Email</h3>
                <p className="text-xs text-slate-500">
                  Via {selectedConnection.provider.toUpperCase()} ({selectedConnection.senderEmail})
                </p>
              </div>
            </div>

            {testResult && (
              <div
                className={`mb-4 p-3.5 rounded-xl border text-xs ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold mb-1">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
                {testResult.messageId && (
                  <p className="font-mono text-[10px] text-emerald-700 truncate">
                    ID: {testResult.messageId}
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleSendTestEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Recipient Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="your-personal@email.com"
                  value={testForm.recipientEmail}
                  onChange={(e) => setTestForm({ ...testForm, recipientEmail: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none text-xs text-slate-900 placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Subject Line (Optional)
                </label>
                <input
                  type="text"
                  placeholder="MailCraft Test Verification Message"
                  value={testForm.subject}
                  onChange={(e) => setTestForm({ ...testForm, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none text-xs text-slate-900 placeholder-slate-400"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    setTestResult(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={testingSend}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 transition shadow-sm"
                >
                  {testingSend ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Dispatching Test...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Send Test
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disconnect Confirmation Modal */}
      {activeModal === 'disconnect' && selectedConnection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-rose-600" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              Disconnect {selectedConnection.provider.toUpperCase()}?
            </h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              This will securely purge encrypted credentials and access tokens from your workspace vault.
              Scheduled campaigns relying on this provider will not be dispatched until reconnected.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setSelectedConnection(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDisconnect}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 transition"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  'Confirm Disconnect'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
          <p className="text-xs font-medium">Loading Sending Providers...</p>
        </div>
      }
    >
      <ConnectPageContent />
    </Suspense>
  );
}
