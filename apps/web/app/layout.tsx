import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MailCraft – No-Login Promotional Email Marketing Platform',
  description:
    'Design stunning promotional emails, customize brand colors, connect your sending account, and launch high-converting campaigns — without creating an account.',
  keywords: ['email marketing', 'no login email builder', 'promotional email', 'gmail marketing', 'brevo bulk email'],
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

