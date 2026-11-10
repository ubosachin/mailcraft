import React from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardHeader activeNav="analytics" variant="light" showLogout />
      <div className="flex-1 w-full">{children}</div>
    </div>
  );
}

