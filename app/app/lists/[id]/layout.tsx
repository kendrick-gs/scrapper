import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Product List Details - Shopify Scraper',
  description: 'View and manage products in your scraped list.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function ListDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
