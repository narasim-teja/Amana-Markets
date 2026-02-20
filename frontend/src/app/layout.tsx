import type { Metadata } from 'next';
import { DM_Sans, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { MainNav } from '@/components/navigation/main-nav';
import { Toaster } from '@/components/ui/sonner';

/**
 * Premium Institutional Fonts
 */
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ADI Commodities Marketplace',
  description: 'Institutional-grade decentralized commodities trading platform on ADI Chain',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${dmSans.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <Providers>
          <MainNav />
          <main className="container mx-auto px-4 py-8">{children}</main>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
