'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StreamImportDialog } from '@/components/StreamImportDialog';

type StoreMeta = { shopUrl: string; lastUpdated?: string; productCount?: number; collectionCount?: number };

export default function StoresPage() {
  const [stores, setStores] = useState<StoreMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamForce, setStreamForce] = useState<boolean>(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stores');
      const data = await res.json();
      setStores(data.stores || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    setAdding(true); setError('');
    try {
      const res = await fetch('/api/stores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopUrl: url }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add');
      setUrl('');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  };

  const refresh = async (shopUrl: string) => {
    setStreamForce(true);
    setStreamUrl(shopUrl);
  };

  const refreshAll = async () => {
    if (stores.length === 0) return;
    setLoading(true);
    setError('');
    try {
      for (const s of stores) {
        const res = await fetch('/api/stores/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopUrl: s.shopUrl }) });
        // Continue even on failure; capture first error
        if (!res.ok && !error) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || 'One or more refreshes failed');
        }
      }
      await load();
    } finally {
      setLoading(false);
    }
  };

  const remove = async (shopUrl: string) => {
    if (!confirm('Remove this store and its cached data?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/stores', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopUrl }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[900px] mx-auto px-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Imported Stores</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>Reload</Button>
            <Button size="sm" onClick={refreshAll} disabled={loading || stores.length === 0}>{loading ? 'Refreshing…' : 'Refresh All'}</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex w-full items-center gap-2 mb-4">
            <Input type="url" placeholder="https://your-store.myshopify.com" value={url} onChange={e => setUrl(e.target.value)} />
            <Button onClick={add} disabled={adding || !url}>Add Store</Button>
          </div>
          {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-4">Store</th>
                  <th className="py-2 pr-4">Last Updated</th>
                  <th className="py-2 pr-4">Products</th>
                  <th className="py-2 pr-4">Collections</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((s, idx) => (
                  <tr key={`${s.shopUrl}-${idx}`} className="border-t">
                    <td className="py-2 pr-4 max-w-[320px] truncate" title={s.shopUrl}>{s.shopUrl}</td>
                    <td className="py-2 pr-4">{s.lastUpdated ? new Date(s.lastUpdated).toLocaleString() : '-'}</td>
                    <td className="py-2 pr-4">{s.productCount ?? '-'}</td>
                    <td className="py-2 pr-4">{s.collectionCount ?? '-'}</td>
                    <td className="py-2 pr-4">
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => refresh(s.shopUrl)} disabled={loading}>Refresh</Button>
                        <Button size="sm" variant="destructive" onClick={() => remove(s.shopUrl)} disabled={loading}>Remove</Button>
                        <a href="/app/console" className="text-primary text-sm underline">Open Console</a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <StreamImportDialog
        shopUrl={streamUrl || ''}
        open={!!streamUrl}
        title="Refreshing Store..."
        force={streamForce}
        onFinished={() => { setStreamUrl(null); setStreamForce(false); load(); }}
        onOpenChange={(o) => { if (!o) { setStreamUrl(null); setStreamForce(false); } }}
      />
    </div>
  );
}
