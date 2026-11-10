import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import { getAppUrl } from '@/lib/url';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

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
    'Design high-converting promotional emails, manage permission-based audiences, connect Gmail, Brevo, or Amazon SES, and launch campaigns with real-time delivery analytics.',
  keywords: [
    'email marketing platform',
    'promotional email builder',
    'gmail smtp marketing',
    'brevo bulk email',
    'amazon ses campaigns',
  ],
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
      'Design high-converting promotional emails, manage permission-based audiences, and deliver through Gmail, Brevo, or Amazon SES.',
    images: [{ url: '/web-app-manifest-512x512.png', width: 512, height: 512, alt: 'MailCraft Logo' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen font-sans bg-slate-50 text-slate-900 flex flex-col overflow-x-hidden antialiased selection:bg-indigo-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
