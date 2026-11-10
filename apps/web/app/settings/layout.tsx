import React from 'react';
import { requireServerAuth } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireServerAuth('/settings/email-authentication');
  return <>{children}</>;
}

