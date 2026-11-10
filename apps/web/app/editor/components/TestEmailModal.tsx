'use client';

import React, { useState } from 'react';
import { X, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface TestEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  defaultEmail?: string;
  onSavedBeforeTest?: () => Promise<boolean>;
}

export function TestEmailModal({
  isOpen,
  onClose,
  campaignId,
  defaultEmail = '',
  onSavedBeforeTest,
}: TestEmailModalProps) {
  const [recipient, setRecipient] = useState(defaultEmail);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim()) return;

    setStatus('sending');
    setResultMessage(null);

    try {
      // Auto-save changes first so test email reflects latest edits
      if (onSavedBeforeTest) {
        await onSavedBeforeTest();
      }

      const res = await fetch(`/api/v1/campaigns/${campaignId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail: recipient.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch test email');
      }

      setStatus('success');
      setResultMessage(
        data.data?.message ||
          `Test email sent to ${recipient}. (ID: ${data.data?.messageId || data.data?.jobId || 'N/A'})`
      );
    } catch (err: unknown) {
      setStatus('error');
      setResultMessage(
        err instanceof Error ? err.message : 'Failed to send test email'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <Send className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Send Test Email
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSendTest} className="p-5 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Verify how your design renders in actual desktop and mobile email clients before launching your broadcast.
          </p>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Test Recipient Email
            </label>
            <input
              type="email"
              required
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="you@company.com"
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
            />
          </div>

          {status === 'success' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start space-x-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{resultMessage}</span>
            </div>
          )}

          {status === 'error' && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start space-x-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{resultMessage}</span>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={status === 'sending'}
              className="flex items-center space-x-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              {status === 'sending' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Test Now</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

