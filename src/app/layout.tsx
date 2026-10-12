import type { Metadata } from 'next';
import { Schibsted_Grotesk } from 'next/font/google';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { TimezoneCookie } from '@/components/timezone-cookie';
import { Providers } from './providers';
import './globals.css';

// One dense grotesque for headlines and text
const body = Schibsted_Grotesk({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'Tutor Market',
  description:
    'Book a lesson with a tutor and pay upfront. The money is held until the lesson happens (demo, Stripe test mode).',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={body.variable}>
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
