'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StreamImportDialog } from '@/components/StreamImportDialog';
import { LogPanel } from '@/components/LogPanel';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StoreMeta = { shopUrl: string; lastUpdated?: string; productCount?: number; collectionCount?: number };

export default function StoresPage() {
  const [stores, setStores] = useState<StoreMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [error, setError] = useState('');
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamForce, setStreamForce] = useState<boolean>(false);
  const [activeLogs, setActiveLogs] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

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

  const addSingle = async () => {
    if (!urlInput.trim()) return; 
    setAdding(true); setError('');
    try {
      const res = await fetch('/api/stores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopUrl: urlInput.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add');
      setUrlInput('');
      await load();
    } catch (e: any) { setError(e.message); } finally { setAdding(false); }
  };

  const addBulk = async () => {
    const lines = bulkInput.split(/\n|,|;|\s+/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    setAdding(true); setError('');
    try {
      for (const line of lines) {
        const res = await fetch('/api/stores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopUrl: line }) });
        if (!res.ok) {
          const data = await res.json().catch(()=>({}));
          setError(prev => prev || data.error || `Failed adding ${line}`);
        }
      }
      setBulkInput('');
      await load();
    } finally { setAdding(false); }
  };

  const refresh = async (shopUrl: string) => {
    setStreamForce(true);
    setStreamUrl(shopUrl);
  };

  const refreshAll = async () => {
    if (stores.length === 0) return;
    setError('');
    setActiveLogs([]);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    // sequential streaming refresh to reuse log panel
    for (const s of stores) {
      setActiveLogs(prev => [...prev, `Refreshing ${s.shopUrl}...`]);
      try {
        const res = await fetch('/api/stores/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopUrl: s.shopUrl }) });
        if (!res.ok) {
          const data = await res.json().catch(()=>({}));
          setActiveLogs(prev => [...prev, `ERROR: ${s.shopUrl} -> ${data.error || res.status}`]);
        } else {
          setActiveLogs(prev => [...prev, `Done ${s.shopUrl}`]);
        }
      } catch (e: any) {
        setActiveLogs(prev => [...prev, `ERROR: ${s.shopUrl} -> ${e.message}`]);
      }
    }
    load();
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
    <div className="w-full max-w-[1100px] mx-auto px-4 space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl">Stores</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Manage target Shopify stores. Add multiple at once. Refresh to update cached products.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>Reload</Button>
            <Button size="sm" onClick={refreshAll} disabled={stores.length === 0}>Refresh All</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium">Add Single Store</label>
              <div className="flex items-center gap-2">
                <Input type="url" placeholder="https://your-store.myshopify.com" value={urlInput} onChange={e => setUrlInput(e.target.value)} />
                <Button onClick={addSingle} disabled={adding || !urlInput.trim()}>Add</Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Bulk Add (newline / comma / space separated)</label>
              <div className="flex items-start gap-2">
                <textarea className="flex-1 border rounded-md p-2 h-20 text-xs" placeholder="https://a.myshopify.com\nhttps://b.myshopify.com" value={bulkInput} onChange={e => setBulkInput(e.target.value)} />
                <Button variant="secondary" onClick={addBulk} disabled={adding || !bulkInput.trim()}>Add All</Button>
              </div>
            </div>
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <div className="overflow-hidden border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 px-3 font-medium">Store</th>
                  <th className="py-2 px-3 font-medium">Stats</th>
                  <th className="py-2 px-3 font-medium">Last Updated</th>
                  <th className="py-2 px-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((s, idx) => (
                  <tr key={`${s.shopUrl}-${idx}`} className="border-t">
                    <td className="py-2 px-3 max-w-[280px] truncate" title={s.shopUrl}>{s.shopUrl}</td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="secondary">{s.productCount ?? 0} products</Badge>
                        <Badge variant="outline">{s.collectionCount ?? 0} collections</Badge>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-xs whitespace-nowrap">{s.lastUpdated ? new Date(s.lastUpdated).toLocaleString() : '-'}</td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => refresh(s.shopUrl)}>Refresh</Button>
                        <Button size="sm" variant="destructive" onClick={() => remove(s.shopUrl)}>Remove</Button>
                        <Button size="sm" onClick={() => { window.location.href = '/app/console'; }}>Console</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {stores.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-xs text-muted-foreground">No stores yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {activeLogs.length > 0 && (
            <div className="pt-2 border-t">
              <LogPanel title="Batch Refresh Logs" logs={activeLogs} />
            </div>
          )}
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
