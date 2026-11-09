'use client';

import React, { useState } from 'react';
import {
  X,
  Monitor,
  Smartphone,
  Maximize2,
  Send,
  Code,
  FileText,
  Eye,
} from 'lucide-react';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  html: string;
  plainText: string;
  subject: string;
  htmlByteSize?: number;
  onOpenTestEmail: () => void;
}

export function PreviewModal({
  isOpen,
  onClose,
  html,
  plainText,
  subject,
  htmlByteSize,
  onOpenTestEmail,
}: PreviewModalProps) {
  const [viewport, setViewport] = useState<'desktop' | 'mobile' | 'fluid'>('desktop');
  const [activeTab, setActiveTab] = useState<'preview' | 'text' | 'code'>('preview');

  if (!isOpen) return null;

  const getContainerWidth = () => {
    switch (viewport) {
      case 'desktop':
        return '640px';
      case 'mobile':
        return '375px';
      case 'fluid':
        return '100%';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="h-14 border-b border-slate-200 px-5 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                Email Preview: <span className="font-medium text-slate-600">{subject}</span>
              </h3>
            </div>
            {htmlByteSize && (
              <span className="text-[11px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                {(htmlByteSize / 1024).toFixed(1)} KB
              </span>
            )}
          </div>

          {/* Center: Viewport & Tab Toggles */}
          <div className="flex items-center space-x-2">
            {/* Tabs */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  activeTab === 'preview'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Visual Preview
              </button>
              <button
                onClick={() => setActiveTab('text')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  activeTab === 'text'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Plain Text
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  activeTab === 'code'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                HTML Code
              </button>
            </div>

            {/* Viewport (only for Visual Preview tab) */}
            {activeTab === 'preview' && (
              <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs">
                <button
                  onClick={() => setViewport('desktop')}
                  className={`p-1.5 rounded-md transition-all ${
                    viewport === 'desktop'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Desktop (640px)"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewport('mobile')}
                  className={`p-1.5 rounded-md transition-all ${
                    viewport === 'mobile'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Mobile (375px)"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewport('fluid')}
                  className={`p-1.5 rounded-md transition-all ${
                    viewport === 'fluid'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Fluid (100%)"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onClose();
                onOpenTestEmail();
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Test Email</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 bg-slate-100/70 p-4 flex justify-center items-center overflow-auto">
          {activeTab === 'preview' && (
            <div
              style={{ width: getContainerWidth() }}
              className="h-full bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden transition-all duration-200 flex flex-col"
            >
              <iframe
                srcDoc={html}
                title="Email Preview"
                className="w-full h-full border-0"
                sandbox="allow-same-origin"
              />
            </div>
          )}

          {activeTab === 'text' && (
            <div className="w-full max-w-2xl h-full bg-white rounded-xl shadow-md border border-slate-200 p-6 overflow-y-auto">
              <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                {plainText}
              </pre>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="w-full max-w-4xl h-full bg-slate-900 rounded-xl shadow-md border border-slate-800 p-4 overflow-y-auto">
              <pre className="text-xs font-mono text-indigo-300 whitespace-pre-wrap leading-relaxed">
                {html}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

