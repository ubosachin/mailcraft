'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  Filter,
  ChevronDown,
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
  | 'segments'
  | 'campaigns'
  | 'analytics'
  | 'workspace'
  | 'suppression'
  | 'email-auth';

interface NavItem {
  key: DashboardNavKey;
  href: string;
  label: string;
  shortLabel?: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { key: 'workspace', href: '/workspace', label: 'Workspace', icon: LayoutDashboard },
  { key: 'campaigns', href: '/campaigns', label: 'Campaigns', icon: Send },
  { key: 'contacts', href: '/contacts', label: 'Contacts', icon: Users },
  { key: 'templates', href: '/templates', label: 'Templates', icon: Layers },
  { key: 'analytics', href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

const TOOLS_NAV_ITEMS: NavItem[] = [
  {
    key: 'editor',
    href: '/editor',
    label: 'Visual Studio',
    shortLabel: 'Studio',
    description: 'Drag-and-drop email block designer',
    icon: SlidersHorizontal,
  },
  {
    key: 'connect',
    href: '/connect',
    label: 'Sender Accounts',
    shortLabel: 'Senders',
    description: 'Gmail OAuth, App Password, Brevo & SES',
    icon: Server,
  },
  {
    key: 'segments',
    href: '/contacts/segments',
    label: 'Audience Segments',
    shortLabel: 'Segments',
    description: 'Filter subscribers with saved rules',
    icon: Filter,
  },
  {
    key: 'suppression',
    href: '/suppression',
    label: 'Suppression List',
    shortLabel: 'Suppression',
    description: 'Unsubscribes & blocked addresses',
    icon: ShieldAlert,
  },
  {
    key: 'email-auth',
    href: '/settings/email-authentication',
    label: 'Domain Auth',
    shortLabel: 'Domain Auth',
    description: 'SPF, DKIM & DMARC verification checks',
    icon: ShieldCheck,
  },
];

export interface DashboardHeaderProps {
  activeNav: DashboardNavKey;
  variant?: 'dark' | 'light';
  rightActions?: React.ReactNode;
  userBadge?: React.ReactNode;
  showLogout?: boolean;
  /** Kept for backwards compatibility; tools/compliance links are always cleanly accessible in the More menu & mobile drawer. */
  showComplianceNav?: boolean;
}

export function DashboardHeader({
  activeNav,
  variant = 'light',
  rightActions,
  userBadge,
  showLogout = false,
}: DashboardHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isLight = variant === 'light';
  const activeToolItem = TOOLS_NAV_ITEMS.find((item) => item.key === activeNav);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setToolsDropdownOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setToolsDropdownOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      window.location.replace('/login');
    }
  };

  const navLinkClass = (isActive: boolean) =>
    isLight
      ? isActive
        ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/80'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
      : isActive
      ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30'
      : 'text-slate-400 hover:text-white hover:bg-slate-800/80';

  const mobileLinkClass = (isActive: boolean) =>
    isLight
      ? isActive
        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
        : 'text-slate-700 hover:bg-slate-100 border border-transparent'
      : isActive
      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
      : 'text-slate-300 hover:bg-slate-800/90 hover:text-white border border-transparent';

