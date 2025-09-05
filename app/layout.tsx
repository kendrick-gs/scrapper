import type { Metadata, Viewport } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';
import { ConfirmProvider } from '@/components/confirm-provider';

// Primary brand font
const montserrat = Montserrat({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
  weight: ['300','400','500','600','700']
});

export const metadata: Metadata = {
  title: 'Shopify Mate',
  description: 'Shopify product scraping & management console',
  manifest: '/manifest.webmanifest'
};

export const viewport: Viewport = {
  themeColor: '#0f172a'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className={`${montserrat.variable} font-sans antialiased`}>
        <ConfirmProvider>
          {children}
        </ConfirmProvider>
      </body>
    </html>
  );
}
