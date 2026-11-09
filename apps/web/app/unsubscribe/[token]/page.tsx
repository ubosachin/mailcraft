'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Mail, CheckCircle2, ShieldAlert, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function UnsubscribePage() {
  const params = useParams();
  const token = params?.token as string;

  const [email, setEmail] = useState<string>('');
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (token) {
      try {
        const decoded = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
        const parsed = JSON.parse(decoded);
        if (parsed.e) setEmail(parsed.e);
      } catch {
        // Token could not be parsed on client, server will validate
      }
    }
  }, [token]);

  const handleConfirmUnsubscribe = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/v1/unsubscribe/${token}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process unsubscribe request');
      }
      setUnsubscribed(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
            <Mail className="w-6 h-6" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Unsubscribe Preferences
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Powered by MailCraft Consent Guardian
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-100 rounded-2xl border border-slate-200 sm:px-8">
          {unsubscribed ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">You are unsubscribed</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your email <span className="font-semibold text-slate-900">{email}</span> has been permanently recorded in our global suppression list. You will not receive any further marketing updates from this sender.
              </p>
              <div className="pt-4 border-t border-slate-100">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  <span>Return to MailCraft</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                <p>
                  Are you sure you want to stop receiving promotional emails at:
                </p>
                <p className="mt-1 font-mono font-bold text-slate-900 text-sm">
                  {email || 'your email address'}
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleConfirmUnsubscribe}
                disabled={loading}
                className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-75 text-white font-semibold text-sm rounded-lg shadow-sm shadow-rose-200 transition"
              >
                {loading ? 'Processing...' : 'Confirm Unsubscribe'}
              </button>

              <p className="text-[11px] text-center text-slate-400">
                In compliance with CAN-SPAM, GDPR, and Indian DPDP opt-out regulations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

