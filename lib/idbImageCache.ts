// Client-side IndexedDB helpers for persistent image caching.
// All functions no-op during SSR.

export interface IDBStoredImage {
  src: string;
  blob: Blob;
  size: number;
  lastAccess: number;
  created: number;
  hits: number;
}

const DB_NAME = 'imageCache';
const STORE = 'images';
const VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onerror = () => reject(req.error || new Error('indexedDB open error'));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'src' });
        store.createIndex('lastAccess', 'lastAccess');
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
  return dbPromise;
}

export async function idbGetImage(src: string): Promise<Blob | undefined> {
  if (typeof window === 'undefined') return undefined;
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.get(src);
      req.onsuccess = () => {
        const val = req.result as IDBStoredImage | undefined;
        resolve(val?.blob);
      };
      req.onerror = () => reject(req.error);
    });
  } catch { return undefined; }
}

export async function idbPutImage(src: string, blob: Blob, lastAccess: number) {
  if (typeof window === 'undefined') return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const rec: IDBStoredImage = { src, blob, size: blob.size, lastAccess, created: Date.now(), hits: 1 };
      const req = store.put(rec);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch { /* ignore */ }
}

export async function idbUpdateAccess(src: string) {
  if (typeof window === 'undefined') return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const getReq = store.get(src);
      getReq.onsuccess = () => {
        const val = getReq.result as IDBStoredImage | undefined;
        if (val) {
          val.lastAccess = Date.now();
          val.hits = (val.hits || 0) + 1;
          store.put(val);
        }
        resolve();
      };
      getReq.onerror = () => resolve();
    });
  } catch { /* ignore */ }
}

export async function idbDeleteImage(src: string) {
  if (typeof window === 'undefined') return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(src).onsuccess = () => resolve();
      tx.oncomplete = () => resolve();
    });
  } catch { /* ignore */ }
}

export async function idbClear() {
  if (typeof window === 'undefined') return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear().onsuccess = () => resolve();
      tx.oncomplete = () => resolve();
    });
  } catch { /* ignore */ }
}

export async function idbEnsureSizeLimit(maxBytes: number) {
  if (typeof window === 'undefined') return;
  try {
    const db = await openDb();
    const entries: { src: string; size: number; lastAccess: number }[] = [];
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = (e: any) => {
        const cursor: IDBCursorWithValue | null = e.target.result;
        if (cursor) {
          const val = cursor.value as IDBStoredImage;
          entries.push({ src: val.src, size: val.size, lastAccess: val.lastAccess });
          cursor.continue();
        } else { resolve(); }
      };
      cursorReq.onerror = () => resolve();
    });
    let total = entries.reduce((a, b) => a + b.size, 0);
    if (total <= maxBytes) return;
    entries.sort((a, b) => a.lastAccess - b.lastAccess); // oldest first
    const toDelete: string[] = [];
    for (const e of entries) {
      if (total <= maxBytes) break;
      toDelete.push(e.src);
      total -= e.size;
    }
    if (toDelete.length) {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        toDelete.forEach(src => store.delete(src));
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
  } catch { /* ignore */ }
}

// Quick stats for UI (count + totalBytes). Does not load blobs into memory.
export async function idbStats(): Promise<{ count: number; totalBytes: number }> {
  if (typeof window === 'undefined') return { count: 0, totalBytes: 0 };
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      let count = 0; let totalBytes = 0;
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = (e: any) => {
        const cursor: IDBCursorWithValue | null = e.target.result;
        if (cursor) {
          const val = cursor.value as IDBStoredImage;
            count++; totalBytes += val.size;
            cursor.continue();
        } else {
          resolve({ count, totalBytes });
        }
      };
      cursorReq.onerror = () => resolve({ count, totalBytes });
    });
  } catch { return { count: 0, totalBytes: 0 }; }
}
