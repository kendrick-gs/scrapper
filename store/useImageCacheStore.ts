import { create } from 'zustand';
import { idbPutImage, idbDeleteImage, idbClear, idbEnsureSizeLimit, idbUpdateAccess } from '@/lib/idbImageCache';

export interface CachedImageEntry { src: string; blobUrl: string; size: number; lastAccess: number; hits: number; }

interface ImageCacheState {
  entries: Record<string, CachedImageEntry>;
  totalBytes: number;
  put: (src: string, blob: Blob) => string; // returns object URL
  get: (src: string) => string | null; // returns object URL
  clear: () => void;
  remove: (src: string) => void;
  setExpiryMinutes: (mins: number | null) => void;
  expiryMinutes: number | null; // null = no auto expiry
}

export const MAX_CACHE_BYTES = 150 * 1024 * 1024; // 150MB soft cap

let lastSweep = 0;
export const useImageCacheStore = create<ImageCacheState>((set, get) => ({
  entries: {},
  totalBytes: 0,
  expiryMinutes: null,
  setExpiryMinutes: (mins) => set({ expiryMinutes: mins }),
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
    // Persist asynchronously (fire & forget)
    if (typeof window !== 'undefined') {
      idbPutImage(src, blob, Date.now()).then(() => idbEnsureSizeLimit(MAX_CACHE_BYTES)).catch(()=>{});
    }
    return blobUrl;
  },
  get: (src) => {
    const state = get();
    const e = state.entries[src];
    if (!e) return null;
    const now = Date.now();
    // periodic sweep for expiry (at most every 30s)
    if (state.expiryMinutes && now - lastSweep > 30000) {
      const cutoff = now - state.expiryMinutes * 60 * 1000;
      const mutated = { ...state.entries };
      let bytes = state.totalBytes;
      Object.values(state.entries).forEach(entry => {
        if (entry.lastAccess < cutoff) {
          URL.revokeObjectURL(entry.blobUrl);
          delete mutated[entry.src];
          bytes -= entry.size;
        }
      });
      lastSweep = now;
      set({ entries: mutated, totalBytes: bytes });
    }
    e.lastAccess = now;
    e.hits += 1;
    set({ entries: { ...get().entries } });
  if (typeof window !== 'undefined') { idbUpdateAccess(src); }
    return e.blobUrl;
  },
  clear: () => {
    const { entries } = get();
    Object.values(entries).forEach(e => URL.revokeObjectURL(e.blobUrl));
    set({ entries: {}, totalBytes: 0 });
  if (typeof window !== 'undefined') { idbClear(); }
  },
  remove: (src: string) => {
    const { entries, totalBytes } = get();
    const e = entries[src];
    if (!e) return;
    URL.revokeObjectURL(e.blobUrl);
    const { [src]: _, ...rest } = entries;
    set({ entries: rest, totalBytes: totalBytes - e.size });
  if (typeof window !== 'undefined') { idbDeleteImage(src); }
  }
}));
