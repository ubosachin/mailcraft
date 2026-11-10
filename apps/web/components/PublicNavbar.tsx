'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';
import { MailCraftLogo } from './MailCraftLogo';

export type PublicNavKey = 'home' | 'templates' | 'pricing' | 'contact' | 'privacy' | 'terms';

interface PublicNavbarProps {
  activePage?: PublicNavKey;
  isAuthenticated?: boolean;
}

const PUBLIC_NAV_LINKS: Array<{
  key: PublicNavKey | 'channels';
  href: string;
  label: string;
  prefetch?: boolean;
}> = [
  { key: 'templates', href: '/templates', label: '12+ Templates', prefetch: false },
  { key: 'pricing', href: '/pricing', label: 'Pricing & Quotas' },
  { key: 'channels', href: '/#sending', label: 'Sending Channels' },
  { key: 'contact', href: '/contact', label: 'Contact' },
  { key: 'privacy', href: '/privacy', label: 'Privacy & Trust' },
];

export function PublicNavbar({
  activePage,
  isAuthenticated: initialAuth,
}: PublicNavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialAuth));

  useEffect(() => {
    if (typeof initialAuth === 'boolean') {
      setIsAuthenticated(initialAuth);
    }
  }, [initialAuth]);

  useEffect(() => {
    if (typeof initialAuth === 'boolean') return;
    fetch('/api/v1/auth/me', { cache: 'no-store', credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data?.authenticated) {
          setIsAuthenticated(true);
        }
      })
      .catch(() => {});
  }, [initialAuth]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-50 px-3 sm:px-5 lg:px-8 pt-2.5 sm:pt-3 pointer-events-none">
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-10 pointer-events-auto bg-slate-950/35 backdrop-blur-[2px]"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="relative z-20 pointer-events-auto max-w-7xl mx-auto px-3.5 sm:px-5 h-14 sm:h-16 flex items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-lg shadow-slate-900/5">
        <Link href="/" className="group shrink-0">
          <MailCraftLogo size="md" variant="light" badge="Studio" />
        </Link>

        <nav className="hidden md:flex items-center gap-1 lg:gap-1.5 text-sm font-medium" aria-label="Public navigation">
          {PUBLIC_NAV_LINKS.map((item) => {
            const isActive = activePage === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                prefetch={item.prefetch}
                aria-current={isActive ? 'page' : undefined}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {isAuthenticated ? (
            <>
              <Link
                href="/campaigns"
                prefetch={false}
                className="hidden sm:inline-flex items-center px-3 py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 rounded-xl hover:bg-slate-50 transition"
              >
                Campaigns
              </Link>
              <Link
                href="/workspace"
                prefetch={false}
                className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition whitespace-nowrap"
              >
                <span>Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center px-3 py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 rounded-xl hover:bg-slate-50 transition"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition whitespace-nowrap"
              >
                <span>Sign up</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Curved Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden relative z-20 pointer-events-auto mt-2 max-w-7xl mx-auto rounded-2xl border border-slate-200 bg-white px-4 py-4 space-y-3 shadow-2xl max-h-[calc(100vh-5.5rem)] overflow-y-auto">
          <div className="grid grid-cols-1 gap-1 text-sm font-medium">
            {PUBLIC_NAV_LINKS.map((item) => {
              const isActive = activePage === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  prefetch={item.prefetch}
                  onClick={() => setMobileOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`px-3 py-2.5 rounded-xl transition ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  href="/campaigns"
                  prefetch={false}
                  onClick={() => setMobileOpen(false)}
                  className="text-center px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition"
                >
                  Campaigns
                </Link>
                <Link
                  href="/workspace"
                  prefetch={false}
                  onClick={() => setMobileOpen(false)}
                  className="text-center px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
                >
                  Workspace
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="text-center px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="text-center px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
                >
                  Sign up Free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

