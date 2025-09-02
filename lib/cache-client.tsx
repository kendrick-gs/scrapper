'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { cache, imageCache } from './enhanced-cache';
import Image from 'next/image';
import { cn } from './utils';

// React hook for cache management
export function useCache<T>(key: string, ttl?: number) {
  const [data, setData] = useState<T | null>(() => cache.get(key));
  const [loading, setLoading] = useState(false);

  const setCachedData = useCallback((newData: T, customTtl?: number) => {
    cache.set(key, newData, customTtl || ttl);
    setData(newData);
  }, [key, ttl]);

  const clearCache = useCallback(() => {
    cache.delete(key);
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

// Enhanced Image component with caching
export function CachedImage({ src, alt, className, fill, ...props }: { src: string; alt: string; className?: string; fill?: boolean; [key: string]: any }) {
  const [cachedSrc, setCachedSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const cached = await imageCache.preloadImage(src);
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
}
