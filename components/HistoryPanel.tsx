'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useScrapeStore } from '@/store/useScrapeStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type HistoryItem = {
  email: string;
  shopUrl: string;
  date: string; // ISO
  productCount: number;
  collectionCount: number;
};

export function HistoryPanel() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const setShopUrl = useScrapeStore((s) => s.setShopUrl);
  const startScraping = useScrapeStore((s) => s.startScraping);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      setItems(Array.isArray(data.history) ? data.history : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchHistory();
    } else {
      setItems([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => b.date.localeCompare(a.date));
  }, [items]);

  if (!user) return null;

  return (
    <Card className="w-full max-w-[900px] mx-auto mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Import History</CardTitle>
        <Button variant="outline" size="sm" onClick={fetchHistory} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <div className="text-sm text-muted-foreground">No previous imports yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Store</th>
                  <th className="py-2 pr-4">Products</th>
                  <th className="py-2 pr-4">Collections</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((h, idx) => (
                  <tr key={`${h.shopUrl}-${h.date}-${idx}`} className="border-t">
                    <td className="py-2 pr-4 whitespace-nowrap">{new Date(h.date).toLocaleString()}</td>
                    <td className="py-2 pr-4 max-w-[320px] truncate" title={h.shopUrl}>{h.shopUrl}</td>
                    <td className="py-2 pr-4">{h.productCount}</td>
                    <td className="py-2 pr-4">{h.collectionCount}</td>
                    <td className="py-2 pr-4">
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => { setShopUrl(h.shopUrl); startScraping(); }}>Load</Button>
                        <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(h.shopUrl)}>Copy URL</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

