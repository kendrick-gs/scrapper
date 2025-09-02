'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { enhancedCache, redisImageCache } from '@/lib/enhanced-redis-cache';
import { Trash2, Database, Image, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export function CacheManager() {
  const [isClearing, setIsClearing] = useState(false);

  const { data: cacheStats, refetch: refetchCacheStats } = useQuery({
    queryKey: ['cache', 'stats'],
    queryFn: () => enhancedCache.getStats(),
    refetchInterval: 5000,
  });

  const { data: imageStats } = useQuery({
    queryKey: ['cache', 'images', 'stats'],
    queryFn: () => redisImageCache.getStats(),
    refetchInterval: 5000,
  });

  const handleClearCache = async (type: 'all' | 'data' | 'images') => {
    setIsClearing(true);
    try {
      switch (type) {
        case 'all':
          await enhancedCache.clear();
          await redisImageCache.clear();
          break;
        case 'data':
          await enhancedCache.clear();
          break;
        case 'images':
          await redisImageCache.clear();
          break;
      }
      refetchCacheStats();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const totalCacheItems = (cacheStats?.size || 0) + (imageStats?.localSize || 0);
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
              <div className="font-medium">{cacheStats?.size || 0}</div>
              <div className="text-muted-foreground">Data Items</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">{imageStats?.localSize || 0}</div>
              <div className="text-muted-foreground">Images</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleClearCache('data')}
            disabled={isClearing || (cacheStats?.size || 0) === 0}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Data Cache
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleClearCache('images')}
            disabled={isClearing || (imageStats?.localSize || 0) === 0}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Image Cache
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleClearCache('all')}
            disabled={isClearing || ((cacheStats?.size || 0) === 0 && (imageStats?.localSize || 0) === 0)}
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