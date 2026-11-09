'use client';

import React from 'react';
import { Mail, CheckCircle2, Sliders, Palette, Type, Layout } from 'lucide-react';
import { IEditorSettings } from '@mailcraft/shared-types';

interface GlobalSettingsPanelProps {
  settings: IEditorSettings;
  onUpdateSettings: (newSettings: Partial<IEditorSettings>) => void;
  campaignName: string;
  onCampaignNameChange: (name: string) => void;
  subject: string;
  onSubjectChange: (subject: string) => void;
  preheader: string;
  onPreheaderChange: (preheader: string) => void;
  brand: {
    brandName?: string;
    senderName?: string;
    senderEmail?: string;
    primaryColor?: string;
  };
}

const FONT_OPTIONS = [
  { label: 'System Default (San Francisco / Roboto)', value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" },
  { label: 'Helvetica / Arial', value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { label: 'Inter (Modern Sans)', value: "Inter, -apple-system, BlinkMacSystemFont, sans-serif" },
  { label: 'Georgia (Editorial Serif)', value: "Georgia, Cambria, 'Times New Roman', serif" },
  { label: 'Palatino (Classic Serif)', value: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" },
  { label: 'Trebuchet MS (Friendly)', value: "'Trebuchet MS', 'Lucida Sans Unicode', sans-serif" },
  { label: 'Source Sans Pro (Tech)', value: "'Source Sans Pro', 'Segoe UI', sans-serif" },
];

export function GlobalSettingsPanel({
  settings,
  onUpdateSettings,
  campaignName,
  onCampaignNameChange,
  subject,
  onSubjectChange,
  preheader,
  onPreheaderChange,
  brand,
}: GlobalSettingsPanelProps) {
  const subjectLength = subject.length;
  const isSubjectOptimal = subjectLength >= 30 && subjectLength <= 55;

  return (
    <div className="space-y-6">
      {/* 1. Campaign & Subject Section */}
      <div className="space-y-3">
        <div className="flex items-center space-x-1.5 pb-1 border-b border-slate-200">
          <Mail className="w-3.5 h-3.5 text-indigo-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Email Delivery Settings
          </h3>
        </div>

        {/* Campaign Name */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
            Campaign Name (Internal)
          </label>
          <input
            type="text"
            value={campaignName}
            onChange={(e) => onCampaignNameChange(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
          />
        </div>

        {/* Subject Line */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase">
              Subject Line
            </label>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                isSubjectOptimal
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {subjectLength}/60 chars ({isSubjectOptimal ? 'Optimal' : 'Aim 30-50'})
            </span>
          </div>
          <input
            type="text"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="Exclusive Drop: Save 20% this weekend..."
            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
          />
        </div>

        {/* Preheader Text */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
            Preheader (Inbox Snippet)
          </label>
          <input
            type="text"
            value={preheader}
            onChange={(e) => onPreheaderChange(e.target.value)}
            placeholder="Preview text shown right next to subject line..."
            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
          />
        </div>

        {/* Inbox Preview Snippet Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
            Inbox Preview Simulation
          </div>
          <div className="font-semibold text-slate-900 truncate">
            {brand.brandName || 'Your Brand'}
          </div>
          <div className="text-slate-800 font-medium truncate text-[11px]">
            {subject || 'No subject set'}
          </div>
          <div className="text-slate-500 text-[10px] truncate">
            {preheader || 'No preheader text...'}
          </div>
        </div>

        {/* Sender Email Status */}
        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-semibold">
              Sender Email
            </div>
            <div className="font-semibold text-slate-800 truncate max-w-[180px]">
              {brand.senderEmail || 'Not configured'}
            </div>
          </div>
          <span className="flex items-center space-x-1 text-emerald-600 text-[11px] font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Verified</span>
          </span>
        </div>
      </div>

      {/* 2. Global Styling Settings */}
      <div className="space-y-3 pt-3 border-t border-slate-200">
        <div className="flex items-center space-x-1.5 pb-1 border-b border-slate-200">
          <Palette className="w-3.5 h-3.5 text-indigo-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Layout & Appearance
          </h3>
        </div>

        {/* Content Width */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase">
              Content Width
            </label>
            <span className="text-xs font-mono text-slate-600">
              {settings.contentWidth || 600}px
            </span>
          </div>
          <input
            type="range"
            min={480}
            max={720}
            step={10}
            value={settings.contentWidth || 600}
            onChange={(e) =>
              onUpdateSettings({ contentWidth: Number(e.target.value) })
            }
            className="w-full accent-indigo-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>480px</span>
            <span className="font-semibold text-slate-600">600px (Standard)</span>
            <span>720px</span>
          </div>
        </div>

        {/* Outer Background Color */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
            Outer Background Color
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={settings.background || settings.backgroundColor || '#F8F9FA'}
              onChange={(e) =>
                onUpdateSettings({
                  background: e.target.value,
                  backgroundColor: e.target.value,
                })
              }
              className="w-8 h-8 rounded border border-slate-200 p-0.5 cursor-pointer"
            />
            <input
              type="text"
              value={settings.background || settings.backgroundColor || '#F8F9FA'}
              onChange={(e) =>
                onUpdateSettings({
                  background: e.target.value,
                  backgroundColor: e.target.value,
                })
              }
              className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
            />
          </div>
        </div>

        {/* Font Family */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
            Default Typography
          </label>
          <select
            value={settings.fontFamily || FONT_OPTIONS[0].value}
            onChange={(e) => onUpdateSettings({ fontFamily: e.target.value })}
            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.label} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Default Text Color */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
            Default Text Color
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={settings.textColor || '#1E293B'}
              onChange={(e) => onUpdateSettings({ textColor: e.target.value })}
              className="w-8 h-8 rounded border border-slate-200 p-0.5 cursor-pointer"
            />
            <input
              type="text"
              value={settings.textColor || '#1E293B'}
              onChange={(e) => onUpdateSettings({ textColor: e.target.value })}
              className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

