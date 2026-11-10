import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, Zap, Key, CheckCircle2 } from 'lucide-react';
import { MailCraftLogo } from './MailCraftLogo';

interface AuthSplitShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  badgeText?: string;
}

const HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: 'Zero-Trust AES-256-GCM Vault',
    desc: 'Provider keys, Gmail OAuth tokens, and App Passwords are encrypted at rest with unique IVs.',
  },
  {
    icon: Key,
    title: '4 Native Sending Channels',
    desc: 'Connect Gmail OAuth, Gmail App Password (1,500/day), Brevo v3 API, or Amazon SES.',
  },
  {
    icon: Zap,
    title: 'Instant Deliverability Guardrails',
    desc: 'Automatic SPF/DKIM checks, deduplication, and global CAN-SPAM suppression.',
  },
];

export function AuthSplitShell({
  title,
  subtitle,
  children,
  badgeText = 'Enterprise Email Infrastructure',
}: AuthSplitShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 grid lg:grid-cols-12">
      {/* Left Light-Theme Brand Showcase Panel */}
      <aside className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/70 text-slate-900 relative overflow-hidden flex-col justify-between p-10 xl:p-14 border-r border-slate-200">
        <div className="bg-saas-grid absolute inset-0 pointer-events-none opacity-75" />
        <div
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-indigo-200/40 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-violet-200/35 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="inline-flex">
            <MailCraftLogo size="md" variant="light" badge="Studio" />
          </Link>
          <span className="px-2.5 py-1 rounded-full bg-white border border-indigo-200/80 shadow-xs text-[11px] font-semibold text-indigo-700">
            {badgeText}
          </span>
        </div>

        <div className="relative z-10 space-y-8 my-12">
          <div className="space-y-3">
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-slate-950 leading-[1.15]">
              Build, authenticate, and deliver emails your customers actually open.
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed max-w-md">
              One unified workspace for responsive email design, permission-based audiences, and
              multi-provider campaign dispatch.
            </p>
          </div>

          <div className="space-y-3.5">
            {HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="saas-card p-4 bg-white/90 backdrop-blur-sm flex items-start gap-3.5"
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{item.title}</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium">Salted scrypt &amp; PKCE S256</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>99.9% Uptime</span>
          </div>
        </div>
      </aside>

      {/* Right Auth Form Column */}
      <main className="lg:col-span-7 flex flex-col justify-center py-10 px-4 sm:px-8 lg:px-14 bg-saas-grid relative">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center lg:text-left mb-6">
            <Link href="/" className="inline-flex lg:hidden items-center mb-5">
              <MailCraftLogo size="lg" variant="light" />
            </Link>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {title}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
          </div>

          <div className="saas-card py-7 px-6 sm:px-9">{children}</div>
        </div>
      </main>
    </div>
  );
}

