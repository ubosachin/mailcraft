import type { Metadata } from 'next';
import { getAppUrl } from '@/lib/url';
import './globals.css';

const appUrl = getAppUrl();

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: 'MailCraft – Promotional Email Marketing Platform',
  description:
    'Design stunning promotional emails, customize brand colors, connect your Gmail or bulk sending account, and launch high-converting campaigns.',
  keywords: ['email marketing', 'promotional email builder', 'gmail marketing', 'brevo bulk email'],
  openGraph: {
    type: 'website',
    url: appUrl,
    siteName: 'MailCraft',
    title: 'MailCraft – Promotional Email Marketing Platform',
    description:
      'Design stunning promotional emails, customize brand colors, connect your Gmail or bulk sending account, and launch high-converting campaigns.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

