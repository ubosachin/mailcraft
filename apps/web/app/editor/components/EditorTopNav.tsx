'use client';

import React from 'react';
import Link from 'next/link';
import {
  Undo2,
  Redo2,
  Monitor,
  Smartphone,
  Eye,
  Send,
  Save,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
} from 'lucide-react';
import { MailCraftLogo } from '@/components/MailCraftLogo';
import { SaveStatus } from '../hooks/useAutosave';

interface EditorTopNavProps {
  campaignId: string;
  campaignName: string;
  onCampaignNameChange: (name: string) => void;
  saveStatus: SaveStatus;
  errorMessage?: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  viewport: 'desktop' | 'mobile';
  onViewportChange: (viewport: 'desktop' | 'mobile') => void;
  onOpenPreview: () => void;
  onOpenTestEmail: () => void;
  onManualSave: () => void;
  onContinue: () => void;
}

export function EditorTopNav({
  campaignName,
  onCampaignNameChange,
  saveStatus,
  errorMessage,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  viewport,
  onViewportChange,
  onOpenPreview,
  onOpenTestEmail,
  onManualSave,
  onContinue,
}: EditorTopNavProps) {
  return (
    <header className="h-16 border-b border-slate-200 bg-white px-4 flex items-center justify-between z-30 select-none shadow-sm">
      {/* Left: Brand & Campaign Title */}
      <div className="flex items-center space-x-3">
        <Link
          href="/workspace"
          className="flex items-center space-x-1.5 text-slate-500 hover:text-slate-800 text-xs font-semibold px-2 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
          title="Return to Workspace"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Exit</span>
        </Link>

        <div className="h-4 w-px bg-slate-200" />

        <MailCraftLogo size="sm" variant="light" />

        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        {/* Editable Campaign Name */}
        <div className="flex items-center">
          <input
            type="text"
            value={campaignName}
            onChange={(e) => onCampaignNameChange(e.target.value)}
            placeholder="Campaign Name..."
            aria-label="Campaign Name"
            className="text-xs sm:text-sm font-semibold text-slate-800 bg-transparent hover:bg-slate-50 focus:bg-white px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none max-w-[140px] sm:max-w-[220px] md:max-w-[320px] truncate transition-colors"
          />
        </div>

        {/* Save Status Indicator */}
        <div className="hidden lg:flex items-center text-xs">
          {saveStatus === 'saving' && (
            <span className="flex items-center text-indigo-600 font-medium space-x-1 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Saving...</span>
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center text-emerald-600 font-medium space-x-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>Saved</span>
            </span>
          )}
          {saveStatus === 'unsaved' && (
            <span className="flex items-center text-amber-700 font-medium space-x-1.5 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Unsaved changes</span>
            </span>
          )}
          {saveStatus === 'error' && (
            <button
              onClick={onManualSave}
              className="flex items-center text-rose-600 font-medium space-x-1 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 hover:bg-rose-100 transition-colors"
              title={errorMessage || 'Click to retry saving'}
            >
              <AlertCircle className="w-3 h-3 text-rose-500" />
              <span>Save failed (Retry)</span>
            </button>
          )}
        </div>
      </div>

      {/* Middle: Undo/Redo & Viewport Toggles */}
      <div className="flex items-center space-x-1 sm:space-x-2">
        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded-md text-xs transition-colors ${
              canUndo
                ? 'text-slate-700 hover:bg-white hover:shadow-xs'
                : 'text-slate-300 cursor-not-allowed'
            }`}
            title="Undo (Cmd+Z)"
            aria-label="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded-md text-xs transition-colors ${
              canRedo
                ? 'text-slate-700 hover:bg-white hover:shadow-xs'
                : 'text-slate-300 cursor-not-allowed'
            }`}
            title="Redo (Cmd+Shift+Z)"
            aria-label="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport Toggles */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
          <button
            onClick={() => onViewportChange('desktop')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewport === 'desktop'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Desktop View (600px)"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Desktop</span>
          </button>
          <button
            onClick={() => onViewportChange('mobile')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewport === 'mobile'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Mobile View (375px)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Mobile</span>
          </button>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-2">
        {/* Preview Modal Button */}
        <button
          onClick={onOpenPreview}
          className="flex items-center space-x-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          title="Preview HTML output"
        >
          <Eye className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Preview</span>
        </button>

        {/* Test Email Button */}
        <button
          onClick={onOpenTestEmail}
          className="flex items-center space-x-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          title="Send test email"
        >
          <Send className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Send Test</span>
        </button>

        {/* Manual Save Button */}
        <button
          onClick={onManualSave}
          disabled={saveStatus === 'saving'}
          className="flex items-center space-x-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          title="Save Changes (Cmd+S)"
        >
          {saveStatus === 'saving' ? (
            <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5 text-slate-500" />
          )}
          <span className="hidden sm:inline">Save</span>
        </button>

        {/* Continue / Next Button */}
        <button
          onClick={onContinue}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <span>Next</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}

