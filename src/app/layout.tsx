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
  title: 'Expy Studio AI - Visually Studio',
  description: 'Expy Studio AI - Visually Studio',
  openGraph: {
    title: 'Expy Studio AI - Visually Studio',
    description: 'Expy Studio AI - Visually Studio',
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
