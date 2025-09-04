"use client";
import { useImageCacheStore } from '@/store/useImageCacheStore';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';

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
  const sorted = useMemo(() => Object.values(entries).sort((a,b)=> b.hits - a.hits), [entries]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-xs px-2 py-1 rounded-md border bg-muted hover:bg-muted/80" title="Image cache status">
          Cache: {count} imgs / {formatBytes(totalBytes)}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Image Cache</DialogTitle></DialogHeader>
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm text-muted-foreground">{count} images cached • {formatBytes(totalBytes)}</div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => clear()}>Clear All</Button>
          </div>
        </div>
        <div className="max-h-[50vh] overflow-y-auto border rounded">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2">Preview</th>
                <th className="text-left p-2">Src</th>
                <th className="text-left p-2">Size</th>
                <th className="text-left p-2">Hits</th>
                <th className="text-left p-2">Last Access</th>
                <th className="text-left p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(e => (
                <tr key={e.src} className="border-t">
                  <td className="p-2"><img src={e.blobUrl} className="h-10 w-10 object-cover rounded" /></td>
                  <td className="p-2 max-w-[260px] truncate" title={e.src}>{e.src}</td>
                  <td className="p-2 whitespace-nowrap">{formatBytes(e.size)}</td>
                  <td className="p-2">{e.hits}</td>
                  <td className="p-2 whitespace-nowrap">{new Date(e.lastAccess).toLocaleTimeString()}</td>
                  <td className="p-2"><Button size="sm" variant="ghost" onClick={() => remove(e.src)}>✕</Button></td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td className="p-4 text-muted-foreground" colSpan={6}>Empty</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
