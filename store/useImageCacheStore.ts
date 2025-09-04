import { create } from 'zustand';

export interface CachedImageEntry { src: string; blobUrl: string; size: number; lastAccess: number; hits: number; }

interface ImageCacheState {
  entries: Record<string, CachedImageEntry>;
  totalBytes: number;
  put: (src: string, blob: Blob) => string; // returns object URL
  get: (src: string) => string | null; // returns object URL
  clear: () => void;
  remove: (src: string) => void;
}

const MAX_CACHE_BYTES = 150 * 1024 * 1024; // 150MB soft cap

export const useImageCacheStore = create<ImageCacheState>((set, get) => ({
  entries: {},
  totalBytes: 0,
  put: (src, blob) => {
    const size = blob.size;
    const existing = get().entries[src];
    if (existing) return existing.blobUrl;
    const blobUrl = URL.createObjectURL(blob);
    let { entries, totalBytes } = get();
    entries = { ...entries, [src]: { src, blobUrl, size, lastAccess: Date.now(), hits: 1 } };
    totalBytes += size;
    // LRU eviction if over cap
    if (totalBytes > MAX_CACHE_BYTES) {
      const sorted = Object.values(entries).sort((a,b) => a.lastAccess - b.lastAccess);
      for (const e of sorted) {
        if (totalBytes <= MAX_CACHE_BYTES) break;
        URL.revokeObjectURL(e.blobUrl);
        delete entries[e.src];
        totalBytes -= e.size;
      }
    }
    set({ entries: { ...entries }, totalBytes });
    return blobUrl;
  },
  get: (src) => {
    const e = get().entries[src];
    if (!e) return null;
    e.lastAccess = Date.now();
    e.hits += 1;
    set({ entries: { ...get().entries } });
    return e.blobUrl;
  },
  clear: () => {
    const { entries } = get();
    Object.values(entries).forEach(e => URL.revokeObjectURL(e.blobUrl));
    set({ entries: {}, totalBytes: 0 });
  },
  remove: (src: string) => {
    const { entries, totalBytes } = get();
    const e = entries[src];
    if (!e) return;
    URL.revokeObjectURL(e.blobUrl);
    const { [src]: _, ...rest } = entries;
    set({ entries: rest, totalBytes: totalBytes - e.size });
  }
}));
