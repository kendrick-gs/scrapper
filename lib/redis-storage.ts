import Redis from 'ioredis';

let redis: Redis | null = null;

// Only initialize Redis on the server side
if (typeof window === 'undefined') {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
}

export class RedisStorage {
  private redis: Redis | null;

  constructor() {
    this.redis = redis;
  }

  async get(key: string): Promise<any | null> {
    if (!this.redis) return null;

    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.redis) return;

    try {
      const data = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, data);
      } else {
        await this.redis.set(key, data);
      }
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.redis) return [];

    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      console.error('Redis keys error:', error);
      return [];
    }
  }

  async disconnect(): Promise<void> {
    if (!this.redis) return;
    await this.redis.disconnect();
  }
}

export const redisStorage = new RedisStorage();

// Helper functions for common operations
export async function getStores(email?: string): Promise<any[]> {
  const storage = new RedisStorage();
  const key = email ? `stores:${email}` : 'stores';
  const stores = await storage.get(key) || [];
  return Array.isArray(stores) ? stores : [];
}

export async function loadCachedScrape<T = any>(email: string, shopUrl: string): Promise<T | null> {
  const storage = new RedisStorage();
  const key = `scrape:${email}:${shopUrl}`;
  return await storage.get(key);
}

export async function getLists(email?: string): Promise<any[]> {
  const storage = new RedisStorage();
  const key = email ? `lists:${email}` : 'lists';
  const lists = await storage.get(key) || [];
  return Array.isArray(lists) ? lists : [];
}

export async function createList(email: string, listData: any): Promise<void> {
  const storage = new RedisStorage();
  const lists = await getLists(email);
  lists.push({ ...listData, id: Date.now().toString() });
  await storage.set(`lists:${email}`, lists);
}

export async function deleteList(email: string, listId: string): Promise<boolean> {
  const storage = new RedisStorage();
  const lists = await getLists(email);
  const initialLength = lists.length;
  const filteredLists = lists.filter((list: any) => list.id !== listId);
  if (filteredLists.length < initialLength) {
    await storage.set(`lists:${email}`, filteredLists);
    return true;
  }
  return false;
}

export async function updateList(email: string, listId: string, updates: any): Promise<any | null> {
  const storage = new RedisStorage();
  const lists = await getLists(email);
  const listIndex = lists.findIndex((list: any) => list.id === listId);
  if (listIndex === -1) return null;

  // If updates is a string, treat it as a name update
  if (typeof updates === 'string') {
    lists[listIndex] = { ...lists[listIndex], name: updates };
  } else {
    lists[listIndex] = { ...lists[listIndex], ...updates };
  }

  await storage.set(`lists:${email}`, lists);
  return lists[listIndex];
}

export async function getList(email: string, listId: string): Promise<any | null> {
  const lists = await getLists(email);
  return lists.find((list: any) => list.id === listId) || null;
}

export async function addItemsToList(email: string, listId: string, items: any[]): Promise<any | null> {
  const storage = new RedisStorage();
  const list = await getList(email, listId);
  if (list) {
    list.items = [...(list.items || []), ...items];
    await updateList(email, listId, list);
    return list;
  }
  return null;
}

export async function removeItemsFromList(email: string, listId: string, itemIds: string[]): Promise<any | null> {
  const storage = new RedisStorage();
  const list = await getList(email, listId);
  if (list && list.items) {
    list.items = list.items.filter((item: any) => !itemIds.includes(item.id));
    await updateList(email, listId, list);
    return list;
  }
  return null;
}

export async function updateItemsInList(email: string, listId: string, updates: any[]): Promise<any | null> {
  const storage = new RedisStorage();
  const list = await getList(email, listId);
  if (list && list.items) {
    list.items = list.items.map((item: any) => {
      const update = updates.find((u: any) => u.id === item.id);
      return update ? { ...item, ...update } : item;
    });
    await updateList(email, listId, list);
    return list;
  }
  return null;
}

export async function getPresets(email?: string): Promise<any[]> {
  const storage = new RedisStorage();
  const key = email ? `presets:${email}` : 'presets';
  const presets = await storage.get(key) || [];
  return Array.isArray(presets) ? presets : [];
}

export async function addToPresets(email: string, preset: any): Promise<void> {
  const storage = new RedisStorage();
  const presets = await getPresets(email);
  presets.push(preset);
  await storage.set(`presets:${email}`, presets);
}

export async function removeFromPresets(email: string, kind: string, value: string): Promise<any | null> {
  const storage = new RedisStorage();
  const presets = await getPresets(email);
  const userPresetIndex = presets.findIndex((p: any) => p.email === email);
  if (userPresetIndex === -1) return null;

  const userPreset = presets[userPresetIndex];
  if (!userPreset[kind] || !Array.isArray(userPreset[kind])) return null;

  const valueIndex = userPreset[kind].indexOf(value);
  if (valueIndex === -1) return null;

  userPreset[kind].splice(valueIndex, 1);
  presets[userPresetIndex] = userPreset;
  await storage.set(`presets:${email}`, presets);
  return userPreset;
}