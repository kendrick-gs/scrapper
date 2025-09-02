'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { HardDrive, Trash2, RefreshCw } from 'lucide-react';
import { cache, imageCache } from '@/lib/enhanced-cache';

export function CacheIndicator() {
  const [cacheStats, setCacheStats] = useState({
    dataSize: 0,
    imageCount: 0,
    lastUpdated: null as Date | null,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateStats = () => {
    try {
      const dataSize = cache.getStats().size;
      const imageCount = imageCache.getCacheSize();
      const lastUpdated = new Date();

      setCacheStats({
        dataSize,
        imageCount,
        lastUpdated,
      });
    } catch (error) {
      console.error('Failed to get cache stats:', error);
    }
  };

  useEffect(() => {
    updateStats();
    // Update stats every 30 seconds
    const interval = setInterval(updateStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const clearCache = async () => {
    setLoading(true);
    try {
      await cache.clear();
      await imageCache.clear();
      updateStats();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2">
          <HardDrive className="h-4 w-4 mr-1" />
          <Badge variant="secondary" className="text-xs">
            {formatBytes(cacheStats.dataSize)}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Cache Status
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {formatBytes(cacheStats.dataSize)}
              </div>
              <div className="text-sm text-muted-foreground">Data Cache</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {cacheStats.imageCount}
              </div>
              <div className="text-sm text-muted-foreground">Cached Images</div>
            </div>
          </div>

          {cacheStats.lastUpdated && (
            <div className="text-sm text-muted-foreground text-center">
              Last updated: {cacheStats.lastUpdated.toLocaleTimeString()}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={updateStats}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={clearCache}
              disabled={loading}
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {loading ? 'Clearing...' : 'Clear Cache'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
