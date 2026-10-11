import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SiteHeader } from '@/components/site-header';
import { TimezoneCookie } from '@/components/timezone-cookie';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Tutor Market',
  description:
    'Book a lesson with a tutor and pay upfront. The money is held until the lesson happens (demo, Stripe test mode).',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-dvh flex-col">
        <Providers>
          <TimezoneCookie />
          <SiteHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
