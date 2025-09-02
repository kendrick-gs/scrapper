import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Start Scraping - Shopify Scraper',
  description: 'Begin your Shopify product scraping journey with our advanced tools.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function StartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
