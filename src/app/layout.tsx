import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';
import Providers from '@/components/providers';

const roboto = Roboto({
  subsets: ['latin'],
  variable: '--font-roboto',
  weight: ['300', '400', '500', '700', '900'],
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
      <body className={roboto.className}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
