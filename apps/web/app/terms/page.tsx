import React from 'react';
import { PublicNavbar } from '@/components/PublicNavbar';
import { PublicFooter } from '@/components/PublicFooter';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicNavbar activePage="terms" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 flex-1 w-full text-slate-800 leading-relaxed text-sm space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Platform Policies</span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Terms of Service & Anti-Spam Agreement</h1>
          <p className="text-xs text-slate-500 mt-1">Effective Date: November 9, 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">1. Permission-Based Marketing Only</h2>
          <p>
            MailCraft is strictly designed for permission-based marketing communications. By using this service, you certify that all recipients have explicitly opted in to receive promotional content from your brand.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">2. Prohibited Contact Sources</h2>
          <p>
            You may not upload, import, or send to:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-700">
            <li>Purchased, rented, or leased email address databases.</li>
            <li>Scraped contact addresses harvested from websites, social directories, or public profiles.</li>
            <li>Third-party lead lists without direct, unambiguous recipient consent.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">3. Mandatory Sender Identification & Unsubscribes</h2>
          <p>
            Every promotional email sent through MailCraft must include accurate sender identification, a valid physical business mailing address, and a functional one-click unsubscribe mechanism. Attempts to remove or obscure unsubscribe links will result in immediate termination of sending privileges.
          </p>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

