import type { Metadata } from 'next';
import { Schibsted_Grotesk } from 'next/font/google';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { TimezoneCookie } from '@/components/timezone-cookie';
import { Providers } from './providers';
import './globals.css';

// One dense grotesque for headlines and text
const body = Schibsted_Grotesk({ subsets: ['latin'], variable: '--font-body' });

const title = 'Tutor Market: pay only for lessons that happen';
const description =
  'Book a lesson with a tutor and pay upfront. The money is held until the lesson happens, then the tutor is paid. Demo marketplace with Stripe Connect escrow, in test mode.';

export const metadata: Metadata = {
  // Link previews need absolute URLs; the preview image is app/opengraph-image.png
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Tutor Market',
  description,
  openGraph: { type: 'website', siteName: 'Tutor Market', title, description, url: '/' },
  twitter: { card: 'summary_large_image', title, description },
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
