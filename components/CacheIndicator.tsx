"use client";
import { useImageCacheStore } from '@/store/useImageCacheStore';
import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
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

  const totalDisplayBytes = persistBytes != null ? (totalBytes + persistBytes) : totalBytes;

  const [query, setQuery] = useState('');
  const visible = filtered.filter(e => !query || e.src.toLowerCase().includes(query.toLowerCase()));
  const hitTotal = filtered.reduce((a,b)=>a+b.hits,0);
  const avgSize = filtered.length ? (filtered.reduce((a,b)=>a+b.size,0)/filtered.length) : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="h-8 px-3 inline-flex items-center gap-2 rounded-md border bg-secondary/70 dark:bg-secondary/40 hover:bg-secondary/90 dark:hover:bg-secondary/50 text-xs font-medium transition-colors" title="Image cache status (memory + persistent)">
          <span>Cache</span>
          <span className="text-muted-foreground">{formatBytes(totalDisplayBytes)}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[min(100vw-3rem,78rem)] xl:max-w-7xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight flex items-center gap-3">
            Image Cache
            <Badge variant="secondary" className="text-[10px] font-medium">{memoryCount + (persistCount||0)} entries</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-8">
          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
            <MetricCard label="Memory" value={memoryCount} sub={formatBytes(totalBytes)} />
            <MetricCard label="Persistent" value={persistCount ?? '…'} sub={persistBytes != null ? formatBytes(persistBytes) : '…'} />
            <MetricCard label="Total Size" value={formatBytes(totalDisplayBytes)} sub="mem + idb" />
            <MetricCard label="Avg Size" value={avgSize ? formatBytes(avgSize) : '—'} sub="per entry" />
            <MetricCard label="Hits" value={hitTotal} sub="lifetime" />
            <div className="p-4 rounded-lg border bg-surface-2/40 dark:bg-surface-2/20 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground"><span>Auto Expire</span>
                <select
                  value={expiryMinutes ?? ''}
                  onChange={e => setExpiryMinutes(e.target.value === '' ? null : Number(e.target.value))}
                  className="h-7 rounded-md border bg-background px-2 text-xs"
                >
                  {expiryOptions.map(o => <option key={String(o.label)} value={o.value ?? ''}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex flex-wrap gap-2 mt-auto pt-1">
                <Button size="sm" variant="outline" onClick={() => clear()}>Clear All</Button>
              </div>
            </div>
          </div>

          {/* Table + Controls */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <input
                    placeholder="Search source URL..."
                    value={query}
                    onChange={e=>setQuery(e.target.value)}
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  />
                  {query && <Button size="sm" variant="ghost" onClick={()=>setQuery('')}>Clear</Button>}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => visible.slice(0,50).forEach(v => remove(v.src))} disabled={!visible.length}>Remove 50</Button>
                  <Button size="sm" variant="destructive" onClick={() => { if (confirm('Remove all visible cached images?')) visible.forEach(v => remove(v.src)); }}>Remove Visible</Button>
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-[11.5px]">
                  <thead className="bg-secondary/60 dark:bg-secondary/30">
                    <tr className="text-left">
                      <Th className="min-w-[320px]">Source</Th>
                      <Th className="w-24">Size</Th>
                      <Th className="w-16">Hits</Th>
                      <Th className="w-40">Last Access</Th>
                      <Th className="w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70 dark:divide-border/40">
                    {visible.map(e => (
                      <tr key={e.src} className="hover:bg-muted/50 transition-colors">
                        <td className="px-2 py-1.5 max-w-[560px] truncate font-mono" title={e.src}>{e.src}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap tabular-nums">{formatBytes(e.size)}</td>
                        <td className="px-2 py-1.5 tabular-nums">{e.hits}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap tabular-nums">{new Date(e.lastAccess).toLocaleString()}</td>
                        <td className="px-2 py-1.5">
                          <Button size="sm" variant="ghost" onClick={() => remove(e.src)} aria-label="Remove" className="h-7 w-7 p-0">✕</Button>
                        </td>
                      </tr>
                    ))}
                    {visible.length === 0 && (
                      <tr><td className="p-6 text-muted-foreground text-center" colSpan={5}>No cached images match your search.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: any; sub?: string }) {
  return (
    <div className="p-4 rounded-lg border bg-surface-2/40 dark:bg-surface-2/20 flex flex-col gap-1 shadow-xs">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-semibold text-base leading-tight">{value}</span>
      {sub && <span className="text-[11px] text-muted-foreground/80">{sub}</span>}
    </div>
  );
}

function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <th className={"px-2 py-2 font-medium text-xs text-muted-foreground uppercase tracking-wide " + className}>{children}</th>;
}
