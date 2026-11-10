'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Send,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  Server,
  Users,
  Layers,
  FileText,
  SlidersHorizontal,
  Mail,
  Loader2,
  Calendar,
  Smartphone,
  Monitor,
  Eye,
  Check,
  Building,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Info,
} from 'lucide-react';

interface BrandItem {
  id: string;
  brandName: string;
  senderName: string;
  senderEmail: string;
  website?: string;
  logoUrl?: string;
  primaryColor?: string;
}

interface ConnectionItem {
  id: string;
  provider: string;
  senderEmail: string;
  senderName?: string;
  status: string;
  senderVerificationStatus?: string;
}

interface TemplateItem {
  _id: string;
  name: string;
  category: string;
  description: string;
  thumbnailUrl?: string;
  defaultSubject?: string;
  editorData?: Record<string, unknown>;
}

interface ValidationIssue {
  code: string;
  message: string;
  ruleNumber: number;
  field?: string;
}

function CampaignWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editCampaignId = searchParams.get('id');

  // Wizard Step (1 to 9)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [campaignId, setCampaignId] = useState<string | null>(editCampaignId);
  const [saving, setSaving] = useState<boolean>(false);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(!!editCampaignId);

  // Form State
  const [campaignName, setCampaignName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [brandId, setBrandId] = useState<string>('');
  const [connectionId, setConnectionId] = useState<string>('');
  const [audienceType, setAudienceType] = useState<string>('all_eligible');
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [preheader, setPreheader] = useState<string>('');
  const [editorData, setEditorData] = useState<Record<string, unknown>>({});
  const [renderedHtml, setRenderedHtml] = useState<string>('');

  // Auxiliary data
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string; contactCount: number }[]>([]);
  const [segments, setSegments] = useState<{ id: string; name: string; contactCount: number }[]>([]);
  const [contactStats, setContactStats] = useState<{
    totalContacts: number;
    eligibleContacts: number;
    suppressed: number;
  }>({ totalContacts: 0, eligibleContacts: 0, suppressed: 0 });

  // Preview Mode
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Test Email State
  const [testEmailAddress, setTestEmailAddress] = useState<string>('');
  const [testSending, setTestSending] = useState<boolean>(false);
  const [testEmailResult, setTestEmailResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Validation State
  const [validating, setValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
  } | null>(null);

  // Launch State
  const [launchMode, setLaunchMode] = useState<'now' | 'schedule'>('now');
  const [scheduledDateTime, setScheduledDateTime] = useState<string>('');
  const [launching, setLaunching] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Fetch prerequisites
  useEffect(() => {
    async function loadPrerequisites() {
      try {
        const [brandsRes, connsRes, tmplRes, tagsRes, segsRes, contactsRes] = await Promise.all([
          fetch('/api/v1/brands'),
          fetch('/api/v1/connections'),
          fetch('/api/v1/templates'),
          fetch('/api/v1/tags'),
          fetch('/api/v1/segments'),
          fetch('/api/v1/contacts?limit=1'),
        ]);

        const [brandsData, connsData, tmplData, tagsData, segsData, contactsData] =
          await Promise.all([
            brandsRes.json(),
            connsRes.json(),
            tmplRes.json(),
            tagsRes.json(),
            segsRes.json(),
            contactsRes.json(),
          ]);

        if (brandsData.success && brandsData.data?.length > 0) {
          setBrands(brandsData.data);
          if (!brandId) setBrandId(brandsData.data[0].id);
        }

        if (connsData.success && connsData.data) {
          setConnections(connsData.data);
          const active = connsData.data.find(
            (c: ConnectionItem) => c.status === 'connected' && c.senderVerificationStatus === 'verified'
          );
          if (active && !connectionId) {
            setConnectionId(active.id);
          }
        }

        if (tmplData.success && tmplData.data?.templates) {
          setTemplates(tmplData.data.templates);
        }

        if (tagsData.success && tagsData.data) {
          setTags(tagsData.data);
        }

        if (segsData.success && segsData.data) {
          setSegments(segsData.data);
        }

        if (contactsData.success && contactsData.data?.stats) {
          setContactStats({
            totalContacts: contactsData.data.stats.totalContacts || 0,
            eligibleContacts: contactsData.data.stats.eligibleContacts || 0,
            suppressed: contactsData.data.stats.suppressed || 0,
          });
        }
      } catch (err) {
        console.error('Failed to load campaign prerequisites', err);
      }
    }

    loadPrerequisites();
  }, []);

  // Fetch campaign if editing
  useEffect(() => {
    if (!editCampaignId) return;

    async function loadCampaign() {
      try {
        setLoadingInitial(true);
        const res = await fetch(`/api/v1/campaigns/${editCampaignId}`);
        const data = await res.json();

        if (data.success && data.data) {
          const camp = data.data;
          setCampaignId(camp.id);
          setCampaignName(camp.campaignName || '');
          setDescription(camp.description || '');
          if (camp.brand?.id || camp.brand?._id) {
            setBrandId(camp.brand.id || camp.brand._id);
          }
          if (camp.connectionId) setConnectionId(camp.connectionId);
          if (camp.templateId) setTemplateId(camp.templateId);
          setSubject(camp.subject || '');
          setPreheader(camp.preheader || '');
          if (camp.audienceType) setAudienceType(camp.audienceType);
          if (camp.audienceFilters?.segmentId) setSelectedSegmentId(camp.audienceFilters.segmentId);
          if (camp.audienceFilters?.tag) setSelectedTag(camp.audienceFilters.tag);
          if (camp.editorData) setEditorData(camp.editorData);
          if (camp.renderedHtml) setRenderedHtml(camp.renderedHtml);
        }
      } catch (err) {
        showNotification('Failed to load campaign for editing', 'error');
      } finally {
        setLoadingInitial(false);
      }
    }

    loadCampaign();
  }, [editCampaignId]);

  // Save / Update Draft Campaign
  const saveCampaignDraft = async (): Promise<string | null> => {
    try {
      setSaving(true);
      if (!brandId) {
        showNotification('Please select or configure a brand profile first.', 'error');
        return null;
      }

      const payload = {
        campaignName: campaignName.trim() || 'Untitled Campaign',
        description: description.trim(),
        brandId,
        connectionId: connectionId || undefined,
        templateId: templateId || undefined,
        subject: subject.trim() || `${campaignName || 'Special'} Announcement`,
        preheader: preheader.trim(),
        audienceType,
        audienceFilters: {
          segmentId: audienceType === 'segment' ? selectedSegmentId : undefined,
          tag: audienceType === 'tag' ? selectedTag : undefined,
        },
        editorData,
      };

      if (campaignId) {
        // Update existing campaign
        const res = await fetch(`/api/v1/campaigns/${campaignId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          return campaignId;
        } else {
          showNotification(data.message || 'Failed to update campaign', 'error');
          return null;
        }
      } else {
        // Create new campaign
        const res = await fetch('/api/v1/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success && data.data?.id) {
          setCampaignId(data.data.id);
          return data.data.id;
        } else {
          showNotification(data.message || 'Failed to create campaign draft', 'error');
          return null;
        }
      }
    } catch {
      showNotification('Network error saving campaign draft', 'error');
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Step advancement
  const handleNextStep = async () => {
    // Validation before moving forward
    if (currentStep === 1) {
      if (!campaignName.trim()) {
        showNotification('Campaign name is required', 'error');
        return;
      }
      if (!brandId) {
        showNotification('Please select a Brand Profile', 'error');
        return;
      }
      const savedId = await saveCampaignDraft();
      if (!savedId) return;
    }

    if (currentStep === 2 && !connectionId) {
      showNotification('Please select an active email sending provider before continuing', 'error');
      return;
    }

    if (currentStep === 4 && templateId) {
      // Find template
      const selectedTmpl = templates.find((t) => t._id === templateId);
      if (selectedTmpl) {
        if (!subject && selectedTmpl.defaultSubject) {
          setSubject(selectedTmpl.defaultSubject);
        }
        if (selectedTmpl.editorData && Object.keys(editorData).length === 0) {
          setEditorData(selectedTmpl.editorData);
        }
      }
    }

    if (currentStep === 5) {
      if (!subject.trim()) {
        showNotification('Email Subject Line is required', 'error');
        return;
      }
      await saveCampaignDraft();
    }

    if (currentStep === 7) {
      // When entering validation step (step 8), trigger automatic readiness check
      runValidation();
    }

    if (currentStep < 9) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Run 20-Rule Server Validation Engine
  const runValidation = async () => {
    if (!campaignId) return;
    try {
      setValidating(true);
      await saveCampaignDraft();

      const res = await fetch(`/api/v1/campaigns/${campaignId}/validate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success && data.data) {
        setValidationResult(data.data);
      } else {
        showNotification(data.message || 'Validation request failed', 'error');
      }
    } catch {
      showNotification('Network error validating campaign', 'error');
    } finally {
      setValidating(false);
    }
  };

  // Send Test Email
  const handleSendTestEmail = async () => {
    if (!campaignId) {
      showNotification('Please save campaign first', 'error');
      return;
    }
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      showNotification('Please enter a valid test recipient email address', 'error');
      return;
    }

    try {
      setTestSending(true);
      setTestEmailResult(null);
      await saveCampaignDraft();

      const res = await fetch(`/api/v1/campaigns/${campaignId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail: testEmailAddress.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setTestEmailResult({
          success: true,
          message: `Test email successfully queued to ${testEmailAddress}. Check your inbox!`,
        });
      } else {
        setTestEmailResult({
          success: false,
          message: data.message || 'Failed to dispatch test email',
        });
      }
    } catch {
      setTestEmailResult({
        success: false,
        message: 'Network error sending test email',
      });
    } finally {
      setTestSending(false);
    }
  };

  // Launch Campaign (Send Now or Schedule)
  const handleLaunchCampaign = async () => {
    if (!campaignId) return;

    try {
      setLaunching(true);

      if (launchMode === 'schedule') {
        if (!scheduledDateTime) {
          showNotification('Please choose a valid future date and time to schedule', 'error');
          setLaunching(false);
          return;
        }

        const scheduledDate = new Date(scheduledDateTime);
        if (scheduledDate.getTime() < Date.now() + 60000) {
          showNotification('Scheduled time must be at least 1 minute in the future', 'error');
          setLaunching(false);
          return;
        }

        const res = await fetch(`/api/v1/campaigns/${campaignId}/schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scheduledAt: scheduledDate.toISOString(),
            timezone: 'UTC',
          }),
        });

        const data = await res.json();
        if (data.success) {
          showNotification('Campaign scheduled successfully!', 'success');
          router.push(`/campaigns/${campaignId}`);
        } else {
          showNotification(data.message || 'Failed to schedule campaign', 'error');
        }
      } else {
        // Immediate launch
        const idempotencyKey = crypto.randomUUID();
        const res = await fetch(`/api/v1/campaigns/${campaignId}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audienceType,
            segmentId: audienceType === 'segment' ? selectedSegmentId : undefined,
            tag: audienceType === 'tag' ? selectedTag : undefined,
            idempotencyKey,
          }),
        });

        const data = await res.json();
        if (data.success) {
          showNotification('Campaign launched successfully! Background workers active.', 'success');
          router.push(`/campaigns/${campaignId}`);
        } else {
          showNotification(data.message || 'Failed to launch campaign', 'error');
        }
      }
    } catch {
      showNotification('Network error dispatching campaign', 'error');
    } finally {
      setLaunching(false);
    }
  };

  // Step names
  const steps = [
    { number: 1, title: 'Campaign Info' },
    { number: 2, title: 'Email Provider' },
    { number: 3, title: 'Audience' },
    { number: 4, title: 'Template' },
    { number: 5, title: 'Subject & Content' },
    { number: 6, title: 'Preview' },
    { number: 7, title: 'Test Email' },
    { number: 8, title: 'Validation' },
    { number: 9, title: 'Confirm & Launch' },
  ];

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm">Loading campaign draft...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/campaigns"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Campaigns
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <div>
              <span className="font-semibold text-white text-sm">
                {campaignName || 'New Campaign Wizard'}
              </span>
              <span className="text-xs text-slate-500 ml-2">
                Step {currentStep} of 9: {steps[currentStep - 1].title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {campaignId && (
              <button
                onClick={() => saveCampaignDraft()}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                )}
                Save Draft
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Stepper Progress Bar */}
      <div className="bg-slate-900 border-b border-slate-800 py-3 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between min-w-[700px]">
          {steps.map((s) => {
            const isCompleted = s.number < currentStep;
            const isCurrent = s.number === currentStep;

            return (
              <button
                key={s.number}
                onClick={() => {
                  if (campaignId || s.number <= currentStep) {
                    setCurrentStep(s.number);
                    if (s.number === 8) runValidation();
                  }
                }}
                disabled={!campaignId && s.number > currentStep}
                className={`flex items-center gap-2 text-xs font-medium transition ${
                  isCurrent
                    ? 'text-indigo-400'
                    : isCompleted
                    ? 'text-slate-300 hover:text-white'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : isCompleted
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}
                >
                  {isCompleted ? <Check className="w-3 h-3" /> : s.number}
                </div>
                <span>{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Form Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-8">
        {/* Notification Banner */}
        {notification && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between shadow-lg border transition ${
              notification.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
                : notification.type === 'error'
                ? 'bg-rose-950/80 border-rose-800 text-rose-200'
                : 'bg-sky-950/80 border-sky-800 text-sky-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
              {notification.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400" />}
              {notification.type === 'info' && <Info className="w-5 h-5 text-sky-400" />}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              ×
            </button>
          </div>
        )}

        {/* STEP 1: CAMPAIGN INFO */}
        {currentStep === 1 && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Step 1: Campaign Information
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Name your campaign and select which verified brand profile will represent this dispatch.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Campaign Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Summer Flash Sale 2026"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Internal Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Objective, notes, target promo codes or campaign context..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                  Brand Profile <span className="text-rose-400">*</span>
                </label>
                {brands.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-900/60 text-amber-200 text-sm space-y-2">
                    <p>No brand profile found for your workspace.</p>
                    <Link
                      href="/workspace"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:underline"
                    >
                      <Building className="w-3.5 h-3.5" />
                      Configure Brand Profile in Workspace &rarr;
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {brands.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => setBrandId(b.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                          brandId === b.id
                            ? 'bg-indigo-950/50 border-indigo-500 shadow-md shadow-indigo-500/10'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-indigo-900/50 border border-indigo-700/50 flex items-center justify-center text-indigo-300 font-bold shrink-0">
                          {b.brandName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white text-sm truncate">
                            {b.brandName}
                          </div>
                          <div className="text-xs text-slate-400 truncate mt-0.5">
                            {b.senderName} &lt;{b.senderEmail}&gt;
                          </div>
                          {b.website && (
                            <div className="text-[11px] text-indigo-400 truncate mt-1">
                              {b.website}
                            </div>
                          )}
                        </div>
                        {brandId === b.id && (
                          <CheckCircle className="w-5 h-5 text-indigo-400 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: EMAIL PROVIDER SELECTION */}
        {currentStep === 2 && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-400" />
                Step 2: Choose Sending Provider
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Select an authenticated sending infrastructure to dispatch your marketing emails.
              </p>
            </div>

            <div className="space-y-4">
              {connections.length === 0 && (
                <div className="p-6 rounded-xl bg-slate-950/60 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-950/50 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm">
                        No Email Sending Providers Connected
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        You must connect and verify at least one email provider (Gmail, Brevo, or Amazon SES) to launch campaigns.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/connect"
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0 transition"
                  >
                    Connect Provider
                  </Link>
                </div>
              )}

              {/* Connected live providers */}
              {connections.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setConnectionId(c.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition flex items-start justify-between gap-4 ${
                    connectionId === c.id
                      ? 'bg-indigo-950/50 border-indigo-500 shadow-md shadow-indigo-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-300 shrink-0 font-bold uppercase text-xs">
                      {c.provider.slice(0, 3)}
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm flex items-center gap-2">
                        {c.provider.toUpperCase()} Integration
                        {c.status === 'connected' && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Connected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Sender: {c.senderEmail}{' '}
                        {c.senderVerificationStatus === 'verified' && (
                          <span className="text-emerald-400 font-medium">(Verified Sender)</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {connectionId === c.id && (
                    <CheckCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-1" />
                  )}
                </div>
              ))}

              <div className="pt-2 flex justify-between items-center text-xs text-slate-400">
                <span>Want to connect Gmail, Brevo, or AWS SES?</span>
                <Link
                  href="/connect"
                  target="_blank"
                  className="text-indigo-400 hover:underline flex items-center gap-1"
                >
                  Manage Sender Accounts <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: AUDIENCE & CONTACT SELECTION */}
        {currentStep === 3 && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                Step 3: Audience &amp; Opt-in Contacts
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Select your target recipient list. In accordance with strict anti-spam compliance, only opted-in recipients will be reached.
              </p>
            </div>

            {/* Audience Stats Badge */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <div>
                <div className="text-xs text-slate-400">Total Contacts</div>
                <div className="text-xl font-bold text-white mt-1">
                  {contactStats.totalContacts}
                </div>
              </div>
              <div className="border-x border-slate-800">
                <div className="text-xs text-emerald-400 font-medium">Eligible (Opted-in)</div>
                <div className="text-xl font-bold text-emerald-300 mt-1">
                  {contactStats.eligibleContacts}
                </div>
              </div>
              <div>
                <div className="text-xs text-rose-400">Suppressed Excluded</div>
                <div className="text-xl font-bold text-rose-300 mt-1">
                  {contactStats.suppressed}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                  Audience Targeting Mode
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div
                    onClick={() => setAudienceType('all_eligible')}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      audienceType === 'all_eligible'
                        ? 'bg-indigo-950/50 border-indigo-500 shadow-md shadow-indigo-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-white text-sm">All Eligible Contacts</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Every contact marked opted-in ({contactStats.eligibleContacts} recipients)
                    </div>
                  </div>

                  <div
                    onClick={() => setAudienceType('segment')}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      audienceType === 'segment'
                        ? 'bg-indigo-950/50 border-indigo-500 shadow-md shadow-indigo-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-white text-sm">Saved Segment</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Filter by saved criteria ({segments.length} segments available)
                    </div>
                  </div>

                  <div
                    onClick={() => setAudienceType('tag')}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      audienceType === 'tag'
                        ? 'bg-indigo-950/50 border-indigo-500 shadow-md shadow-indigo-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-white text-sm">Filter by Tag</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Target specific tag group ({tags.length} tags available)
                    </div>
                  </div>
                </div>
              </div>

              {/* Segment Dropdown */}
              {audienceType === 'segment' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase text-slate-400">
                    Choose Segment
                  </label>
                  {segments.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No segments saved yet.{' '}
                      <Link href="/contacts" className="text-indigo-400 hover:underline">
                        Create segments in Contacts
                      </Link>
                    </p>
                  ) : (
                    <select
                      value={selectedSegmentId}
                      onChange={(e) => setSelectedSegmentId(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select a Segment --</option>
                      {segments.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.contactCount} contacts)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Tag Dropdown */}
              {audienceType === 'tag' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase text-slate-400">
                    Choose Tag
                  </label>
                  {tags.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No tags available.{' '}
                      <Link href="/contacts" className="text-indigo-400 hover:underline">
                        Add tags in Contacts
                      </Link>
                    </p>
                  ) : (
                    <select
                      value={selectedTag}
                      onChange={(e) => setSelectedTag(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select a Tag --</option>
                      {tags.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name} ({t.contactCount} contacts)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-900/40 flex items-center gap-2.5 text-xs text-indigo-300">
                <ShieldCheck className="w-4 h-4 shrink-0 text-indigo-400" />
                <span>
                  Anti-spam guarantee: Contacts who unsubscribed or are on your suppression list are automatically purged in real time during sending.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: TEMPLATE SELECTION */}
        {currentStep === 4 && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                Step 4: Select Email Template
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Choose a responsive email design from MailCraft&apos;s library of production templates.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-1">
              {templates.map((tmpl) => (
                <div
                  key={tmpl._id}
                  onClick={() => {
                    setTemplateId(tmpl._id);
                    if (tmpl.defaultSubject && !subject) setSubject(tmpl.defaultSubject);
                    if (tmpl.editorData) setEditorData(tmpl.editorData);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    templateId === tmpl._id
                      ? 'bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {tmpl.category}
                      </span>
                      {templateId === tmpl._id && (
                        <CheckCircle className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                    <div className="font-semibold text-white text-sm">{tmpl.name}</div>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {tmpl.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-indigo-400 font-medium">
                    <span>{templateId === tmpl._id ? 'Selected' : 'Use this template'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 5: SUBJECT & CONTENT */}
        {currentStep === 5 && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
                Step 5: Subject Line &amp; Personalization
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Configure your subject, preview preheader, and dynamic personalization tokens.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold uppercase text-slate-400">
                    Subject Line <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-xs text-slate-500">{subject.length} / 200 chars</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g., Exclusive 20% Discount for you, {{first_name}}!"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold uppercase text-slate-400">
                    Preheader / Preview Text
                  </label>
                  <span className="text-xs text-slate-500">{preheader.length} / 200 chars</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g., Don't miss out on this weekend's flash sale. Valid until Sunday."
                  value={preheader}
                  onChange={(e) => setPreheader(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* Personalization variable helpers */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-semibold uppercase text-slate-400">
                  Insert Personalization Token
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    '{{first_name}}',
                    '{{last_name}}',
                    '{{brand_name}}',
                    '{{coupon_code}}',
                    '{{website_url}}',
                    '{{unsubscribe_url}}',
                  ].map((token) => (
                    <button
                      key={token}
                      type="button"
                      onClick={() => setSubject((s) => s + ' ' + token)}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 hover:border-indigo-500 text-xs font-mono text-indigo-300 transition"
                    >
                      {token}
                    </button>
                  ))}
                </div>
              </div>

              {/* Link to visual editor */}
              {campaignId && (
                <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-900/40 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-white">Visual Drag-and-Drop Editor</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Need custom block styling, images, buttons, or spacers?
                    </div>
                  </div>
                  <Link
                    href={`/editor/${campaignId}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition"
                  >
                    Open Editor <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 6: PREVIEW */}
        {currentStep === 6 && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-indigo-400" />
                  Step 6: Email Preview
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Preview how your marketing email will appear across mobile and desktop inboxes.
                </p>
              </div>

              {/* Device Toggle */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded text-xs flex items-center gap-1 transition ${
                    previewDevice === 'desktop'
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  Desktop
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded text-xs flex items-center gap-1 transition ${
                    previewDevice === 'mobile'
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  Mobile
                </button>
              </div>
            </div>

            {/* Email Inbox Header Simulation */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
              <div>
                <span className="text-slate-500 font-semibold">From:</span>{' '}
                <span className="text-slate-200">
                  {brands.find((b) => b.id === brandId)?.senderName || 'Brand'}{' '}
                  &lt;{brands.find((b) => b.id === brandId)?.senderEmail || 'sender@mailcraft.io'}&gt;
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Subject:</span>{' '}
                <span className="text-white font-medium">
                  {subject.replace(/{{first_name}}/g, 'Alex').replace(/{{brand_name}}/g, 'MailCraft')}
                </span>
              </div>
              {preheader && (
                <div>
                  <span className="text-slate-500 font-semibold">Preheader:</span>{' '}
                  <span className="text-slate-400">{preheader}</span>
                </div>
              )}
            </div>

            {/* Rendered View Frame */}
            <div className="flex justify-center bg-slate-950/80 border border-slate-800 rounded-xl p-4 overflow-hidden">
              <div
                className={`bg-white text-slate-900 rounded-lg shadow-2xl transition-all duration-300 p-6 overflow-y-auto max-h-[600px] ${
                  previewDevice === 'mobile' ? 'w-[375px]' : 'w-full max-w-[600px]'
                }`}
              >
                {renderedHtml ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: renderedHtml
                        .replace(/{{first_name}}/g, 'Alex')
                        .replace(/{{last_name}}/g, 'Taylor')
                        .replace(/{{brand_name}}/g, 'MailCraft')
                        .replace(/{{coupon_code}}/g, 'SAVE20')
                        .replace(/{{unsubscribe_url}}/g, '#'),
                    }}
                  />
                ) : (
                  <div className="space-y-4 text-center py-12">
                    <div className="text-2xl font-bold text-slate-900">
                      {subject || 'Exclusive Announcement'}
                    </div>
                    <p className="text-slate-600 text-sm">
                      {preheader ||
                        'Thank you for being a valued subscriber. Discover our latest offers.'}
                    </p>
                    <div className="p-6 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-900 font-medium text-sm">
                      Template: {templates.find((t) => t._id === templateId)?.name || 'Default Layout'}
                    </div>
                    <div className="text-xs text-slate-400 pt-8 border-t border-slate-200">
                      © 2026 MailCraft. All rights reserved. •{' '}
                      <span className="underline">Unsubscribe</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: TEST EMAIL */}
        {currentStep === 7 && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-400" />
                Step 7: Send Real Test Email
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Dispatch an actual test email to your inbox to inspect rendering, subject line, and deliverability before broadcasting.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Test Recipient Email
                </label>
                <div className="flex gap-3">
                  <input
                    type="email"
                    placeholder="your-email@example.com"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                  <button
                    onClick={handleSendTestEmail}
                    disabled={testSending || !testEmailAddress}
                    className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm transition flex items-center gap-2"
                  >
                    {testSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Test
                      </>
                    )}
                  </button>
                </div>
              </div>

              {testEmailResult && (
                <div
                  className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
                    testEmailResult.success
                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                      : 'bg-rose-950/60 border-rose-800 text-rose-200'
                  }`}
                >
                  {testEmailResult.success ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold">
                      {testEmailResult.success ? 'Test Email Dispatched' : 'Dispatch Failed'}
                    </div>
                    <div className="text-xs mt-0.5 opacity-90">{testEmailResult.message}</div>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Note:</span> Test emails do not alter your campaign recipient statistics or contact opt-in consent records.
              </div>
            </div>
          </div>
        )}

        {/* STEP 8: READINESS VALIDATION */}
        {currentStep === 8 && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  Step 8: 20-Rule Readiness Audit
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  MailCraft&apos;s pre-flight validation engine evaluates delivery compliance, brand alignment, and technical integrity.
                </p>
              </div>

              <button
                onClick={runValidation}
                disabled={validating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${validating ? 'animate-spin text-indigo-400' : ''}`} />
                Re-check
              </button>
            </div>

            {validating ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-sm">Auditing campaign rules against production delivery standards...</p>
              </div>
            ) : validationResult ? (
              <div className="space-y-4">
                {/* Overall status banner */}
                <div
                  className={`p-4 rounded-xl border flex items-center gap-3 ${
                    validationResult.valid
                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                      : 'bg-rose-950/60 border-rose-800 text-rose-200'
                  }`}
                >
                  {validationResult.valid ? (
                    <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <div className="font-semibold text-sm">
                      {validationResult.valid
                        ? 'Ready for Launch! All critical validation gates passed.'
                        : 'Action Required: Blocking issues detected before launch.'}
                    </div>
                    <div className="text-xs opacity-90">
                      {validationResult.errors.length} errors, {validationResult.warnings.length}{' '}
                      advisories detected.
                    </div>
                  </div>
                </div>

                {/* Errors list */}
                {validationResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-rose-400">
                      Blocking Errors
                    </div>
                    {validationResult.errors.map((err, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-300"
                      >
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                        <div>
                          <span className="font-bold">Rule {err.ruleNumber} ({err.code}):</span>{' '}
                          {err.message}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Warnings list */}
                {validationResult.warnings.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      Warnings &amp; Recommendations
                    </div>
                    {validationResult.warnings.map((warn, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-amber-950/30 border border-amber-900/50 flex items-start gap-2.5 text-xs text-amber-300"
                      >
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                        <div>
                          <span className="font-bold">Rule {warn.ruleNumber}:</span> {warn.message}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Passed rules summary */}
                {validationResult.valid && validationResult.errors.length === 0 && (
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>CAN-SPAM / GDPR mandatory unsubscribe tokens &amp; physical postal addresses verified.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm">
                Click &quot;Re-check&quot; to execute pre-flight validation.
              </div>
            )}
          </div>
        )}

        {/* STEP 9: CONFIRM & LAUNCH */}
        {currentStep === 9 && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-400" />
                Step 9: Launch &amp; Scheduling
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Final confirmation before putting your promotional email campaign into production.
              </p>
            </div>

            {/* Campaign Summary Card */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="font-semibold text-white text-base">{campaignName}</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500">Subject:</span>
                  <div className="text-slate-200 font-medium truncate mt-0.5">{subject}</div>
                </div>
                <div>
                  <span className="text-slate-500">Brand Profile:</span>
                  <div className="text-slate-200 font-medium truncate mt-0.5">
                    {brands.find((b) => b.id === brandId)?.brandName || 'Brand'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Sender Provider:</span>
                  <div className="text-slate-200 font-medium mt-0.5">
                    {connections.find((c) => c.id === connectionId)?.provider.toUpperCase() || 'Not Selected'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Eligible Audience:</span>
                  <div className="text-emerald-400 font-bold mt-0.5">
                    {contactStats.eligibleContacts} recipients
                  </div>
                </div>
              </div>
            </div>

            {/* Launch Options */}
            <div className="space-y-4">
              <label className="block text-xs font-semibold uppercase text-slate-400">
                Delivery Schedule
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div
                  onClick={() => setLaunchMode('now')}
                  className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    launchMode === 'now'
                      ? 'bg-indigo-950/50 border-indigo-500'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Send className="w-5 h-5 text-indigo-400" />
                    <div>
                      <div className="font-semibold text-white text-sm">Send Immediately</div>
                      <div className="text-xs text-slate-400">Queue to BullMQ workers right now</div>
                    </div>
                  </div>
                  {launchMode === 'now' && <CheckCircle className="w-5 h-5 text-indigo-400" />}
                </div>

                <div
                  onClick={() => setLaunchMode('schedule')}
                  className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    launchMode === 'schedule'
                      ? 'bg-indigo-950/50 border-indigo-500'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <div>
                      <div className="font-semibold text-white text-sm">Schedule for Later</div>
                      <div className="text-xs text-slate-400">Specify future dispatch timestamp</div>
                    </div>
                  </div>
                  {launchMode === 'schedule' && <CheckCircle className="w-5 h-5 text-indigo-400" />}
                </div>
              </div>

              {launchMode === 'schedule' && (
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-semibold uppercase text-slate-400">
                    Execution Date &amp; Time (UTC)
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="pt-4">
                <button
                  onClick={handleLaunchCampaign}
                  disabled={launching || (validationResult !== null && !validationResult.valid)}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-base shadow-xl shadow-indigo-600/30 transition transform active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {launching ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Engaging Delivery Infrastructure...
                    </>
                  ) : launchMode === 'schedule' ? (
                    <>
                      <Calendar className="w-5 h-5" />
                      Schedule Campaign
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Launch Campaign Broadcast Now
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Navigation Footer */}
        <div className="flex items-center justify-between pt-4">
          <button
            onClick={handlePrevStep}
            disabled={currentStep === 1 || saving}
            className="px-5 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 text-sm font-medium transition flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          {currentStep < 9 && (
            <button
              onClick={handleNextStep}
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Next: {steps[currentStep].title}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default function CampaignWizardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      }
    >
      <CampaignWizardContent />
    </Suspense>
  );
}

