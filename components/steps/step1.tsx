'use client';

import { useState } from 'react';
import { useScrapeStore } from '@/store/useScrapeStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function Step1InputForm() {
  const [url, setUrl] = useState('');
  const setShopUrl = useScrapeStore((state) => state.setShopUrl);
  const startScraping = useScrapeStore((state) => state.startScraping);
  const [error, setError] = useState('');

  const handleFetch = async () => {
    setError('');
    if (!url) {
        setError('Please enter a Shopify store address.');
        return;
    }

    try {
        // A simple validation for the URL
        new URL(url);
        setShopUrl(url);
        startScraping();
    } catch (_) {
        setError('Please enter a valid URL (e.g., https://store.shopify.com).');
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Shopify Product Scraper</CardTitle>
        <CardDescription>Enter a Shopify store URL to fetch its products and collections.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex w-full items-center space-x-2">
          <Input
            type="url"
            placeholder="https://your-store.myshopify.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button onClick={handleFetch}>Fetch Products</Button>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </CardContent>
    </Card>
  );
}
