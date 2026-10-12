import type { Metadata } from 'next';
import { Fraunces, Instrument_Sans } from 'next/font/google';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { TimezoneCookie } from '@/components/timezone-cookie';
import { Providers } from './providers';
import './globals.css';

// Headlines: a warm, slightly soft serif; body text: a clean grotesque
const display = Fraunces({ subsets: ['latin'], axes: ['SOFT', 'opsz'], variable: '--font-display-face' });
const body = Instrument_Sans({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'Tutor Market',
  description:
    'Book a lesson with a tutor and pay upfront. The money is held until the lesson happens (demo, Stripe test mode).',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <Providers>
          <TimezoneCookie />
          <SiteHeader />
          {children}
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