  return (
    <header className="sticky top-0 z-40 px-3 sm:px-5 lg:px-8 pt-2.5 sm:pt-3 pointer-events-none">
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-10 pointer-events-auto bg-slate-950/50 backdrop-blur-[2px]"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`relative z-20 pointer-events-auto max-w-7xl mx-auto px-3.5 sm:px-5 h-14 sm:h-16 flex items-center justify-between gap-3 rounded-2xl border backdrop-blur-md transition-colors ${
          isLight
            ? 'bg-white/95 border-slate-200/90 text-slate-900 shadow-lg shadow-slate-900/5'
            : 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-lg shadow-black/30'
        }`}
      >
        {/* Left: Brand + Desktop Navigation */}
        <div className="flex items-center gap-4 xl:gap-6 min-w-0">
          <Link href="/" className="group shrink-0">
            <MailCraftLogo size="md" variant={variant} />
          </Link>

          <nav className="hidden lg:flex items-center gap-1 text-[13px] font-medium" aria-label="Main navigation">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-all ${navLinkClass(
                    isActive
                  )}`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Tools & Compliance Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setToolsDropdownOpen((prev) => !prev)}
                aria-expanded={toolsDropdownOpen}
                aria-haspopup="menu"
                className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1 whitespace-nowrap transition-all ${navLinkClass(
                  Boolean(activeToolItem)
                )}`}
              >
                <span>{activeToolItem ? activeToolItem.shortLabel || activeToolItem.label : 'Tools'}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                    toolsDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {toolsDropdownOpen && (
                <div
                  role="menu"
                  className={`absolute left-0 mt-3 w-72 rounded-2xl border p-2 shadow-2xl z-50 ${
                    isLight
                      ? 'bg-white border-slate-200 shadow-slate-900/10'
                      : 'bg-slate-900 border-slate-800 shadow-black/60'
                  }`}
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Studio &amp; Compliance
                  </div>
                  <div className="space-y-0.5">
                    {TOOLS_NAV_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeNav === item.key;
                      return (
                        <Link
                          key={item.key}
                          href={item.href}
                          role="menuitem"
                          onClick={() => setToolsDropdownOpen(false)}
                          className={`flex items-start gap-2.5 px-2.5 py-2 rounded-xl transition ${
                            isLight
                              ? isActive
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'hover:bg-slate-50 text-slate-700'
                              : isActive
                              ? 'bg-indigo-500/15 text-indigo-300'
                              : 'hover:bg-slate-800 text-slate-200'
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              isActive
                                ? isLight
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-indigo-500 text-white'
                                : isLight
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold leading-tight">{item.label}</div>
                            {item.description && (
                              <div
                                className={`text-[11px] leading-snug mt-0.5 ${
                                  isLight ? 'text-slate-500' : 'text-slate-400'
                                }`}
                              >
                                {item.description}
                              </div>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Right: User Badge + Page Actions + Logout + Mobile Hamburger */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {userBadge && <div className="hidden xl:flex items-center">{userBadge}</div>}

          {rightActions && <div className="flex items-center gap-2">{rightActions}</div>}

          {showLogout && (
            <button
              type="button"
              onClick={handleLogout}
              className={`hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition ${
                isLight
                  ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                  : 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40'
              }`}
              title="Log Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Log Out</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className={`lg:hidden inline-flex items-center justify-center p-2 rounded-xl border transition ${
              isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
                : 'text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800'
            }`}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Curved Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          className={`lg:hidden relative z-20 pointer-events-auto mt-2 max-w-7xl mx-auto rounded-2xl border shadow-2xl max-h-[calc(100vh-5.5rem)] overflow-y-auto px-4 py-4 space-y-4 ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}
        >
          {userBadge && (
            <div
              className={`pb-3 border-b ${
                isLight ? 'border-slate-100' : 'border-slate-800'
              } xl:hidden`}
            >
              {userBadge}
            </div>
          )}

          <div>
            <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Workspace
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {[...PRIMARY_NAV_ITEMS, TOOLS_NAV_ITEMS[0]].map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.key;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition ${mobileLinkClass(
                      isActive
                    )}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Infrastructure &amp; Compliance
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {TOOLS_NAV_ITEMS.slice(1).map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.key;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition ${mobileLinkClass(
                      isActive
                    )}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {showLogout && (
            <div
              className={`pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}
            >
              <button
                type="button"
                onClick={handleLogout}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border transition ${
                  isLight
                    ? 'text-rose-600 bg-rose-50 hover:bg-rose-100 border-rose-200'
                    : 'text-rose-300 bg-rose-950/40 hover:bg-rose-950/70 border-rose-900/50'
                }`}
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
