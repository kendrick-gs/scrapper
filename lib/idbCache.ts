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
}

const DB_NAME = 'shopifyMateCache';
const DB_VERSION = 2; // bumped for productIndex + user scoping
const STORE_NAME = 'consoleData';
const LOCAL_KEY_BASE = 'sm_console_cache_v2';

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
      req.onsuccess = () => resolve(req.result || null);
    });
  } catch {
    try {
      const raw = localStorage.getItem(localKeyForUser(user));
      if (!raw) return null;
      return JSON.parse(raw);
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
