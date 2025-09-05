import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const STORES_FILE = path.join(DATA_DIR, 'stores.json');
const CACHE_DIR = path.join(DATA_DIR, 'cache');
const LISTS_FILE = path.join(DATA_DIR, 'lists.json');

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

export async function renameList(email: string, id: string, name: string): Promise<boolean> {
  const all = await readJSON<UserList[]>(LISTS_FILE, []);
  const idx = all.findIndex(l => l.email === email && l.id === id);
  if (idx === -1) return false;
  all[idx].name = name;
  await writeJSON(LISTS_FILE, all);
  return true;
}

export async function deleteList(email: string, id: string): Promise<boolean> {
  const all = await readJSON<UserList[]>(LISTS_FILE, []);
  const next = all.filter(l => !(l.email === email && l.id === id));
  if (next.length === all.length) return false;
  await writeJSON(LISTS_FILE, next);
  return true;
}

// Partial update for list items (by id or handle key). Each update: { id? , handle?, data: Partial<Product> }
export async function updateListItems(email: string, id: string, updates: { id?: string|number; handle?: string; data: any }[]): Promise<UserList | null> {
  if (!Array.isArray(updates) || updates.length === 0) return getList(email, id);
  const all = await readJSON<UserList[]>(LISTS_FILE, []);
  const listIdx = all.findIndex(l => l.email === email && l.id === id);
  if (listIdx === -1) return null;
  const list = all[listIdx];
  const items = list.items;
  for (const u of updates) {
    const keyId = u.id;
    const keyHandle = u.handle;
    const idx = items.findIndex((it: any) => (keyId != null && (it.id === keyId || it.variant_id === keyId)) || (keyHandle && it.handle === keyHandle));
    if (idx >= 0) {
      items[idx] = { ...items[idx], ...u.data, variants: mergeVariantEdits(items[idx].variants, u.data) };
    }
  }
  all[listIdx].items = items;
  await writeJSON(LISTS_FILE, all);
  return all[listIdx];
}

function mergeVariantEdits(existing: any[], patch: any) {
  if (!Array.isArray(existing) || existing.length === 0) return existing;
  // If patch contains variant level keys (price/compare/cost) apply to first variant unless variantId specified
  const variantKeys = ['price','compare_at_price','cost_per_item'];
  const hasVariant = variantKeys.some(k => Object.prototype.hasOwnProperty.call(patch,k));
  if (!hasVariant) return existing;
  const clone = [...existing];
  clone[0] = { ...clone[0] };
  for (const k of variantKeys) if (patch[k] !== undefined) clone[0][k] = patch[k];
  return clone;
}

export async function removeListItems(email: string, id: string, handles: string[]): Promise<UserList | null> {
  if (!Array.isArray(handles) || handles.length === 0) return getList(email, id);
  const all = await readJSON<UserList[]>(LISTS_FILE, []);
  const listIdx = all.findIndex(l => l.email === email && l.id === id);
  if (listIdx === -1) return null;
  const set = new Set(handles);
  all[listIdx].items = all[listIdx].items.filter((it: any) => !set.has(it.handle));
  await writeJSON(LISTS_FILE, all);
  return all[listIdx];
}
