'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StreamImportDialog } from '@/components/StreamImportDialog';
import { LogPanel } from '@/components/LogPanel';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Trash2, Terminal, RefreshCw, Loader2, Search, Plus, ListPlus } from 'lucide-react';
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
  const [filter, setFilter] = useState('');

  const filteredStores = useMemo(() => {
    if (!filter.trim()) return stores;
    const f = filter.toLowerCase();
    return stores.filter(s => s.shopUrl.toLowerCase().includes(f));
  }, [stores, filter]);

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

  const host = (url: string) => {
    try { return new URL(url).hostname; } catch { return url; }
  };

  const relativeTime = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso).getTime();
    const diff = Date.now() - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 space-y-6">
      <Card className="border-t-4 border-brand-green">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand-green text-white text-xs font-semibold">S</span>
              Stores
              {stores.length > 0 && <Badge className="ml-1 bg-brand-green text-white hover:bg-brand-green">{stores.length}</Badge>}
            </CardTitle>
            <p className="text-xs text-muted-foreground max-w-prose">Manage target Shopify stores. Add individually or in bulk, then refresh to update local cached datasets used by the console & lists.</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <div className="relative">
                <Input placeholder="Filter stores..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8 h-8 text-xs" />
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
              <Button variant="outline" size="sm" onClick={load} disabled={loading} className="h-8 px-3">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
              <Button size="sm" onClick={refreshAll} disabled={stores.length === 0} className="h-8 gap-1 bg-brand-green hover:bg-brand-green-light text-white">
                <RotateCcw className="h-4 w-4" /> Refresh All
              </Button>
            </div>
          </div>
          <div className="w-full md:w-[420px] space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground">Add Single</label>
              <div className="flex items-center gap-2">
                <Input type="url" placeholder="https://your-store.myshopify.com" value={urlInput} onChange={e => setUrlInput(e.target.value)} className="text-xs" />
                <Button onClick={addSingle} disabled={adding || !urlInput.trim()} className="bg-brand-green hover:bg-brand-green-light text-white h-8 px-3 gap-1">
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground">Bulk Add</label>
              <div className="flex items-start gap-2">
                <textarea className="flex-1 border rounded-md p-2 h-24 text-xs resize-none" placeholder="https://a.myshopify.com\nhttps://b.myshopify.com" value={bulkInput} onChange={e => setBulkInput(e.target.value)} />
                <Button variant="secondary" onClick={addBulk} disabled={adding || !bulkInput.trim()} className="h-8 px-3 gap-1">
                  <ListPlus className="h-4 w-4" /> Add All
                </Button>
              </div>
            </div>
            {error && <div className="text-red-500 text-xs">{error}</div>}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="overflow-hidden border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 px-3 font-medium w-[34%]">Store</th>
                  <th className="py-2 px-3 font-medium w-[22%]">Stats</th>
                  <th className="py-2 px-3 font-medium w-[18%]">Last Updated</th>
                  <th className="py-2 px-3 font-medium w-[26%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && stores.length === 0 && Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-t animate-pulse">
                    <td className="py-3 px-3"><div className="h-4 w-52 bg-muted rounded" /></td>
                    <td className="py-3 px-3"><div className="h-4 w-32 bg-muted rounded" /></td>
                    <td className="py-3 px-3"><div className="h-4 w-24 bg-muted rounded" /></td>
                    <td className="py-3 px-3"><div className="h-4 w-40 bg-muted rounded" /></td>
                  </tr>
                ))}
                {filteredStores.map((s, idx) => (
                  <tr key={`${s.shopUrl}-${idx}`} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-3 max-w-[340px]">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-gradient-to-br from-brand-green to-brand-green-light text-white flex items-center justify-center text-xs font-semibold uppercase">
                          {host(s.shopUrl).slice(0,1)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate text-sm text-foreground" title={s.shopUrl}>{host(s.shopUrl)}</div>
                          <div className="text-[11px] text-muted-foreground truncate" title={s.shopUrl}>{s.shopUrl}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <Badge className="bg-brand-green text-white hover:bg-brand-green-light transition-colors">{s.productCount ?? 0} prod</Badge>
                        <Badge variant="outline">{s.collectionCount ?? 0} colls</Badge>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-xs whitespace-nowrap" title={s.lastUpdated || ''}>{relativeTime(s.lastUpdated)}</td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" className="h-8 px-3" onClick={() => refresh(s.shopUrl)} title="Refresh store">
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" className="h-8 px-3" onClick={() => remove(s.shopUrl)} title="Remove store">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" className="h-8 px-3 bg-brand-green text-white hover:bg-brand-green-light" onClick={() => { window.location.href = '/app/console'; }} title="Open console">
                          <Terminal className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filteredStores.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-xs text-muted-foreground">No stores match filter.</td></tr>
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
