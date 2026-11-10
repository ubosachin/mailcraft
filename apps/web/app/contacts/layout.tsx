import React from 'react';
import { requireServerAuth } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export default async function ContactsLayout({ children }: { children: React.ReactNode }) {
  await requireServerAuth('/contacts');
  return <>{children}</>;
}

