import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Instrument_Sans, Newsreader } from 'next/font/google';
import './globals.css';

const newsreader = Newsreader({ subsets: ['latin'], variable: '--font-newsreader', display: 'swap', style: ['normal', 'italic'] });
const instrument = Instrument_Sans({ subsets: ['latin'], variable: '--font-instrument', display: 'swap' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-plex-mono', display: 'swap', weight: ['400', '500'] });

const siteUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'ThePrivate: private aviation, verified', template: '%s · ThePrivate' },
  description: 'Plan private flights with checked flight partners, compare clear offers, and find one-way offers and aircraft for sale. India and the UAE.',
  openGraph: { siteName: 'ThePrivate', type: 'website', locale: 'en_IN' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: '#f3f0e8', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${instrument.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh bg-paper text-ink">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
