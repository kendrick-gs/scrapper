'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { enhancedCache, redisImageCache } from './enhanced-redis-cache';
import Image from 'next/image';
import { cn } from './utils';

// React hook for Redis cache management
export function useCache<T>(key: string, ttl?: number) {
  const [data, setData] = useState<T | null>(() => enhancedCache.getSync(key));
  const [loading, setLoading] = useState(false);

  const setCachedData = useCallback(async (newData: T, customTtl?: number) => {
    await enhancedCache.set(key, newData, customTtl || ttl);
    setData(newData);
  }, [key, ttl]);

  const clearCache = useCallback(async () => {
    await enhancedCache.delete(key);
    setData(null);
  }, [key]);

  return {
    data,
    loading,
    setData: setCachedData,
    clearCache,
    isCached: data !== null,
  };
}

// Enhanced Image component with Redis caching
export const CachedImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  [key: string]: any;
}> = ({ src, alt, className, fill, ...props }) => {
  const [cachedSrc, setCachedSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const cached = await redisImageCache.preloadImage(src);
        setCachedSrc(cached);
      } catch (error) {
        console.warn('Failed to cache image:', error);
        setCachedSrc(src); // Fallback to original src
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [src]);

  if (loading) {
    return (
      <div className={cn("animate-pulse bg-gray-200 dark:bg-gray-700 rounded", className)} />
    );
  }

  return (
    <Image
      src={cachedSrc || src}
      alt={alt}
      className={className}
      fill={fill}
      {...props}
    />
  );
};
