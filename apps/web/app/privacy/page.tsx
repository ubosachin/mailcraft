import React from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Mail className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-900">MailCraft</span>
          </Link>
          <Link href="/" className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 flex-1 w-full text-slate-800 leading-relaxed text-sm space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Compliance & Trust</span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Privacy Policy</h1>
          <p className="text-xs text-slate-500 mt-1">Effective Date: November 9, 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">1. Account Security & Data Minimization</h2>
          <p>
            MailCraft protects user accounts using salted scrypt password hashing (or Google OAuth 2.0) and high-entropy 256-bit cryptographic session tokens stored solely as SHA-256 hashes in our database and provided to your browser in Secure, HttpOnly cookies. We collect only the essential profile information required to run your campaigns.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">2. Credential Protection (AES-256-GCM)</h2>
          <p>
            When you connect third-party sending providers (Google OAuth or Brevo API keys), your credentials are immediately encrypted at rest using AES-256-GCM authenticated encryption with unique initialization vectors and authentication tags. Plaintext credentials are never exposed to browser client-side code or written to unencrypted log files.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">3. Retention & Compliance</h2>
          <p>
            Your account workspace, brand profiles, templates, and analytics persist cleanly across sessions. To honor recipient privacy and legally mandated opt-outs under US CAN-SPAM, GDPR, and India DPDP regulations, suppression records (hashes of unsubscribed addresses) are retained persistently to ensure suppressed recipients are never messaged again.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">4. Open Tracking & Analytics Transparency</h2>
          <p>
            MailCraft rejects intrusive tracking practices. Because email client privacy protections (such as Apple Mail Privacy Protection and image proxies) make open rates unreliable and invade recipient privacy, open rate statistics are treated strictly as estimates. We focus on verifiable metrics: provider acceptance, delivery confirmations, link clicks, and explicit unsubscribes.
          </p>
        </section>
      </main>
    </div>
  );
}

