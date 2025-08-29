import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const STORES_FILE = path.join(DATA_DIR, 'stores.json');
const CACHE_DIR = path.join(DATA_DIR, 'cache');
const LISTS_FILE = path.join(DATA_DIR, 'lists.json');
const PRESETS_FILE = path.join(DATA_DIR, 'presets.json');

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

export async function readJSON<T>(file: string, fallback: T): Promise<T> {
  try {
    const buf = await fs.readFile(file, 'utf8');
    return JSON.parse(buf) as T;
  } catch {
    return fallback;
  }
}

export async function writeJSON(file: string, data: any) {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
}

export async function listUsers(): Promise<string[]> {
  return readJSON<string[]>(USERS_FILE, []);
}

export async function addUser(email: string): Promise<void> {
  const users = await listUsers();
  if (!users.includes(email)) {
    users.push(email);
    await writeJSON(USERS_FILE, users);
  }
}

export type ImportHistoryItem = {
  email: string;
  shopUrl: string;
  date: string; // ISO
  productCount: number;
  collectionCount: number;
};

export async function getHistory(email: string): Promise<ImportHistoryItem[]> {
  const all = await readJSON<ImportHistoryItem[]>(HISTORY_FILE, []);
  return all.filter(i => i.email === email);
}

export async function addHistory(item: ImportHistoryItem) {
  const all = await readJSON<ImportHistoryItem[]>(HISTORY_FILE, []);
  all.push(item);
  await writeJSON(HISTORY_FILE, all);
}

function hostFromUrl(url: string): string {
  try { return new URL(url).hostname; } catch { return url.replace(/[^a-z0-9.-]/gi, '_'); }
}

export function cachePathFor(email: string, shopUrl: string): string {
  const host = hostFromUrl(shopUrl);
  const userDir = path.join(CACHE_DIR, encodeURIComponent(email));
  return path.join(userDir, `${encodeURIComponent(host)}.json`);
}

export async function loadCachedScrape<T = any>(email: string, shopUrl: string): Promise<T | null> {
  try {
    const p = cachePathFor(email, shopUrl);
    const content = await fs.readFile(p, 'utf8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function saveCachedScrape(email: string, shopUrl: string, data: any) {
  const p = cachePathFor(email, shopUrl);
  await writeJSON(p, data);
}

export type UserStore = {
  email: string;
  shopUrl: string;
  lastUpdated?: string;
  productCount?: number;
  collectionCount?: number;
};

export async function getStores(email: string): Promise<UserStore[]> {
  const all = await readJSON<UserStore[]>(STORES_FILE, []);
  return all.filter(s => s.email === email);
}

export async function addStore(email: string, shopUrl: string) {
  const all = await readJSON<UserStore[]>(STORES_FILE, []);
  const exists = all.find(s => s.email === email && s.shopUrl === shopUrl);
  if (!exists) {
    all.push({ email, shopUrl });
    await writeJSON(STORES_FILE, all);
  }
}

export async function upsertStoreMeta(email: string, shopUrl: string, meta: { lastUpdated?: string; productCount?: number; collectionCount?: number }) {
  const all = await readJSON<UserStore[]>(STORES_FILE, []);
  const idx = all.findIndex(s => s.email === email && s.shopUrl === shopUrl);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...meta };
  } else {
    all.push({ email, shopUrl, ...meta });
  }
  await writeJSON(STORES_FILE, all);
}

export async function removeStore(email: string, shopUrl: string) {
  const all = await readJSON<UserStore[]>(STORES_FILE, []);
  const next = all.filter(s => !(s.email === email && s.shopUrl === shopUrl));
  await writeJSON(STORES_FILE, next);
  // remove cache file if present
  try {
    const p = cachePathFor(email, shopUrl);
    await fs.unlink(p);
  } catch {}
}

// Lists
export type UserList = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  items: any[]; // store product snapshots
};

export async function getLists(email: string): Promise<UserList[]> {
  const all = await readJSON<UserList[]>(LISTS_FILE, []);
  return all.filter(l => l.email === email);
}

export async function getList(email: string, id: string): Promise<UserList | null> {
  const all = await readJSON<UserList[]>(LISTS_FILE, []);
  const found = all.find(l => l.email === email && l.id === id);
  return found || null;
}

export async function createList(email: string, name: string): Promise<UserList> {
  const all = await readJSON<UserList[]>(LISTS_FILE, []);
  const id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const list: UserList = { id, email, name, createdAt: new Date().toISOString(), items: [] };
  all.push(list);
  await writeJSON(LISTS_FILE, all);
  return list;
}

