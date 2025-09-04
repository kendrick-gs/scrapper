"use client";
import { useImageCacheStore, MAX_CACHE_BYTES } from '@/store/useImageCacheStore';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Progress } from './ui/progress';

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(bytes)/Math.log(k));
  return parseFloat((bytes/Math.pow(k,i)).toFixed(2)) + ' ' + sizes[i];
}

export function CacheIndicator() {
  const { entries, totalBytes, clear, remove } = useImageCacheStore();
  const count = Object.keys(entries).length;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const usagePct = Math.min(100, (totalBytes / MAX_CACHE_BYTES) * 100);
  const filtered = useMemo(() => {
    const all = Object.values(entries).sort((a,b)=> b.hits - a.hits);
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter(e => e.src.toLowerCase().includes(q));
  }, [entries, query]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-xs px-2 py-1 rounded-md border bg-muted hover:bg-muted/80" title="Image cache status">
          Cache: {count} imgs / {formatBytes(totalBytes)}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Image Cache</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 rounded-md border bg-muted/40">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Images</div>
              <div className="font-medium">{count}</div>
            </div>
            <div className="p-3 rounded-md border bg-muted/40">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Size Used</div>
              <div className="font-medium">{formatBytes(totalBytes)}</div>
            </div>
            <div className="p-3 rounded-md border bg-muted/40">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Limit</div>
              <div className="font-medium">{formatBytes(MAX_CACHE_BYTES)}</div>
            </div>
            <div className="p-3 rounded-md border bg-muted/40">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Usage</div>
              <div className="font-medium">{usagePct.toFixed(1)}%</div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter by src…" className="h-8 text-xs" />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => clear()}>Clear All</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Progress value={usagePct} className="h-2" />
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Cache usage</div>
          </div>
          <div className="max-h-[50vh] overflow-y-auto border rounded">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-2 w-14">Preview</th>
                  <th className="text-left p-2">Src</th>
                  <th className="text-left p-2 w-20">Size</th>
                  <th className="text-left p-2 w-16">Hits</th>
                  <th className="text-left p-2 w-28">Last Access</th>
                  <th className="text-left p-2 w-14">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.src} className="border-t hover:bg-muted/40">
                    <td className="p-2"><img src={e.blobUrl} className="h-10 w-10 object-cover rounded" /></td>
                    <td className="p-2 max-w-[420px] truncate font-mono" title={e.src}>{e.src}</td>
                    <td className="p-2 whitespace-nowrap">{formatBytes(e.size)}</td>
                    <td className="p-2">{e.hits}</td>
                    <td className="p-2 whitespace-nowrap">{new Date(e.lastAccess).toLocaleTimeString()}</td>
                    <td className="p-2"><Button size="sm" variant="ghost" onClick={() => remove(e.src)}>✕</Button></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td className="p-4 text-muted-foreground" colSpan={6}>No cached images match filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
