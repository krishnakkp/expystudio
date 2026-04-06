import type { Metadata } from 'next';
import { Red_Hat_Display } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';
import Providers from '@/components/providers';

const redHatDisplay = Red_Hat_Display({
  subsets: ['latin'],
  variable: '--font-red-hat-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'EventSnap AI',
  description: 'AI-powered event photos ready for LinkedIn in 60 seconds',
  openGraph: {
    title: 'EventSnap AI',
    description: 'AI-powered event photos ready for LinkedIn in 60 seconds',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={redHatDisplay.className}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
