"use client";
import { useImageCacheStore } from '@/store/useImageCacheStore';
import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { idbStats } from '@/lib/idbImageCache';

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(bytes)/Math.log(k));
  return parseFloat((bytes/Math.pow(k,i)).toFixed(2)) + ' ' + sizes[i];
}

export function CacheIndicator() {
  const { entries, totalBytes, clear, remove, expiryMinutes, setExpiryMinutes } = useImageCacheStore();
  const memoryCount = Object.keys(entries).length;
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => Object.values(entries).sort((a,b)=> b.hits - a.hits), [entries]);
  const [persistCount, setPersistCount] = useState<number | null>(null);
  const [persistBytes, setPersistBytes] = useState<number | null>(null);

  // Load persistent stats when entries change or dialog opens.
  useEffect(() => {
    let active = true;
    idbStats().then(s => { if (active) { setPersistCount(s.count); setPersistBytes(s.totalBytes); } });
    return () => { active = false; };
  }, [memoryCount, open]);

  const expiryOptions: { label: string; value: number | null }[] = [
    { label: 'Off', value: null },
    { label: '30d', value: 30*24*60 },
    { label: '90d', value: 90*24*60 },
    { label: '180d', value: 180*24*60 },
    { label: '360d', value: 360*24*60 },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="h-8 px-3 inline-flex items-center gap-2 rounded-md border bg-muted hover:bg-muted/80 text-xs font-medium" title="Image cache status">
          <span>Cache</span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span className="rounded bg-background/40 px-1">M:{memoryCount}</span>
            <span className="rounded bg-background/40 px-1">P:{persistCount??'-'}</span>
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">Image Cache</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-4 rounded-lg border bg-muted/40 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Memory Images</span>
              <span className="font-medium text-base">{memoryCount}</span>
              <span className="text-xs text-muted-foreground">{formatBytes(totalBytes)}</span>
            </div>
            <div className="p-4 rounded-lg border bg-muted/40 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Persistent Images</span>
              <span className="font-medium text-base">{persistCount ?? '…'}</span>
              <span className="text-xs text-muted-foreground">{persistBytes != null ? formatBytes(persistBytes) : '…'}</span>
            </div>
            <div className="p-4 rounded-lg border bg-muted/40 flex flex-col gap-2 col-span-2 md:col-span-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Auto Expire</span>
                <select
                  value={expiryMinutes ?? ''}
                  onChange={e => setExpiryMinutes(e.target.value === '' ? null : Number(e.target.value))}
                  className="h-8 rounded-md border bg-background px-2 text-xs"
                >
                  {expiryOptions.map(o => <option key={String(o.label)} value={o.value ?? ''}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => clear()}>Clear All</Button>
              </div>
            </div>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="p-2 font-medium">Source</th>
                  <th className="p-2 w-20 font-medium">Size</th>
                  <th className="p-2 w-14 font-medium">Hits</th>
                  <th className="p-2 w-32 font-medium">Last Access</th>
                  <th className="p-2 w-14 font-medium">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.src} className="border-t hover:bg-muted/30">
                    <td className="p-2 max-w-[520px] truncate font-mono text-[11px]" title={e.src}>{e.src}</td>
                    <td className="p-2 whitespace-nowrap">{formatBytes(e.size)}</td>
                    <td className="p-2">{e.hits}</td>
                    <td className="p-2 whitespace-nowrap">{new Date(e.lastAccess).toLocaleTimeString()}</td>
                    <td className="p-2"><Button size="sm" variant="ghost" onClick={() => remove(e.src)} aria-label="Remove">✕</Button></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td className="p-4 text-muted-foreground" colSpan={5}>No images in memory cache.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
