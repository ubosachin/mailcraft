import React from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { requireServerAuth } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  await requireServerAuth('/analytics');
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardHeader activeNav="analytics" variant="light" showLogout />
      <div className="flex-1 w-full">{children}</div>
    </div>
  );
}

