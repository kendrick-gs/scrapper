// Lightweight IndexedDB cache utilities for console data
// Falls back to localStorage if IndexedDB unavailable or fails

export interface ProductIndexEntry {
  id: any;
  updated_at?: string;
  hash?: string; // fallback lightweight hash if no updated_at
}

export interface ConsoleCachePayload {
  products: any[]; // full product objects
  productIndex: ProductIndexEntry[]; // lightweight index for fast diff
  stores: any[];
  collections: any[];
  updatedAt: number; // epoch ms
  user: string; // user identifier (email)
  schemaVersion: number; // bump if structure changes
  // v3: persist user data presets locally for instant hydration & offline editing
  dataPresets?: { vendors: string[]; productTypes: string[]; tags: string[] };
}

const DB_NAME = 'shopifyMateCache';
const DB_VERSION = 3; // v3 adds dataPresets field
const STORE_NAME = 'consoleData';
const LOCAL_KEY_BASE = 'sm_console_cache_v3';

function localKeyForUser(user: string) {
  return `${LOCAL_KEY_BASE}::${user || 'anon'}`;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

export async function getConsoleCache(user: string): Promise<ConsoleCachePayload | null> {
  try {
    if (typeof indexedDB === 'undefined') throw new Error('no idb');
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(`console::${user || 'anon'}`);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        let result: ConsoleCachePayload | null = (req.result as any) || null;
        if (result) {
          // Migration: add dataPresets if missing
            if (!result.dataPresets) {
              result = { ...result, dataPresets: { vendors: [], productTypes: [], tags: [] }, schemaVersion: Math.max(result.schemaVersion || 2, 3) };
              // fire & forget write-back with upgraded schema
              setConsoleCache(result).catch(()=>{});
            }
        }
        resolve(result);
      };
    });
  } catch {
    try {
      const raw = localStorage.getItem(localKeyForUser(user));
      if (!raw) return null;
      let parsed: ConsoleCachePayload | null = JSON.parse(raw);
      if (parsed && !parsed.dataPresets) {
        parsed = { ...parsed, dataPresets: { vendors: [], productTypes: [], tags: [] }, schemaVersion: Math.max(parsed.schemaVersion || 2, 3) };
        setConsoleCache(parsed).catch(()=>{});
      }
      return parsed;
    } catch {
      return null;
    }
  }
}

export async function setConsoleCache(payload: ConsoleCachePayload): Promise<void> {
  try {
    if (typeof indexedDB === 'undefined') throw new Error('no idb');
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(payload, `console::${payload.user || 'anon'}`);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try { localStorage.setItem(localKeyForUser(payload.user), JSON.stringify(payload)); } catch {}
  }
}

// Write-through helper for updating only dataPresets without touching other cached data
export async function updateCachedDataPresets(user: string, dataPresets: { vendors: string[]; productTypes: string[]; tags: string[] }) {
  try {
    const existing = await getConsoleCache(user);
    if (existing) {
      const next: ConsoleCachePayload = { ...existing, dataPresets, schemaVersion: 3 };
      await setConsoleCache(next);
    } else {
      // Create minimal payload if nothing cached yet (avoid losing presets for future hydration)
      const minimal: ConsoleCachePayload = {
        products: [],
        productIndex: [],
        stores: [],
        collections: [],
        updatedAt: Date.now(),
        user: user,
        schemaVersion: 3,
        dataPresets,
      };
      await setConsoleCache(minimal);
    }
  } catch {/* ignore */}
}

// Build lightweight product index (id + updated_at or hash fallback)
export function buildProductIndex(products: any[]): ProductIndexEntry[] {
  return products.map(p => ({
    id: p.id,
    updated_at: p.updated_at,
    hash: !p.updated_at ? fastHash(p) : undefined
  }));
}

// Very small non-cryptographic hash for fallback (stringify limited fields)
function fastHash(obj: any): string {
  try {
    const str = JSON.stringify({ id: obj.id, title: obj.title, updated_at: obj.updated_at, v: obj.variants?.length });
  let h = 0, i = 0; const len = str.length;
    while (i < len) { h = (h << 5) - h + str.charCodeAt(i++) | 0; }
    return h.toString(36);
  } catch {
    return '0';
  }
}
