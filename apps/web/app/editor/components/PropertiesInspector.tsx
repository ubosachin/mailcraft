'use client';

import React from 'react';
import {
  Sliders,
  Settings,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ShieldCheck,
  X,
} from 'lucide-react';
import { IEditorBlock, IEditorSettings } from '@mailcraft/shared-types';
import { ImageUploadControl } from './ImageUploadControl';
import { GlobalSettingsPanel } from './GlobalSettingsPanel';

interface PropertiesInspectorProps {
  selectedBlock: IEditorBlock | null;
  onUpdateBlockProps: (props: Record<string, unknown>) => void;
  onDeselect: () => void;
  settings: IEditorSettings;
  onUpdateSettings: (settings: Partial<IEditorSettings>) => void;
  campaignName: string;
  onCampaignNameChange: (name: string) => void;
  subject: string;
  onSubjectChange: (subject: string) => void;
  preheader: string;
  onPreheaderChange: (preheader: string) => void;
  brand: {
    brandName?: string;
    logoUrl?: string;
    senderName?: string;
    senderEmail?: string;
    primaryColor?: string;
    secondaryColor?: string;
    footerAddress?: string;
  };
  activeTab: 'block' | 'settings';
  onTabChange: (tab: 'block' | 'settings') => void;
}

export function PropertiesInspector({
  selectedBlock,
  onUpdateBlockProps,
  onDeselect,
  settings,
  onUpdateSettings,
  campaignName,
  onCampaignNameChange,
  subject,
  onSubjectChange,
  preheader,
  onPreheaderChange,
  brand,
  activeTab,
  onTabChange,
}: PropertiesInspectorProps) {
  const blockProps = (selectedBlock?.props || selectedBlock?.data || {}) as Record<string, any>;

  const handlePropChange = (key: string, value: unknown) => {
    onUpdateBlockProps({
      ...blockProps,
      [key]: value,
    });
  };

  return (
    <aside className="w-80 border-l border-slate-200 bg-white flex flex-col h-[calc(100vh-64px)] overflow-hidden select-none">
      {/* Top Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/50 p-1">
        <button
          onClick={() => onTabChange('block')}
          disabled={!selectedBlock}
          className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md flex items-center justify-center space-x-1.5 transition-colors ${
            activeTab === 'block' && selectedBlock
              ? 'bg-white text-indigo-600 shadow-xs'
              : selectedBlock
              ? 'text-slate-600 hover:text-slate-900'
              : 'text-slate-300 cursor-not-allowed'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Block Properties</span>
        </button>

        <button
          onClick={() => onTabChange('settings')}
          className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md flex items-center justify-center space-x-1.5 transition-colors ${
            activeTab === 'settings' || !selectedBlock
              ? 'bg-white text-indigo-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Email Settings</span>
        </button>
      </div>

      {/* Inspector Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'block' && selectedBlock ? (
          <div className="space-y-4">
            {/* Header info */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {selectedBlock.type.replace('_', ' ')}
                </span>
                <span className="text-[10px] text-slate-400 block font-mono">
                  ID: {selectedBlock.id}
                </span>
              </div>
              <button
                onClick={onDeselect}
                className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"
                title="Deselect block"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Block Type Specific Controls */}
            {selectedBlock.type === 'heading' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Heading Text
                  </label>
                  <input
                    type="text"
                    value={blockProps.text || ''}
                    onChange={(e) => handlePropChange('text', e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Font Size ({blockProps.fontSize || 24}px)
                  </label>
                  <input
                    type="range"
                    min={18}
                    max={44}
                    value={blockProps.fontSize || 24}
                    onChange={(e) => handlePropChange('fontSize', Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Text Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={blockProps.color || '#1E293B'}
                      onChange={(e) => handlePropChange('color', e.target.value)}
                      className="w-8 h-8 rounded border border-slate-200 p-0.5"
                    />
                    <input
                      type="text"
                      value={blockProps.color || '#1E293B'}
                      onChange={(e) => handlePropChange('color', e.target.value)}
                      className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Alignment
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
                    {(['left', 'center', 'right'] as const).map((align) => (
                      <button
                        key={align}
                        type="button"
                        onClick={() => handlePropChange('alignment', align)}
                        className={`py-1 rounded text-xs flex justify-center items-center capitalize ${
                          (blockProps.alignment || 'center') === align
                            ? 'bg-white shadow-xs font-bold text-indigo-600'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                        {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                        {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedBlock.type === 'paragraph' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Paragraph Text
                  </label>
                  <textarea
                    rows={5}
                    value={blockProps.text || ''}
                    onChange={(e) => handlePropChange('text', e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 leading-relaxed"
                  />
                  <div className="text-[10px] text-slate-400 mt-1">
                    Supports &#123;&#123;first_name&#125;&#125;, &#123;&#123;brand_name&#125;&#125;, &#123;&#123;coupon_code&#125;&#125;
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Font Size ({blockProps.fontSize || 15}px)
                  </label>
                  <input
                    type="range"
                    min={12}
                    max={22}
                    value={blockProps.fontSize || 15}
                    onChange={(e) => handlePropChange('fontSize', Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Text Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={blockProps.color || '#475569'}
                      onChange={(e) => handlePropChange('color', e.target.value)}
                      className="w-8 h-8 rounded border border-slate-200 p-0.5"
                    />
                    <input
                      type="text"
                      value={blockProps.color || '#475569'}
                      onChange={(e) => handlePropChange('color', e.target.value)}
                      className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Alignment
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
                    {(['left', 'center', 'right'] as const).map((align) => (
                      <button
                        key={align}
                        type="button"
                        onClick={() => handlePropChange('alignment', align)}
                        className={`py-1 rounded text-xs flex justify-center items-center capitalize ${
                          (blockProps.alignment || 'center') === align
                            ? 'bg-white shadow-xs font-bold text-indigo-600'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                        {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                        {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedBlock.type === 'image' && (
              <div className="space-y-3">
                <ImageUploadControl
                  label="Image Source"
                  value={blockProps.src || blockProps.image || ''}
                  onChange={(url) => handlePropChange('src', url)}
                />

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Alt Description
                  </label>
                  <input
                    type="text"
                    value={blockProps.alt || ''}
                    onChange={(e) => handlePropChange('alt', e.target.value)}
                    placeholder="Product announcement photo"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Link Destination (Optional)
                  </label>
                  <input
                    type="url"
                    value={blockProps.url || ''}
                    onChange={(e) => handlePropChange('url', e.target.value)}
                    placeholder="https://yourbrand.com/sale"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Border Radius ({blockProps.borderRadius ?? 8}px)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={24}
                    value={blockProps.borderRadius ?? 8}
                    onChange={(e) => handlePropChange('borderRadius', Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>
            )}

            {selectedBlock.type === 'button' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Button Label
                  </label>
                  <input
                    type="text"
                    value={blockProps.text || ''}
                    onChange={(e) => handlePropChange('text', e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Target URL
                  </label>
                  <input
                    type="url"
                    value={blockProps.url || ''}
                    onChange={(e) => handlePropChange('url', e.target.value)}
                    placeholder="https://example.com/checkout"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Button Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={blockProps.backgroundColor || brand.primaryColor || '#4F46E5'}
                      onChange={(e) => handlePropChange('backgroundColor', e.target.value)}
                      className="w-8 h-8 rounded border border-slate-200 p-0.5"
                    />
                    <input
                      type="text"
                      value={blockProps.backgroundColor || brand.primaryColor || '#4F46E5'}
                      onChange={(e) => handlePropChange('backgroundColor', e.target.value)}
                      className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Text Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={blockProps.textColor || '#FFFFFF'}
                      onChange={(e) => handlePropChange('textColor', e.target.value)}
                      className="w-8 h-8 rounded border border-slate-200 p-0.5"
                    />
                    <input
                      type="text"
                      value={blockProps.textColor || '#FFFFFF'}
                      onChange={(e) => handlePropChange('textColor', e.target.value)}
                      className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Corner Radius ({blockProps.borderRadius ?? 8}px)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={28}
                    value={blockProps.borderRadius ?? 8}
                    onChange={(e) => handlePropChange('borderRadius', Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>
            )}

            {selectedBlock.type === 'logo' && (
              <div className="space-y-3">
                <ImageUploadControl
                  label="Logo Image"
                  value={blockProps.logoUrl || blockProps.src || ''}
                  onChange={(url) => handlePropChange('logoUrl', url)}
                  brandLogoUrl={brand.logoUrl}
                  onUseBrandLogo={() => {
                    if (brand.logoUrl) handlePropChange('logoUrl', brand.logoUrl);
                  }}
                />

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Logo Width ({blockProps.width || 140}px)
                  </label>
                  <input
                    type="range"
                    min={60}
                    max={280}
                    step={10}
                    value={blockProps.width || 140}
                    onChange={(e) => handlePropChange('width', Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Tagline (Optional)
                  </label>
                  <input
                    type="text"
                    value={blockProps.tagline || ''}
                    onChange={(e) => handlePropChange('tagline', e.target.value)}
                    placeholder="Artisan Crafted Lighting"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            )}

            {selectedBlock.type === 'hero' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Hero Title
                  </label>
                  <input
                    type="text"
                    value={blockProps.title || ''}
                    onChange={(e) => handlePropChange('title', e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Hero Subtitle
                  </label>
                  <textarea
                    rows={2}
                    value={blockProps.subtitle || ''}
                    onChange={(e) => handlePropChange('subtitle', e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>

                <ImageUploadControl
                  label="Hero Banner Image (Optional)"
                  value={blockProps.image || ''}
                  onChange={(url) => handlePropChange('image', url)}
                />

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    CTA Button Label
                  </label>
                  <input
                    type="text"
                    value={blockProps.ctaText || ''}
                    onChange={(e) => handlePropChange('ctaText', e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Hero Background Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={blockProps.backgroundColor || '#312E81'}
                      onChange={(e) => handlePropChange('backgroundColor', e.target.value)}
                      className="w-8 h-8 rounded border border-slate-200 p-0.5"
                    />
                    <input
                      type="text"
                      value={blockProps.backgroundColor || '#312E81'}
                      onChange={(e) => handlePropChange('backgroundColor', e.target.value)}
                      className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedBlock.type === 'coupon' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Coupon Code
                  </label>
                  <input
                    type="text"
                    value={blockProps.code || ''}
                    onChange={(e) => handlePropChange('code', e.target.value.toUpperCase())}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Discount Headline
                  </label>
                  <input
                    type="text"
                    value={blockProps.discount || ''}
                    onChange={(e) => handlePropChange('discount', e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Terms & Conditions
                  </label>
                  <input
                    type="text"
                    value={blockProps.description || ''}
                    onChange={(e) => handlePropChange('description', e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Badge Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={blockProps.backgroundColor || '#FEF3C7'}
                      onChange={(e) => handlePropChange('backgroundColor', e.target.value)}
                      className="w-8 h-8 rounded border border-slate-200 p-0.5"
                    />
                    <input
                      type="text"
                      value={blockProps.backgroundColor || '#FEF3C7'}
                      onChange={(e) => handlePropChange('backgroundColor', e.target.value)}
                      className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedBlock.type === 'product_card' && (
              <div className="space-y-3">
                <ImageUploadControl
                  label="Product Photo"
                  value={blockProps.image || ''}
                  onChange={(url) => handlePropChange('image', url)}
                />

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Product Title
                  </label>
                  <input
                    type="text"
                    value={blockProps.title || ''}
                    onChange={(e) => handlePropChange('title', e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Sale Price
                    </label>
                    <input
                      type="text"
                      value={blockProps.price || ''}
                      onChange={(e) => handlePropChange('price', e.target.value)}
                      placeholder="$89.00"
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Strike Price
                    </label>
                    <input
                      type="text"
                      value={blockProps.strikePrice || ''}
                      onChange={(e) => handlePropChange('strikePrice', e.target.value)}
                      placeholder="$120.00"
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Button URL
                  </label>
                  <input
                    type="url"
                    value={blockProps.buttonUrl || ''}
                    onChange={(e) => handlePropChange('buttonUrl', e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>
            )}

            {selectedBlock.type === 'spacer' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Height ({blockProps.height || 28}px)
                  </label>
                  <input
                    type="range"
                    min={8}
                    max={120}
                    value={blockProps.height || 28}
                    onChange={(e) => handlePropChange('height', Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>
            )}

            {selectedBlock.type === 'announcement_bar' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Announcement Copy
                  </label>
                  <input
                    type="text"
                    value={blockProps.text || ''}
                    onChange={(e) => handlePropChange('text', e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Link Text (Optional)
                  </label>
                  <input
                    type="text"
                    value={blockProps.linkText || ''}
                    onChange={(e) => handlePropChange('linkText', e.target.value)}
                    placeholder="Shop Now"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Background Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={blockProps.backgroundColor || brand.primaryColor || '#4F46E5'}
                      onChange={(e) => handlePropChange('backgroundColor', e.target.value)}
                      className="w-8 h-8 rounded border border-slate-200 p-0.5"
                    />
                    <input
                      type="text"
                      value={blockProps.backgroundColor || brand.primaryColor || '#4F46E5'}
                      onChange={(e) => handlePropChange('backgroundColor', e.target.value)}
                      className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedBlock.type === 'unsubscribe' && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 space-y-1.5">
                <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Mandatory Anti-Spam Compliance</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-700">
                  CAN-SPAM, GDPR, and CASL regulations legally require an accessible one-click opt-out in all marketing broadcasts. MailCraft prevents accidental removal to protect your sender reputation.
                </p>
              </div>
            )}
          </div>
        ) : (
          <GlobalSettingsPanel
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            campaignName={campaignName}
            onCampaignNameChange={onCampaignNameChange}
            subject={subject}
            onSubjectChange={onSubjectChange}
            preheader={preheader}
            onPreheaderChange={onPreheaderChange}
            brand={brand}
          />
        )}
      </div>
    </aside>
  );
}

