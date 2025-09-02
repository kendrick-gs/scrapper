import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Product Lists - Shopify Scraper',
  description: 'Manage and organize your scraped Shopify product lists.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function ListsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
