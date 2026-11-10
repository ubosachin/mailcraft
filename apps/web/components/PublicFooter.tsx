import React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { MailCraftLogo } from './MailCraftLogo';

export function PublicFooter() {
  return (
    <footer className="bg-white text-slate-600 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-10 border-b border-slate-200">
          <div className="md:col-span-5 space-y-4">
            <Link href="/" className="inline-flex">
              <MailCraftLogo size="md" variant="light" badge="Studio" />
            </Link>
            <p className="text-sm text-slate-600 leading-relaxed max-w-sm">
              Modern promotional email infrastructure built for speed, deliverability, and sender
              ownership. Design campaigns, segment opt-in contacts, and deliver with your own keys.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All Delivery Systems Operational</span>
            </div>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">
                Platform
              </h4>
              <ul className="space-y-2.5 text-slate-600">
                <li>
                  <Link href="/workspace" prefetch={false} className="hover:text-indigo-600 transition">
                    Workspace Studio
                  </Link>
                </li>
                <li>
                  <Link href="/templates" prefetch={false} className="hover:text-indigo-600 transition">
                    Email Templates
                  </Link>
                </li>
                <li>
                  <Link href="/campaigns" prefetch={false} className="hover:text-indigo-600 transition">
                    Campaign Manager
                  </Link>
                </li>
                <li>
                  <Link href="/analytics" prefetch={false} className="hover:text-indigo-600 transition">
                    Delivery Analytics
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">
                Sending Channels
              </h4>
              <ul className="space-y-2.5 text-slate-600">
                <li>
                  <Link href="/pricing" className="hover:text-indigo-600 transition">
                    Gmail OAuth (500/day)
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-indigo-600 transition">
                    Gmail App Password (1,500/day)
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-indigo-600 transition">
                    Brevo Bulk Delivery
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-indigo-600 transition">
                    Amazon SES Bulk
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-3 col-span-2 sm:col-span-1">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">
                Trust &amp; Legal
              </h4>
              <ul className="space-y-2.5 text-slate-600">
                <li>
                  <Link href="/privacy" className="hover:text-indigo-600 transition">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-indigo-600 transition">
                    Terms &amp; Anti-Spam
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-indigo-600 transition">
                    Contact Support
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="text-indigo-600 hover:text-indigo-700 transition font-semibold">
                    Create Free Account &rarr;
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} MailCraft. All rights reserved.</p>
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>AES-256-GCM Encrypted Vault &bull; CAN-SPAM / GDPR Ready</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

