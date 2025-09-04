'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StreamImportDialog } from '@/components/StreamImportDialog';
import { LogPanel } from '@/components/LogPanel';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Trash2, Terminal, RefreshCw, Loader2, Search, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

type StoreMeta = { shopUrl: string; lastUpdated?: string; productCount?: number; collectionCount?: number };

export default function StoresPage() {
  const [stores, setStores] = useState<StoreMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  // Unified multi-entry field (accepts single or multiple URLs)
  const [entryInput, setEntryInput] = useState('');
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

  const addEntries = async () => {
    const tokens = entryInput.split(/\n|,|;|\s+/).map(t => t.trim()).filter(Boolean);
    if (tokens.length === 0) return;
    setAdding(true); setError('');
    const seen = new Set<string>();
    try {
      for (const tok of tokens) {
        if (seen.has(tok)) continue; // dedupe in same submission
        seen.add(tok);
        const res = await fetch('/api/stores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopUrl: tok }) });
        if (!res.ok) {
          const data = await res.json().catch(()=>({}));
          setError(prev => prev || data.error || `Failed adding ${tok}`);
        }
      }
      setEntryInput('');
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
      <Card>
        <CardHeader className="space-y-4 pb-2">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-[1.35rem] font-semibold tracking-tight flex items-center gap-2">
                  Stores {stores.length > 0 && <Badge variant="secondary" className="bg-brand-green text-white hover:bg-brand-green-light ml-1">{stores.length}</Badge>}
                </CardTitle>
                <p className="text-xs text-muted-foreground max-w-prose">Manage target Shopify stores. Add one or many, then refresh to update cached datasets powering the console & lists.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <div className="relative flex-1 min-w-[200px]">
                  <Input placeholder="Filter stores..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8 h-9 text-sm" />
                  <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
                <Button variant="outline" size="sm" onClick={load} disabled={loading} className="h-9 px-3">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
                <Button size="sm" onClick={refreshAll} disabled={stores.length === 0} className="h-9 gap-1">
                  <RotateCcw className="h-4 w-4" /> Refresh All
                </Button>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground">Add Stores (newline / comma / space separated)</label>
                <div className="flex gap-2 items-start">
                  <textarea
                    className="flex-1 border rounded-md p-2 h-20 text-xs resize-none"
                    placeholder="https://a.myshopify.com, https://b.myshopify.com"
                    value={entryInput}
                    onChange={e => setEntryInput(e.target.value)}
                  />
                  <Button onClick={addEntries} disabled={adding || !entryInput.trim()} className="h-9 px-4 gap-1">
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>
                {error && <div className="text-red-500 text-xs">{error}</div>}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          <div className="overflow-hidden border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 px-3 font-medium w-[34%]">Store</th>
                  <th className="py-2 px-3 font-medium w-[14%]">Products</th>
                  <th className="py-2 px-3 font-medium w-[14%]">Collections</th>
                  <th className="py-2 px-3 font-medium w-[18%]">Last Updated</th>
                  <th className="py-2 px-3 font-medium w-[20%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && stores.length === 0 && Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-t animate-pulse">
                    <td className="py-3 px-3"><div className="h-4 w-52 bg-muted rounded" /></td>
                    <td className="py-3 px-3"><div className="h-4 w-20 bg-muted rounded" /></td>
                    <td className="py-3 px-3"><div className="h-4 w-20 bg-muted rounded" /></td>
                    <td className="py-3 px-3"><div className="h-4 w-24 bg-muted rounded" /></td>
                    <td className="py-3 px-3"><div className="h-4 w-40 bg-muted rounded" /></td>
                  </tr>
                ))}
                {filteredStores.map((s, idx) => (
                  <tr key={`${s.shopUrl}-${idx}`} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-3 max-w-[340px]">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-brand-green text-white flex items-center justify-center text-xs font-semibold uppercase">
                          {host(s.shopUrl).slice(0,1)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate text-sm text-foreground" title={s.shopUrl}>{host(s.shopUrl)}</div>
                          <div className="text-[11px] text-muted-foreground truncate" title={s.shopUrl}>{s.shopUrl}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-xs">
                      <Badge className="bg-brand-green text-white hover:bg-brand-green-light transition-colors text-[11px] font-medium px-2 py-0.5">{s.productCount ?? 0}</Badge>
                    </td>
                    <td className="py-2 px-3 text-xs">
                      <Badge variant="outline" className="text-[11px] font-medium px-2 py-0.5">{s.collectionCount ?? 0}</Badge>
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
                        <Button size="sm" className="h-8 px-3 bg-brand-green text-white hover:bg-brand-green-light" onClick={() => {
                          let hostVal = s.shopUrl;
                          try { hostVal = new URL(s.shopUrl).hostname; } catch {}
                          window.location.href = `/app/console?store=${encodeURIComponent(hostVal)}`;
                        }} title="Open console for this store">
                          <Terminal className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filteredStores.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-xs text-muted-foreground">No stores match filter.</td></tr>
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
