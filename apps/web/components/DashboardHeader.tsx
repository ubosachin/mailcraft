'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  SlidersHorizontal,
  Server,
  Users,
  Send,
  BarChart3,
  ShieldAlert,
  ShieldCheck,
  LayoutDashboard,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { MailCraftLogo } from './MailCraftLogo';

export type DashboardNavKey =
  | 'templates'
  | 'editor'
  | 'connect'
  | 'contacts'
  | 'campaigns'
  | 'analytics'
  | 'workspace'
  | 'suppression'
  | 'email-auth';

interface NavItem {
  key: DashboardNavKey;
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { key: 'templates', href: '/templates', label: 'Templates', icon: Layers },
  { key: 'editor', href: '/editor', label: 'Visual Editor', icon: SlidersHorizontal },
  { key: 'connect', href: '/connect', label: 'Sender Accounts', icon: Server },
  { key: 'contacts', href: '/contacts', label: 'Contacts', icon: Users },
  { key: 'campaigns', href: '/campaigns', label: 'Campaigns', icon: Send },
  { key: 'analytics', href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'workspace', href: '/workspace', label: 'Workspace', icon: LayoutDashboard },
];

const COMPLIANCE_NAV_ITEMS: NavItem[] = [
  { key: 'suppression', href: '/suppression', label: 'Suppression', icon: ShieldAlert },
  { key: 'email-auth', href: '/settings/email-authentication', label: 'Domain Auth', icon: ShieldCheck },
];

interface DashboardHeaderProps {
  activeNav: DashboardNavKey;
  rightActions?: React.ReactNode;
  showLogout?: boolean;
  showComplianceNav?: boolean;
}

export function DashboardHeader({
  activeNav,
  rightActions,
  showLogout = false,
  showComplianceNav = false,
}: DashboardHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = showComplianceNav
    ? [...PRIMARY_NAV_ITEMS, ...COMPLIANCE_NAV_ITEMS]
    : PRIMARY_NAV_ITEMS;

  const handleLogout = () => {
    fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'same-origin' }).then(() => {
      window.location.href = '/login';
    });
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-6 min-w-0">
          <Link href="/" className="group shrink-0">
            <MailCraftLogo size="md" variant="dark" />
          </Link>

          <nav className="hidden lg:flex items-center gap-4 xl:gap-5 text-sm font-medium">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`transition flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'text-indigo-400 border-b-2 border-indigo-500 pb-0.5'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 sm:gap-3">
            {showLogout && (
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Log Out</span>
              </button>
            )}
            {rightActions}
          </div>

          {/* Mobile compact primary action + menu button */}
          <div className="flex sm:hidden items-center gap-2">
            {rightActions}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-900 px-4 py-3 space-y-1.5 shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {[...PRIMARY_NAV_ITEMS, ...COMPLIANCE_NAV_ITEMS].map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {showLogout && (
            <div className="pt-2 mt-2 border-t border-slate-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-900/50 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

