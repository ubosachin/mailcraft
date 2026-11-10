'use client';

import React, { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { PublicNavbar } from '@/components/PublicNavbar';
import { PublicFooter } from '@/components/PublicFooter';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/v1/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), message: message.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          (typeof json.error === 'string' ? json.error : json.message) ||
            'Failed to submit inquiry. Please try again.'
        );
      }

      setSubmitted(true);
      setMessage('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to send message right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicNavbar activePage="contact" />

      <main className="max-w-lg mx-auto px-4 py-16 flex-1 w-full flex flex-col justify-center">
        <div className="saas-card p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Contact & Support</h1>
            <p className="text-xs text-slate-500 mt-1">Have questions or feedback? We’re here to help.</p>
          </div>

          {submitted ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Message Received</h3>
              <p className="text-xs text-slate-600">
                Thank you for reaching out. Your message has been logged and our team will reply to{' '}
                <span className="font-semibold text-slate-800">{email}</span>.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-4 text-xs font-semibold text-indigo-600 hover:underline"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Your Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@brand.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Inquiry or Feedback</label>
                <textarea
                  rows={4}
                  required
                  minLength={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us about your campaign needs, provider integration questions, or feedback..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-lg shadow-sm transition flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Message</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
