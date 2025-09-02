'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cache, imageCache } from '@/lib/enhanced-cache';
import { Trash2, Database, Image, RefreshCw } from 'lucide-react';
import { useScrapeStore } from '@/store/useScrapeStore';

export function CacheManager() {
  const [cacheStats, setCacheStats] = useState(cache.getStats());
  const [imageCacheSize, setImageCacheSize] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const { collectionCache } = useScrapeStore();

  useEffect(() => {
    // Update image cache size
    setImageCacheSize(imageCache.getCacheSize ? imageCache.getCacheSize() : 0);

    // Update cache stats periodically
    const interval = setInterval(() => {
      setCacheStats(cache.getStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleClearCache = async (type: 'all' | 'data' | 'images') => {
    setIsClearing(true);
    try {
      switch (type) {
        case 'all':
          cache.clear();
          imageCache.clear();
          break;
        case 'data':
          cache.clear();
          break;
        case 'images':
          imageCache.clear();
          break;
      }
      setCacheStats(cache.getStats());
      setImageCacheSize(0);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const totalCacheItems = cacheStats.size + Object.keys(collectionCache).length;
  const cacheUsage = Math.min((totalCacheItems / 1000) * 100, 100); // Assume 1000 items max

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Cache Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Cache Usage</span>
            <Badge variant={cacheUsage > 80 ? 'destructive' : cacheUsage > 50 ? 'secondary' : 'default'}>
              {Math.round(cacheUsage)}%
            </Badge>
          </div>
          <Progress value={cacheUsage} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">{cacheStats.size}</div>
              <div className="text-muted-foreground">Data Items</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">{imageCacheSize}</div>
              <div className="text-muted-foreground">Images</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleClearCache('data')}
            disabled={isClearing || cacheStats.size === 0}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Data Cache
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleClearCache('images')}
            disabled={isClearing || imageCacheSize === 0}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Image Cache
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleClearCache('all')}
            disabled={isClearing || (cacheStats.size === 0 && imageCacheSize === 0)}
            className="w-full"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isClearing ? 'animate-spin' : ''}`} />
            Clear All Cache
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          Cache helps improve performance by storing frequently accessed data and images.
        </div>
      </CardContent>
    </Card>
  );
}