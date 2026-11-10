import React from 'react';
import Link from 'next/link';
import { ArrowLeft, SearchX } from 'lucide-react';
import { MailCraftLogo } from '@/components/MailCraftLogo';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between px-4 py-8">
      <div className="max-w-4xl w-full mx-auto">
        <Link href="/" className="inline-flex">
          <MailCraftLogo size="md" variant="light" />
        </Link>
      </div>

      <div className="max-w-md w-full mx-auto text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
          <SearchX className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Page Not Found</h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          The page or campaign link you requested does not exist or may have been moved.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/workspace"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
          >
            Go to Workspace
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Home
          </Link>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">&copy; {new Date().getFullYear()} MailCraft</p>
    </div>
  );
}

