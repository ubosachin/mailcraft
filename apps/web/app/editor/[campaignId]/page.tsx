'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, ArrowLeft, RefreshCw, LayoutTemplate } from 'lucide-react';
import { IEditorSchema, IEditorBlock, EditorBlockType } from '@mailcraft/shared-types';
import { TEMPLATE_CATALOG, compileEmail } from '@mailcraft/email-renderer';
import { EditorTopNav } from '../components/EditorTopNav';
import { BlockSidebar } from '../components/BlockSidebar';
import { EmailCanvas } from '../components/EmailCanvas';
import { PropertiesInspector } from '../components/PropertiesInspector';
import { PreviewModal } from '../components/PreviewModal';
import { TestEmailModal } from '../components/TestEmailModal';
import { useEditorHistory } from '../hooks/useEditorHistory';
import { useAutosave } from '../hooks/useAutosave';

interface PageProps {
  params: Promise<{ campaignId: string }>;
}

export default function CampaignEditorPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const campaignId = resolvedParams.campaignId;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [campaignName, setCampaignName] = useState('My Promotional Campaign');
  const [subject, setSubject] = useState('Special Announcement & Exclusive Perks');
  const [preheader, setPreheader] = useState('');
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'block' | 'settings'>('block');

  const [brand, setBrand] = useState<{
    brandName?: string;
    logoUrl?: string;
    senderName?: string;
    senderEmail?: string;
    primaryColor?: string;
    secondaryColor?: string;
    footerAddress?: string;
  }>({
    brandName: 'MailCraft Studio',
    primaryColor: '#4F46E5',
    secondaryColor: '#10B981',
  });

  // Preview & Test Modal states
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewPlainText, setPreviewPlainText] = useState('');
  const [previewByteSize, setPreviewByteSize] = useState<number | undefined>(undefined);
  const [showTestModal, setShowTestModal] = useState(false);

  // Default fallback schema
  const defaultSchema: IEditorSchema = TEMPLATE_CATALOG[0]?.editorSchema || {
    version: 1,
    settings: { contentWidth: 600, background: '#F8F9FA', fontFamily: 'sans-serif' },
    blocks: [],
  };

  const {
    schema,
    updateSchema,
    resetHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEditorHistory(defaultSchema);

  const {
    saveStatus,
    errorMessage,
    performSave,
    initBaseline,
  } = useAutosave({
    campaignId,
    campaignName,
    subject,
    preheader,
    schema,
    enabled: !loading && !loadError,
  });

  // Load Campaign and Brand data
  const loadCampaign = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      // 1. Verify Authenticated Session & Load Brand
      const authRes = await fetch('/api/v1/auth/me');
      const authData = authRes.ok ? await authRes.json() : null;
      if (!authData?.data?.authenticated) {
        window.location.href = `/login?redirect=/editor/${campaignId}`;
        return;
      }

      const brandRes = await fetch('/api/v1/brands/current');
      if (brandRes.ok) {
        const brandData = await brandRes.json();
        if (brandData.data) {
          setBrand({
            brandName: brandData.data.brandName || 'MailCraft Studio',
            logoUrl: brandData.data.logoUrl || '',
            senderName: brandData.data.senderName || '',
            senderEmail: brandData.data.senderEmail || '',
            primaryColor: brandData.data.primaryColor || '#4F46E5',
            secondaryColor: brandData.data.secondaryColor || '#10B981',
            footerAddress: brandData.data.footerAddress || '',
          });
        }
      }

      // 2. Fetch Campaign
      const campRes = await fetch(`/api/v1/campaigns/${campaignId}`);
      if (!campRes.ok) {
        const errorData = await campRes.json().catch(() => ({}));
        throw new Error(errorData.error || `Campaign with ID "${campaignId}" not found`);
      }

      const campData = await campRes.json();
      const campaign = campData.data;

      setCampaignName(campaign.campaignName || 'Untitled Campaign');
      setSubject(campaign.subject || 'Exclusive Offers Inside');
      setPreheader(campaign.preheader || '');

      let loadedSchema = campaign.editorData as IEditorSchema;
      if (!loadedSchema || !loadedSchema.blocks || loadedSchema.blocks.length === 0) {
        loadedSchema = defaultSchema;
      }

      resetHistory(loadedSchema);
      initBaseline({
        campaignName: campaign.campaignName || 'Untitled Campaign',
        subject: campaign.subject || 'Exclusive Offers Inside',
        preheader: campaign.preheader || '',
        schema: loadedSchema,
      });

      // Default select the first block if present
      if (loadedSchema.blocks?.length) {
        setSelectedBlockId(loadedSchema.blocks[0].id);
      }
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load campaign');
    } finally {
      setLoading(false);
    }
  }, [campaignId, resetHistory, initBaseline]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  // Selected Block object
  const selectedBlock =
    schema.blocks?.find((b) => b.id === selectedBlockId) || null;

  // Block Operations
  const handleAddBlock = useCallback(
    (type: EditorBlockType, defaultProps: Record<string, unknown>) => {
      const newId = `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newBlock: IEditorBlock = {
        id: newId,
        type,
        props: { ...defaultProps },
      };

      updateSchema((prev) => {
        // If there is an unsubscribe block at the bottom, insert right before it
        const unsubIndex = prev.blocks.findIndex((b) => b.type === 'unsubscribe');
        const newBlocks = [...prev.blocks];
        if (unsubIndex !== -1 && type !== 'unsubscribe') {
          newBlocks.splice(unsubIndex, 0, newBlock);
        } else {
          newBlocks.push(newBlock);
        }

        return {
          ...prev,
          blocks: newBlocks,
        };
      });

      setSelectedBlockId(newId);
      setInspectorTab('block');
    },
    [updateSchema]
  );

  const handleReorderBlocks = useCallback(
    (newBlocks: IEditorBlock[]) => {
      updateSchema((prev) => ({
        ...prev,
        blocks: newBlocks,
      }));
    },
    [updateSchema]
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      updateSchema((prev) => {
        const newBlocks = [...prev.blocks];
        const temp = newBlocks[index - 1];
        newBlocks[index - 1] = newBlocks[index];
        newBlocks[index] = temp;
        return { ...prev, blocks: newBlocks };
      });
    },
    [updateSchema]
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      updateSchema((prev) => {
        if (index >= prev.blocks.length - 1) return prev;
        const newBlocks = [...prev.blocks];
        const temp = newBlocks[index + 1];
        newBlocks[index + 1] = newBlocks[index];
        newBlocks[index] = temp;
        return { ...prev, blocks: newBlocks };
      });
    },
    [updateSchema]
  );

  const handleDuplicate = useCallback(
    (index: number) => {
      updateSchema((prev) => {
        const target = prev.blocks[index];
        if (!target) return prev;
        const newId = `${target.type}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const clone: IEditorBlock = {
          ...target,
          id: newId,
          props: JSON.parse(JSON.stringify(target.props || target.data || {})),
        };
        const newBlocks = [...prev.blocks];
        newBlocks.splice(index + 1, 0, clone);
        return { ...prev, blocks: newBlocks };
      });
    },
    [updateSchema]
  );

  const handleDelete = useCallback(
    (index: number) => {
      updateSchema((prev) => {
        const target = prev.blocks[index];
        if (target?.type === 'unsubscribe') return prev; // Cannot delete mandatory unsubscribe
        const newBlocks = prev.blocks.filter((_, i) => i !== index);
        return { ...prev, blocks: newBlocks };
      });
      setSelectedBlockId(null);
    },
    [updateSchema]
  );

  const handleUpdateBlockProps = useCallback(
    (newProps: Record<string, unknown>) => {
      if (!selectedBlockId) return;
      updateSchema(
        (prev) => {
          const newBlocks = prev.blocks.map((b) => {
            if (b.id === selectedBlockId) {
              return {
                ...b,
                props: newProps,
              };
            }
            return b;
          });
          return { ...prev, blocks: newBlocks };
        },
        { debounce: true }
      );
    },
    [selectedBlockId, updateSchema]
  );

  const handleUpdateSettings = useCallback(
    (newSettings: Partial<IEditorSchema['settings']>) => {
      updateSchema(
        (prev) => ({
          ...prev,
          settings: {
            ...prev.settings,
            ...newSettings,
          },
        }),
        { debounce: true }
      );
    },
    [updateSchema]
  );

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Undo: Cmd+Z
      if (cmdOrCtrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
        return;
      }

      // Redo: Cmd+Shift+Z or Cmd+Y
      if ((cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'z') || (cmdOrCtrl && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        if (canRedo) redo();
        return;
      }

      // Save: Cmd+S
      if (cmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        performSave();
        return;
      }

      // Delete block: Delete / Backspace (when not typing in form control)
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedBlockId &&
        selectedBlock?.type !== 'unsubscribe'
      ) {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
          e.preventDefault();
          const idx = schema.blocks.findIndex((b) => b.id === selectedBlockId);
          if (idx !== -1) handleDelete(idx);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo, performSave, selectedBlockId, selectedBlock, schema.blocks, handleDelete]);

  // Handle Live Preview Opening
  const handleOpenPreview = async () => {
    try {
      // Compile using unified email-renderer
      const rendered = compileEmail({
        schema,
        brand: {
          brandName: brand.brandName,
          senderName: brand.senderName,
          logoUrl: brand.logoUrl,
          primaryColor: brand.primaryColor,
          secondaryColor: brand.secondaryColor,
          footerAddress: brand.footerAddress,
        },
        recipient: {
          name: 'Jane Doe',
          firstName: 'Jane',
          email: 'jane@example.com',
          unsubscribeUrl: '#unsubscribe',
        },
        campaign: {
          subject,
          preheader,
        },
      });

      setPreviewHtml(rendered.html);
      setPreviewPlainText(rendered.text);
      setPreviewByteSize(new Blob([rendered.html]).size);
      setShowPreviewModal(true);
    } catch {
      // Fallback: render modal with empty states
      setShowPreviewModal(true);
    }
  };

  // Continue to Campaign Workspace / Review
  const handleContinue = async () => {
    await performSave();
    router.push(`/workspace?tab=campaigns&focus=${campaignId}`);
  };

  // Loading State
  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <h2 className="text-sm font-bold text-slate-800">
          Loading Email Editor...
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Restoring template design and brand assets
        </p>
      </div>
    );
  }

  // Meaningful Error State (Requirement 3: "show a meaningful error state rather than loading dummy content")
  if (loadError) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            Campaign Unavailable
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed mb-6">
            {loadError}
          </p>
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => loadCampaign()}
              className="w-full flex items-center justify-center space-x-1.5 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Loading Campaign</span>
            </button>
            <Link
              href="/templates"
              className="w-full flex items-center justify-center space-x-1.5 py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              <span>Pick a New Template</span>
            </Link>
            <Link
              href="/workspace"
              className="w-full flex items-center justify-center space-x-1.5 py-2 px-4 text-slate-500 hover:text-slate-800 text-xs font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Workspace</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 overflow-hidden font-sans">
      {/* Top Navigation */}
      <EditorTopNav
        campaignId={campaignId}
        campaignName={campaignName}
        onCampaignNameChange={setCampaignName}
        saveStatus={saveStatus}
        errorMessage={errorMessage}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        viewport={viewport}
        onViewportChange={setViewport}
        onOpenPreview={handleOpenPreview}
        onOpenTestEmail={() => setShowTestModal(true)}
        onManualSave={performSave}
        onContinue={handleContinue}
      />

      {/* Main Three-Panel Studio Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Content Blocks Library */}
        <BlockSidebar onAddBlock={handleAddBlock} />

        {/* Center Panel: Email Canvas */}
        <EmailCanvas
          schema={schema}
          viewport={viewport}
          selectedBlockId={selectedBlockId}
          brand={brand}
          onSelectBlock={(id) => {
            setSelectedBlockId(id);
            if (id) setInspectorTab('block');
          }}
          onReorderBlocks={handleReorderBlocks}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
        />

        {/* Right Panel: Properties Inspector & Global Settings */}
        <PropertiesInspector
          selectedBlock={selectedBlock}
          onUpdateBlockProps={handleUpdateBlockProps}
          onDeselect={() => setSelectedBlockId(null)}
          settings={schema.settings || {}}
          onUpdateSettings={handleUpdateSettings}
          campaignName={campaignName}
          onCampaignNameChange={setCampaignName}
          subject={subject}
          onSubjectChange={setSubject}
          preheader={preheader}
          onPreheaderChange={setPreheader}
          brand={brand}
          activeTab={inspectorTab}
          onTabChange={setInspectorTab}
        />
      </div>

      {/* Sandboxed Live HTML Preview Modal */}
      <PreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        html={previewHtml}
        plainText={previewPlainText}
        subject={subject}
        htmlByteSize={previewByteSize}
        onOpenTestEmail={() => setShowTestModal(true)}
      />

      {/* Test Email Modal */}
      <TestEmailModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        campaignId={campaignId}
        defaultEmail={brand.senderEmail || ''}
        onSavedBeforeTest={performSave}
      />
    </div>
  );
}

