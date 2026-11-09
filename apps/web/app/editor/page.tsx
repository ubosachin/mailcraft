'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Smartphone,
  Monitor,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Send,
  Save,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Copy,
  Layers,
  Settings,
  Type,
  Image as ImageIcon,
  Tag,
  ShoppingBag,
  Ticket,
  Link2,
} from 'lucide-react';
import { TEMPLATE_CATALOG } from '@mailcraft/email-renderer';
import { IEditorSchema, IEditorBlock } from '@mailcraft/shared-types';

export default function EditorPage() {
  const router = useRouter();

  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState('New Promotional Campaign');
  const [subject, setSubject] = useState('Exclusive Offers Inside: Save on our latest arrivals');
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activeSideTab, setActiveSideTab] = useState<'blocks' | 'settings'>('blocks');

  // Brand tokens
  const [brand, setBrand] = useState({
    brandName: 'Aurora Studio',
    logoUrl: '',
    primaryColor: '#4F46E5',
    secondaryColor: '#10B981',
    footerAddress: '100 Market St, Suite 400, San Francisco, CA',
    senderEmail: 'hello@aurora.io',
  });

  // Editor Schema state
  const [schema, setSchema] = useState<IEditorSchema>(TEMPLATE_CATALOG[0].editorSchema);

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Test email modal state
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    async function loadWorkspaceAndCampaign() {
      try {
        // Fetch session & brand
        const meRes = await fetch('/api/v1/guest/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.data?.brand) {
            setBrand({
              brandName: meData.data.brand.brandName || 'Aurora Studio',
              logoUrl: meData.data.brand.logoUrl || '',
              primaryColor: meData.data.brand.primaryColor || '#4F46E5',
              secondaryColor: meData.data.brand.secondaryColor || '#10B981',
              footerAddress: meData.data.brand.footerAddress || '',
              senderEmail: meData.data.brand.senderEmail || '',
            });
            setTestEmail(meData.data.brand.senderEmail || '');
          }
        }

        // Fetch or create draft campaign
        const campRes = await fetch('/api/v1/campaigns');
        if (campRes.ok) {
          const campData = await campRes.json();
          if (campData.data && campData.data.length > 0) {
            const first = campData.data[0];
            const fullRes = await fetch(`/api/v1/campaigns/${first.id}`);
            if (fullRes.ok) {
              const fullData = await fullRes.json();
              setCampaignId(first.id);
              setCampaignName(fullData.data.campaignName);
              setSubject(fullData.data.subject);
              if (fullData.data.editorData?.blocks?.length) {
                setSchema(fullData.data.editorData);
              }
              return;
            }
          }
        }

        // Fallback: create initial draft campaign
        const brandRes = await fetch('/api/v1/brands/current');
        const brandData = await brandRes.json();
        if (brandData.data?.id) {
          const createRes = await fetch('/api/v1/campaigns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              brandId: brandData.data.id,
              campaignName: 'New Promotional Campaign',
              subject: 'Exclusive Offers Inside: Save on our latest arrivals',
              editorData: TEMPLATE_CATALOG[0].editorSchema,
            }),
          });
          const createData = await createRes.json();
          if (createData.data?.id) {
            setCampaignId(createData.data.id);
          }
        }
      } catch (err) {
        console.error('Failed to initialize editor:', err);
      }
    }

    loadWorkspaceAndCampaign();
  }, []);

  const handleSaveCampaign = async () => {
    if (!campaignId) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/v1/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName,
          subject,
          editorData: schema,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save campaign');

      setStatusMsg({ type: 'success', text: 'Campaign and editor schema saved!' });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Save failed',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!campaignId || !testEmail) return;
    setSendingTest(true);
    setStatusMsg(null);
    try {
      // First save changes
      await fetch(`/api/v1/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName,
          subject,
          editorData: schema,
        }),
      });

      const res = await fetch(`/api/v1/campaigns/${campaignId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch test email');

      setShowTestModal(false);
      setStatusMsg({
        type: 'success',
        text: `Test preview email queued for dispatch to ${testEmail}!`,
      });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Test dispatch failed',
      });
    } finally {
      setSendingTest(false);
    }
  };

  const handleAddBlock = (type: IEditorBlock['type']) => {
    const id = `b-${Date.now()}`;
    let newBlock: IEditorBlock;

    switch (type) {
      case 'heading':
        newBlock = { id, type, data: { text: 'Special Announcement', level: 'h2', align: 'left' } };
        break;
      case 'paragraph':
        newBlock = {
          id,
          type,
          data: {
            text: 'Discover our newest line of products engineered for performance and comfort.',
            align: 'left',
            fontSize: 15,
          },
        };
        break;
      case 'button':
        newBlock = {
          id,
          type,
          data: {
            text: 'Explore Collection',
            url: 'https://example.com',
            backgroundColor: brand.primaryColor,
            textColor: '#FFFFFF',
            borderRadius: 6,
            align: 'center',
          },
        };
        break;
      case 'coupon':
        newBlock = {
          id,
          type,
          data: {
            code: 'FLASH25',
            discount: '25% OFF STOREWIDE',
            description: 'Apply coupon code at checkout.',
            backgroundColor: '#FFFBEB',
            borderColor: '#F59E0B',
          },
        };
        break;
      case 'product_card':
        newBlock = {
          id,
          type,
          data: {
            title: 'Premium Studio Item',
            price: '$89.00',
            originalPrice: '$120.00',
            imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format&fit=crop&q=80',
            buttonText: 'Buy Now',
            url: 'https://example.com/product',
          },
        };
        break;
      case 'discount_badge':
        newBlock = {
          id,
          type,
          data: { text: '⚡ LIMITED TIME OFFER', backgroundColor: '#EF4444', textColor: '#FFFFFF' },
        };
        break;
      case 'hero':
        newBlock = {
          id,
          type,
          data: {
            title: 'Exclusive Weekend Sale',
            subtitle: 'Enjoy premium discounts across our entire catalog.',
            backgroundColor: '#F1F5F9',
            titleColor: '#0F172A',
            subtitleColor: '#475569',
          },
        };
        break;
      default:
        newBlock = { id, type, data: {} };
    }

    setSchema({
      ...schema,
      blocks: [...schema.blocks, newBlock],
    });
    setSelectedBlockId(id);
  };

  const handleRemoveBlock = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSchema({
      ...schema,
      blocks: schema.blocks.filter((b) => b.id !== id),
    });
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const newBlocks = [...schema.blocks];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newBlocks.length) return;

    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIdx];
    newBlocks[targetIdx] = temp;

    setSchema({ ...schema, blocks: newBlocks });
  };

  const handleUpdateBlockData = (field: string, value: unknown) => {
    if (!selectedBlockId) return;
    setSchema({
      ...schema,
      blocks: schema.blocks.map((b) => {
        if (b.id === selectedBlockId) {
          const current = (b.props || b.data || {}) as Record<string, unknown>;
          const updated = { ...current, [field]: value };
          return {
            ...b,
            props: updated,
            data: updated,
          };
        }
        return b;
      }),
    });
  };

  const selectedBlock = schema.blocks.find((b) => b.id === selectedBlockId);
  const selectedBlockData = (selectedBlock?.props || selectedBlock?.data || {}) as Record<string, unknown>;

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      {/* Top Editor Bar */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link
            href="/workspace"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Workspace</span>
          </Link>

          <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 text-sm font-bold text-white px-1 py-0.5 focus:outline-none transition max-w-[200px] sm:max-w-[300px]"
            />
          </div>
        </div>

        {/* Viewport Switcher */}
        <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-xs">
          <button
            onClick={() => setViewport('desktop')}
            className={`px-3 py-1 rounded-md font-semibold flex items-center gap-1.5 transition ${
              viewport === 'desktop' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Desktop</span>
          </button>
          <button
            onClick={() => setViewport('mobile')}
            className={`px-3 py-1 rounded-md font-semibold flex items-center gap-1.5 transition ${
              viewport === 'mobile' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mobile</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowTestModal(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Test</span>
          </button>

          <button
            type="button"
            onClick={handleSaveCampaign}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-sm transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Draft'}</span>
          </button>
        </div>
      </header>

      {/* Main 3-Panel Studio Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: Blocks Palette & Navigation */}
        <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Content Blocks</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 font-mono">
              {schema.blocks.length} active
            </span>
          </div>

          <div className="p-3 overflow-y-auto flex-1 space-y-1.5 text-xs">
            {[
              { type: 'hero', label: 'Hero Banner', icon: Sparkles },
              { type: 'heading', label: 'Heading', icon: Type },
              { type: 'paragraph', label: 'Text Paragraph', icon: Type },
              { type: 'coupon', label: 'Coupon Block', icon: Ticket },
              { type: 'button', label: 'CTA Button', icon: Link2 },
              { type: 'product_card', label: 'Product Card', icon: ShoppingBag },
              { type: 'discount_badge', label: 'Discount Badge', icon: Tag },
              { type: 'image', label: 'Promotional Image', icon: ImageIcon },
              { type: 'logo', label: 'Brand Logo', icon: Mail },
            ].map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => handleAddBlock(type as IEditorBlock['type'])}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 text-slate-200 transition text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition" />
                  <span>{label}</span>
                </div>
                <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition" />
              </button>
            ))}
          </div>

          {/* Preset Templates Shortcut */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/40">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Switch Theme</span>
            <select
              onChange={(e) => {
                const found = TEMPLATE_CATALOG.find((t) => t.slug === e.target.value);
                if (found) setSchema(found.editorSchema);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              {TEMPLATE_CATALOG.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </aside>

        {/* CENTER PANEL: Live Canvas Preview */}
        <main className="flex-1 bg-slate-900 overflow-y-auto p-4 sm:p-8 flex flex-col items-center">
          {/* Status Toast */}
          {statusMsg && (
            <div
              className={`mb-4 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                statusMsg.type === 'success' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}
            >
              {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Email Canvas Container */}
          <div
            style={{
              maxWidth: viewport === 'mobile' ? '375px' : '600px',
              backgroundColor: schema.settings.background || '#FFFFFF',
              fontFamily: schema.settings.fontFamily,
            }}
            className="w-full shadow-2xl rounded-xl overflow-hidden transition-all duration-300 text-slate-900 border border-slate-800"
          >
            {schema.blocks.map((block, index) => {
              const isSelected = selectedBlockId === block.id;
              const d = (block.props || block.data || {}) as Record<string, unknown>;

              return (
                <div
                  key={block.id}
                  onClick={() => setSelectedBlockId(block.id)}
                  className={`relative group cursor-pointer border-2 transition ${
                    isSelected ? 'border-indigo-500 bg-indigo-50/10' : 'border-transparent hover:border-indigo-300/50'
                  }`}
                >
                  {/* Floating Action Controls on Hover */}
                  <div className="absolute top-2 right-2 hidden group-hover:flex items-center gap-1 bg-slate-900/90 text-white rounded-md p-1 shadow-md z-20">
                    <button
                      type="button"
                      onClick={(e) => handleMoveBlock(index, 'up', e)}
                      disabled={index === 0}
                      className="p-1 hover:text-indigo-400 disabled:opacity-25"
                      title="Move Up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleMoveBlock(index, 'down', e)}
                      disabled={index === schema.blocks.length - 1}
                      className="p-1 hover:text-indigo-400 disabled:opacity-25"
                      title="Move Down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveBlock(block.id, e)}
                      className="p-1 hover:text-rose-400"
                      title="Delete Block"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Block Render */}
                  {block.type === 'logo' && (
                    <div className="p-6 text-center">
                      {brand.logoUrl || d.src ? (
                        <img
                          src={(brand.logoUrl || d.src) as string}
                          alt="Logo"
                          className="max-h-12 max-w-[160px] mx-auto object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span style={{ color: brand.primaryColor }} className="text-xl font-black">
                          {brand.brandName}
                        </span>
                      )}
                    </div>
                  )}

                  {block.type === 'hero' && (
                    <div
                      style={{ backgroundColor: (d.backgroundColor as string) || '#F8FAFC' }}
                      className="p-8 text-center"
                    >
                      <h1
                        style={{ color: (d.titleColor as string) || '#0F172A' }}
                        className="text-2xl sm:text-3xl font-extrabold tracking-tight"
                      >
                        {(d.title as string) || 'Hero Title'}
                      </h1>
                      {d.subtitle ? (
                        <p
                          style={{ color: (d.subtitleColor as string) || '#475569' }}
                          className="mt-2 text-sm sm:text-base leading-relaxed"
                        >
                          {d.subtitle as string}
                        </p>
                      ) : null}
                    </div>
                  )}

                  {block.type === 'heading' && (
                    <div className="px-6 py-3">
                      <h2 className="text-lg font-bold text-slate-900">
                        {(d.text as string) || 'Section Heading'}
                      </h2>
                    </div>
                  )}

                  {block.type === 'paragraph' && (
                    <div className="px-6 py-3 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                      {(d.text as string) || 'Write your promotional message here...'}
                    </div>
                  )}

                  {block.type === 'button' && (
                    <div className="px-6 py-4 text-center">
                      <span
                        style={{
                          backgroundColor: (d.backgroundColor as string) || brand.primaryColor,
                          color: (d.textColor as string) || '#FFFFFF',
                          borderRadius: `${Number(d.borderRadius) ?? 6}px`,
                        }}
                        className="inline-block px-6 py-3 text-sm font-bold shadow-sm"
                      >
                        {(d.text as string) || 'Click Here'}
                      </span>
                    </div>
                  )}

                  {block.type === 'coupon' && (
                    <div className="px-6 py-4">
                      <div
                        style={{
                          backgroundColor: (d.backgroundColor as string) || '#FFFBEB',
                          borderColor: (d.borderColor as string) || '#F59E0B',
                        }}
                        className="border-2 border-dashed rounded-xl p-5 text-center"
                      >
                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Special Discount</p>
                        <h3 className="text-xl font-extrabold text-slate-900 mt-1">{(d.discount as string) || '20% OFF'}</h3>
                        {d.description ? <p className="text-xs text-slate-500 mt-1">{d.description as string}</p> : null}
                        <div className="mt-3 inline-block bg-white border border-slate-300 px-4 py-1.5 rounded-lg font-mono font-bold text-sm tracking-widest text-slate-900">
                          {(d.code as string) || 'PROMO20'}
                        </div>
                      </div>
                    </div>
                  )}

                  {block.type === 'discount_badge' && (
                    <div className="px-6 py-2 text-center">
                      <span
                        style={{
                          backgroundColor: (d.backgroundColor as string) || '#EF4444',
                          color: (d.textColor as string) || '#FFFFFF',
                        }}
                        className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider"
                      >
                        {(d.text as string) || 'SALE'}
                      </span>
                    </div>
                  )}

                  {block.type === 'product_card' && (
                    <div className="px-6 py-4">
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white p-4 text-center shadow-sm">
                        {d.imageUrl ? (
                          <img
                            src={d.imageUrl as string}
                            alt="Product"
                            className="max-h-48 mx-auto rounded-lg mb-3 object-contain"
                          />
                        ) : null}
                        <h4 className="font-bold text-slate-900 text-sm">{(d.title as string) || 'Product Name'}</h4>
                        <div className="mt-1 flex items-center justify-center gap-2">
                          <span style={{ color: brand.primaryColor }} className="font-bold text-base">
                            {(d.price as string) || '$99.00'}
                          </span>
                          {d.originalPrice ? (
                            <span className="text-xs text-slate-400 line-through">
                              {d.originalPrice as string}
                            </span>
                          ) : null}
                        </div>
                        <span
                          style={{ backgroundColor: brand.primaryColor }}
                          className="mt-3 inline-block px-4 py-2 rounded-lg text-white text-xs font-bold"
                        >
                          {(d.buttonText as string) || 'Shop Item'}
                        </span>
                      </div>
                    </div>
                  )}

                  {block.type === 'footer' && (
                    <div className="px-6 pt-6 pb-2 text-center text-xs text-slate-500 border-t border-slate-100">
                      <p className="font-semibold text-slate-700">{brand.brandName}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{brand.footerAddress}</p>
                    </div>
                  )}

                  {block.type === 'unsubscribe' && (
                    <div className="px-6 pb-6 text-center text-[10px] text-slate-400">
                      <p>You received this promotional email from {brand.brandName}.</p>
                      <p className="mt-0.5 text-indigo-600 underline">Unsubscribe instantly</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>

        {/* RIGHT PANEL: Inspector Properties */}
        <aside className="w-80 bg-slate-950 border-l border-slate-800 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-800 flex items-center gap-2">
            <button
              onClick={() => setActiveSideTab('blocks')}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition ${
                activeSideTab === 'blocks' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Block Inspector
            </button>
            <button
              onClick={() => setActiveSideTab('settings')}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition ${
                activeSideTab === 'settings' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Email Canvas
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1 text-xs space-y-4">
            {activeSideTab === 'settings' ? (
              <div className="space-y-4">
                <h3 className="font-bold text-white text-sm">Global Canvas Settings</h3>

                <div>
                  <label className="block text-slate-400 uppercase text-[10px] font-bold mb-1">Canvas Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={schema.settings.background}
                      onChange={(e) =>
                        setSchema({
                          ...schema,
                          settings: { ...schema.settings, background: e.target.value },
                        })
                      }
                      className="w-8 h-8 rounded bg-transparent border border-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={schema.settings.background}
                      onChange={(e) =>
                        setSchema({
                          ...schema,
                          settings: { ...schema.settings, background: e.target.value },
                        })
                      }
                      className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 uppercase text-[10px] font-bold mb-1">Content Width (px)</label>
                  <input
                    type="number"
                    value={schema.settings.contentWidth}
                    onChange={(e) =>
                      setSchema({
                        ...schema,
                        settings: { ...schema.settings, contentWidth: Number(e.target.value) || 600 },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 uppercase text-[10px] font-bold mb-1">Subject Line</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                  />
                </div>
              </div>
            ) : selectedBlock ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-white uppercase text-[11px] tracking-wider">
                    {selectedBlock.type.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{selectedBlock.id}</span>
                </div>

                {/* Hero Fields */}
                {selectedBlock.type === 'hero' && (
                  <>
                    <div>
                      <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">Hero Title</label>
                      <input
                        type="text"
                        value={(selectedBlockData.title as string) || ''}
                        onChange={(e) => handleUpdateBlockData('title', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">Subtitle</label>
                      <textarea
                        rows={2}
                        value={(selectedBlockData.subtitle as string) || ''}
                        onChange={(e) => handleUpdateBlockData('subtitle', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">Background Color</label>
                      <input
                        type="text"
                        value={(selectedBlockData.backgroundColor as string) || ''}
                        onChange={(e) => handleUpdateBlockData('backgroundColor', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                      />
                    </div>
                  </>
                )}

                {/* Button Fields */}
                {selectedBlock.type === 'button' && (
                  <>
                    <div>
                      <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">Button Text</label>
                      <input
                        type="text"
                        value={(selectedBlockData.text as string) || ''}
                        onChange={(e) => handleUpdateBlockData('text', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">Destination URL</label>
                      <input
                        type="url"
                        value={(selectedBlockData.url as string) || ''}
                        onChange={(e) => handleUpdateBlockData('url', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">Background Color</label>
                      <input
                        type="text"
                        value={(selectedBlockData.backgroundColor as string) || ''}
                        onChange={(e) => handleUpdateBlockData('backgroundColor', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                      />
                    </div>
                  </>
                )}

                {/* Coupon Fields */}
                {selectedBlock.type === 'coupon' && (
                  <>
                    <div>
                      <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">Coupon Code</label>
                      <input
                        type="text"
                        value={(selectedBlockData.code as string) || ''}
                        onChange={(e) => handleUpdateBlockData('code', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">Discount Headline</label>
                      <input
                        type="text"
                        value={(selectedBlockData.discount as string) || ''}
                        onChange={(e) => handleUpdateBlockData('discount', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">Description</label>
                      <input
                        type="text"
                        value={(selectedBlockData.description as string) || ''}
                        onChange={(e) => handleUpdateBlockData('description', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200"
                      />
                    </div>
                  </>
                )}

                {/* Paragraph Fields */}
                {selectedBlock.type === 'paragraph' && (
                  <div>
                    <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">Text Content</label>
                    <textarea
                      rows={5}
                      value={(selectedBlockData.text as string) || ''}
                      onChange={(e) => handleUpdateBlockData('text', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 leading-relaxed"
                    />
                  </div>
                )}

                {/* Product Card Fields */}
                {selectedBlock.type === 'product_card' && (
                  <>
                    <div>
                      <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">Product Title</label>
                      <input
                        type="text"
                        value={(selectedBlockData.title as string) || ''}
                        onChange={(e) => handleUpdateBlockData('title', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">Sale Price</label>
                      <input
                        type="text"
                        value={(selectedBlockData.price as string) || ''}
                        onChange={(e) => handleUpdateBlockData('price', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">Original Price (Strike)</label>
                      <input
                        type="text"
                        value={(selectedBlockData.originalPrice as string) || ''}
                        onChange={(e) => handleUpdateBlockData('originalPrice', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">Product Image URL</label>
                      <input
                        type="url"
                        value={(selectedBlockData.imageUrl as string) || ''}
                        onChange={(e) => handleUpdateBlockData('imageUrl', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200"
                      />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500">
                <p>Click any block in the canvas to inspect and edit its properties.</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Send Test Preview Email</h3>
            <p className="text-xs text-slate-400">
              Dispatches an immediate sample of this campaign with your current brand styling to test email client rendering.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Recipient Email
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="you@brand.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={sendingTest || !testEmail}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition"
              >
                {sendingTest ? 'Sending...' : 'Send Test Now'}
              </button>
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg transition"
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

