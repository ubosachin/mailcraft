import React from 'react';
import Link from 'next/link';
import { Mail, CheckCircle2, Zap, Send, ShieldCheck, ArrowRight } from 'lucide-react';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <Mail className="w-5 h-5" />
            </div>
            <span className="text-lg font-black tracking-tight text-slate-900">
              Mail<span className="text-indigo-600">Craft</span>
            </span>
          </Link>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/templates" className="text-slate-600 hover:text-slate-900 transition">
              Templates
            </Link>
            <Link
              href="/workspace"
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              Enter Workspace
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Transparent Economics</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2">
            Free Studio. Pay Only For What You Send.
          </h1>
          <p className="text-sm text-slate-600 mt-3 leading-relaxed">
            MailCraft charges zero platform fees to create, customize, and manage email campaigns. You connect your own sending provider account directly, retaining full ownership of your sender reputation and provider billing.
          </p>
        </div>

        {/* Pricing Comparison Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Card 1: MailCraft Studio */}
          <div className="bg-white rounded-2xl border-2 border-indigo-600 p-8 shadow-lg relative flex flex-col justify-between">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-600 text-white text-[11px] font-bold rounded-full uppercase tracking-wider">
              MailCraft Platform
            </span>

            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Workspace Access</span>
              <h3 className="text-2xl font-black text-slate-900 mt-1">Guest Studio</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900">$0</span>
                <span className="text-xs text-slate-500">/ forever</span>
              </div>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                Design unlimited emails, use all 12 templates, upload logos, configure brand colors, and clean recipient lists.
              </p>

              <ul className="mt-6 space-y-3 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>No account or credit card required</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>All 12 production templates included</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Drag-and-drop block editor</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Deduplication & suppression engine</span>
                </li>
              </ul>
            </div>

            <Link
              href="/workspace"
              className="mt-8 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg text-center transition"
            >
              Start Creating Now →
            </Link>
          </div>

          {/* Card 2: Google Gmail Channel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold mb-3">
                <Send className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Personal / Low-Volume</span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">Google OAuth (Gmail)</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">Included</span>
                <span className="text-xs text-slate-500">with Google account</span>
              </div>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                Send from your existing Google Workspace or personal Gmail without DNS records.
              </p>

              <ul className="mt-6 space-y-3 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Up to 500 emails/day (personal)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Up to 2,000/day (Google Workspace)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Direct inbox delivery from your address</span>
                </li>
              </ul>
            </div>

            <p className="mt-8 text-[11px] text-slate-400 text-center">
              Subject to Google daily sending quotas.
            </p>
          </div>

          {/* Card 3: Brevo & Amazon SES */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-3">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Bulk Campaigns</span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">Brevo & Amazon SES</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">Direct</span>
                <span className="text-xs text-slate-500">provider rates</span>
              </div>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                Connect your Brevo API key or Amazon SES credentials to dispatch thousands of promotional blasts.
              </p>

              <ul className="mt-6 space-y-3 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Brevo: Free tier (300/day), then ~$25/mo</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>SES: Pay-as-you-go (~$0.10 per 1,000)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Asynchronous BullMQ worker queues</span>
                </li>
              </ul>
            </div>

            <p className="mt-8 text-[11px] text-slate-400 text-center">
              Billed directly by your chosen email provider.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

