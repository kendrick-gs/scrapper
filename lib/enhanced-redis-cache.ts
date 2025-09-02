import Redis from 'ioredis';

let redis: Redis | null = null;

// Only initialize Redis on the server side
if (typeof window === 'undefined') {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
}

export interface CacheEntry {
  data: any;
  timestamp: number;
  ttl?: number;
}

export class EnhancedRedisCache {
  private redis: Redis | null;

  constructor() {
    this.redis = redis;
  }

  async get(key: string): Promise<any | null> {
    if (!this.redis) return null;

    try {
      const data = await this.redis.get(key);
      if (!data) return null;

      const entry: CacheEntry = JSON.parse(data);
      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl * 1000) {
        await this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.redis) return;

    try {
      const entry: CacheEntry = {
        data: value,
        timestamp: Date.now(),
        ttl,
      };

      if (ttl) {
        await this.redis.setex(key, ttl, JSON.stringify(entry));
      } else {
        await this.redis.set(key, JSON.stringify(entry));
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async clear(): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.flushall();
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  async getStats(): Promise<{ keys: number; memory: number }> {
    if (!this.redis) return { keys: 0, memory: 0 };

    try {
      const info = await this.redis.info('memory');
      const keys = await this.redis.dbsize();

      // Parse memory info
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memory = memoryMatch ? parseInt(memoryMatch[1]) : 0;

      return { keys, memory };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { keys: 0, memory: 0 };
    }
  }

  // Synchronous get method for client-side usage
  getSync(key: string): any | null {
    // This is a simplified synchronous version for client-side
    // In a real implementation, you might want to use localStorage or IndexedDB
    return null;
  }

  // Preload image method for caching images
  async preloadImage(url: string): Promise<string> {
    if (!this.redis) return url;

    try {
      // Check if image is already cached
      const cached = await this.get(`image:${url}`);
      if (cached) return cached;

      // For now, just return the original URL
      // In a real implementation, you would download and cache the image
      return url;
    } catch (error) {
      console.error('Image preload error:', error);
      return url;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.redis) return;
    await this.redis.disconnect();
  }
}

export const enhancedCache = new EnhancedRedisCache();
export const redisImageCache = new EnhancedRedisCache();
