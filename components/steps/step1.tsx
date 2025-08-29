'use client';

import { useState } from 'react';
import { useScrapeStore } from '@/store/useScrapeStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuthStore } from '@/store/useAuthStore';
// HistoryPanel removed from Start page as requested
import { StreamImportDialog } from '@/components/StreamImportDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Step1InputForm() {
  const [url, setUrl] = useState('');
  const setShopUrl = useScrapeStore((state) => state.setShopUrl);
  const startScraping = useScrapeStore((state) => state.startScraping);
  const [error, setError] = useState('');
  const user = useAuthStore((s) => s.user);
  const [busy, setBusy] = useState(false);
  const [showStream, setShowStream] = useState(false);
  const [streamForce, setStreamForce] = useState(true);
  const [cachePromptOpen, setCachePromptOpen] = useState(false);
  const [pendingUrl, setPendingUrl] = useState('');
  const [cacheMeta, setCacheMeta] = useState<{ productCount?: number; collectionCount?: number; lastUpdated?: string | null } | null>(null);

  const handleFetch = async () => {
    setError('');
    if (!url) {
        setError('Please enter a Shopify store address.');
        return;
    }

    try {
        // A simple validation for the URL
        new URL(url);
        setBusy(true);
        if (!user) {
          // Anonymous: stream limited import and send to temp list view
          setPendingUrl(url);
          setStreamForce(true);
          setShowStream(true);
          return;
        }
        // Logged-in: check cache existence for this user+URL
        const existsRes = await fetch(`/api/store-cache/exists?shopUrl=${encodeURIComponent(url)}`);
        const existsData = await existsRes.json();
        if (existsData.exists) {
          setPendingUrl(url);
          setCacheMeta({ productCount: existsData.productCount, collectionCount: existsData.collectionCount, lastUpdated: existsData.lastUpdated });
          setCachePromptOpen(true);
          setBusy(false);
          return;
        }
        // No cache: add store then stream import
        await fetch('/api/stores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopUrl: url }) });
        setStreamForce(true);
        setShowStream(true);
        // redirect handled on finish
    } catch (_) {
        setError('Please enter a valid URL (e.g., https://store.shopify.com).');
    } finally {
        setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-[900px] mx-auto">
      <Card>
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
          <Button onClick={handleFetch} disabled={busy}>{busy ? 'Importing...' : 'Add & Import'}</Button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          {!user && (
            <p className="text-xs text-muted-foreground mt-2">Tip: Login to fetch all pages and enable collection filtering, plus cache imports.</p>
          )}
        </CardContent>
      </Card>

      <StreamImportDialog
        shopUrl={pendingUrl || url}
        open={showStream}
        title="Importing Store..."
        force={streamForce}
        onFinished={() => { window.location.href = user ? '/app/console' : '/app/temp-list'; }}
        onOpenChange={setShowStream}
      />

      <Dialog open={cachePromptOpen} onOpenChange={setCachePromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use cached import or refresh?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            A cached import was found for this store{cacheMeta?.lastUpdated ? ` (last updated ${new Date(cacheMeta.lastUpdated).toLocaleString()})` : ''}.
            {` `}Cached counts: {cacheMeta?.productCount ?? 0} products, {cacheMeta?.collectionCount ?? 0} collections.
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={async () => {
                await fetch('/api/stores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopUrl: pendingUrl || url }) });
                window.location.href = '/app/console';
              }}
            >
              Use Cached
            </Button>
            <Button
              onClick={async () => {
                await fetch('/api/stores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopUrl: pendingUrl || url }) });
                setStreamForce(true);
                setCachePromptOpen(false);
                setShowStream(true);
              }}
            >
              Refresh Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
