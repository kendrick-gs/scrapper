import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found - Shopify Scraper',
  description: 'The page you are looking for could not be found.',
};

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-lg text-muted-foreground mb-8">The page you are looking for could not be found.</p>
      <Link href="/" className="text-primary hover:underline">
        Go back to home
      </Link>
    </div>
  );
}
