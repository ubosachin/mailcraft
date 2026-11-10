import type { Metadata, Viewport } from 'next';
import { getAppUrl } from '@/lib/url';
import './globals.css';

const appUrl = getAppUrl();

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#4F46E5',
};

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: 'MailCraft – Promotional Email Marketing Platform',
  description:
    'Design stunning promotional emails, customize brand colors, connect your Gmail or bulk sending account, and launch high-converting campaigns.',
  keywords: ['email marketing', 'promotional email builder', 'gmail marketing', 'brevo bulk email'],
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  appleWebApp: {
    title: 'MailCraft',
  },
  openGraph: {
    type: 'website',
    url: appUrl,
    siteName: 'MailCraft',
    title: 'MailCraft – Promotional Email Marketing Platform',
    description:
      'Design stunning promotional emails, customize brand colors, connect your Gmail or bulk sending account, and launch high-converting campaigns.',
    images: [{ url: '/web-app-manifest-512x512.png', width: 512, height: 512, alt: 'MailCraft Logo' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col overflow-x-hidden selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

