import React from 'react';
import { requireServerAuth } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export default async function ConnectLayout({ children }: { children: React.ReactNode }) {
  await requireServerAuth('/connect');
  return <>{children}</>;
}

