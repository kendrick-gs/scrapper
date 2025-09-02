// Enhanced cache with localStorage persistence and TTL
class EnhancedCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly STORAGE_KEY = 'scrapper_cache';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([key, value]: [string, any]) => {
          if (Date.now() - value.timestamp < value.ttl) {
            this.cache.set(key, value);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;

    try {
      const cacheObject = Object.fromEntries(this.cache);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cacheObject));
    } catch (error) {
      console.warn('Failed to save cache to storage:', error);
    }
  }

  set(key: string, data: any, ttl = 3600000) { // 1 hour default TTL
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
    this.saveToStorage();
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }

    return entry.data;
  }

  delete(key: string) {
    this.cache.delete(key);
    this.saveToStorage();
  }

  clear() {
    this.cache.clear();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const cache = new EnhancedCache();

// Image cache utility
export class ImageCache {
  private static instance: ImageCache;
  private cache = new Map<string, string>();
  private loading = new Set<string>();

  static getInstance(): ImageCache {
    if (!ImageCache.instance) {
      ImageCache.instance = new ImageCache();
    }
    return ImageCache.instance;
  }

  async preloadImage(src: string): Promise<string> {
    if (this.cache.has(src)) {
      return this.cache.get(src)!;
    }

    if (this.loading.has(src)) {
      // Wait for ongoing load
      return new Promise((resolve) => {
        const checkCache = () => {
          if (this.cache.has(src)) {
            resolve(this.cache.get(src)!);
          } else {
            setTimeout(checkCache, 50);
          }
        };
        checkCache();
      });
    }

    this.loading.add(src);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(src, src);
        this.loading.delete(src);
        resolve(src);
      };
      img.onerror = () => {
        this.loading.delete(src);
        reject(new Error(`Failed to load image: ${src}`));
      };
      img.src = src;
    });
  }

  getCachedImage(src: string): string | null {
    return this.cache.get(src) || null;
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  clear() {
    this.cache.clear();
    this.loading.clear();
  }
}

export const imageCache = ImageCache.getInstance();