export async function addItemsToList(email: string, id: string, products: any[]): Promise<UserList | null> {
  const all = await readJSON<UserList[]>(LISTS_FILE, []);
  const idx = all.findIndex(l => l.email === email && l.id === id);
  if (idx === -1) return null;
  // naive dedupe by handle + storeHost
  const existingKeys = new Set(all[idx].items.map((p: any) => `${p.__storeHost || ''}:${p.handle}`));
  for (const p of products) {
    const key = `${p.__storeHost || ''}:${p.handle}`;
    if (!existingKeys.has(key)) {
      all[idx].items.push(p);
      existingKeys.add(key);
    }
  }
  await writeJSON(LISTS_FILE, all);
  return all[idx];
}

export async function removeItemsFromList(email: string, id: string, keys: string[]): Promise<UserList | null> {
  const all = await readJSON<UserList[]>(LISTS_FILE, []);
  const idx = all.findIndex(l => l.email === email && l.id === id);
  if (idx === -1) return null;
  const keySet = new Set(keys);
  all[idx].items = all[idx].items.filter((p: any) => !keySet.has(`${p.__storeHost || ''}:${p.handle}`));
  await writeJSON(LISTS_FILE, all);
  return all[idx];
}

// Presets (per user)
export type UserPresets = {
  email: string;
  vendors: string[];
  productTypes: string[];
  tags: string[];
};

async function getAllPresets(): Promise<UserPresets[]> {
  return readJSON<UserPresets[]>(PRESETS_FILE, []);
}

async function saveAllPresets(all: UserPresets[]) {
  await writeJSON(PRESETS_FILE, all);
}

export async function getPresets(email: string): Promise<UserPresets> {
  const all = await getAllPresets();
  let entry = all.find(p => p.email === email);
  if (!entry) {
    entry = { email, vendors: [], productTypes: [], tags: [] };
    all.push(entry);
    await saveAllPresets(all);
  }
  return entry;
}

export async function addToPresets(email: string, data: { vendors?: string[]; productTypes?: string[]; tags?: string[]; }) {
  const all = await getAllPresets();
  const idx = all.findIndex(p => p.email === email);
  const entry: UserPresets = idx >= 0 ? all[idx] : { email, vendors: [], productTypes: [], tags: [] };
  const unique = (arr: string[], add?: string[]) => Array.from(new Set([...(arr||[]), ...((add||[]).filter(Boolean))])).sort();
  entry.vendors = unique(entry.vendors, data.vendors);
  entry.productTypes = unique(entry.productTypes, data.productTypes);
  entry.tags = unique(entry.tags, data.tags);
  if (idx >= 0) all[idx] = entry; else all.push(entry);
  await saveAllPresets(all);
  return entry;
}

export async function removeFromPresets(email: string, kind: 'vendors'|'productTypes'|'tags', value: string) {
  const all = await getAllPresets();
  const idx = all.findIndex(p => p.email === email);
  if (idx === -1) return null;
  const entry = all[idx];
  (entry as any)[kind] = ((entry as any)[kind] as string[]).filter((v: string) => v !== value);
  await saveAllPresets(all);
  return entry;
}

export async function renameInPresets(email: string, kind: 'vendors'|'productTypes'|'tags', from: string, to: string) {
  const all = await getAllPresets();
  const idx = all.findIndex(p => p.email === email);
  if (idx === -1) return null;
  const entry = all[idx];
  const arr: string[] = (entry as any)[kind] || [];
  const set = new Set(arr);
  set.delete(from);
  if (to) set.add(to);
  (entry as any)[kind] = Array.from(set).sort();
  await saveAllPresets(all);
  return entry;
}


export async function updateItemsInList(email: string, id: string, updates: { key: string; data: any }[]): Promise<UserList | null> {
  const all = await readJSON<UserList[]>(LISTS_FILE, []);
  const idx = all.findIndex(l => l.email === email && l.id === id);
  if (idx === -1) return null;
  const map = new Map(updates.map(u => [u.key, u.data]));
  all[idx].items = all[idx].items.map((p: any) => {
    const k = `${p.__storeHost || ''}:${p.handle}`;
    if (map.has(k)) {
      const data = map.get(k)!;
      return { ...p, ...data };
    }
    return p;
  });
  await writeJSON(LISTS_FILE, all);
  return all[idx];
}
