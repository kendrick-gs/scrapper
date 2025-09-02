'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { HardDrive, Trash2, RefreshCw, Database, Zap } from 'lucide-react';
import { enhancedCache, redisImageCache } from '@/lib/enhanced-redis-cache';

// Cache Context for real-time updates
interface CacheContextType {
  triggerUpdate: () => void;
  lastUpdate: number;
}

const CacheContext = createContext<CacheContextType | null>(null);

export const useCache = () => {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCache must be used within a CacheProvider');
  }
  return context;
};

export const useCacheUpdate = () => {
  const cacheContext = useCache();
  return cacheContext.triggerUpdate;
};

// Cache Provider component
export const CacheProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [updateCounter, setUpdateCounter] = useState(0);

  const triggerUpdate = () => {
    setUpdateCounter(prev => prev + 1);
  };

  return (
    <CacheContext.Provider value={{ triggerUpdate, lastUpdate: updateCounter }}>
      {children}
    </CacheContext.Provider>
  );
};

export function CacheIndicator() {
  const cacheContext = useCache();
  const [cacheStats, setCacheStats] = useState({
    size: 0,
    keys: [] as string[],
    memoryUsage: 0,
    redisConnected: false,
    imageStats: {
      localSize: 0,
      redisSize: 0,
      loadingCount: 0,
    },
  });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateStats = async () => {
    setIsUpdating(true);
    try {
      const [cacheStats, imageStats] = await Promise.all([
        enhancedCache.getStats(),
        redisImageCache.getStats(),
      ]);

      setCacheStats(prev => ({
        ...prev,
        imageStats: {
          localSize: imageStats.keys,
          redisSize: imageStats.memory,
          loadingCount: 0, // We'll track this separately if needed
        },
      }));
    } catch (error) {
      console.error('Failed to get cache stats:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Update stats on mount and when cache context triggers updates
  useEffect(() => {
    updateStats();
  }, [cacheContext.lastUpdate]);

  // Also keep the periodic update as fallback
  useEffect(() => {
    const interval = setInterval(updateStats, 30000); // 30 seconds fallback
    return () => clearInterval(interval);
  }, []);

  const clearCache = async () => {
    setLoading(true);
    try {
      await Promise.all([
        enhancedCache.clear(),
        redisImageCache.clear(),
      ]);
      await updateStats();
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

  // Calculate actual cache sizes in bytes
  const dataCacheSize = cacheStats.size * 1024; // 1KB per data item
  const localImageSize = cacheStats.imageStats.localSize * 51200; // 50KB per image
  const redisImageSize = cacheStats.imageStats.redisSize * 51200; // 50KB per image
  const totalCacheSizeBytes = dataCacheSize + localImageSize + redisImageSize;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-9 px-3 border-brand-green/30 hover:border-brand-green/50 hover:bg-brand-green/5 transition-colors ${
            isUpdating ? 'animate-pulse' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            {cacheStats.redisConnected ? (
              <Database className={`h-4 w-4 text-brand-green ${isUpdating ? 'animate-spin' : ''}`} />
            ) : (
              <HardDrive className={`h-4 w-4 text-muted-foreground ${isUpdating ? 'animate-spin' : ''}`} />
            )}
            <Badge
              variant="secondary"
              className="text-xs bg-brand-green/10 text-brand-green border border-brand-green/20 px-2 py-0.5"
            >
              {cacheStats.memoryUsage > 0
                ? formatBytes(cacheStats.memoryUsage)
                : formatBytes(totalCacheSizeBytes)
              }
            </Badge>
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md border border-border bg-background">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            {cacheStats.redisConnected ? (
              <Database className="h-5 w-5 text-brand-green" />
            ) : (
              <HardDrive className="h-5 w-5 text-muted-foreground" />
            )}
            Cache Status
            {cacheStats.redisConnected && (
              <Badge variant="outline" className="text-xs border-brand-green text-brand-green bg-brand-green/5">
                <Zap className="h-3 w-3 mr-1" />
                Redis
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-muted/50 border border-border rounded-lg hover:bg-muted/70 transition-colors">
              <div className="text-2xl font-bold text-brand-green mb-1">
                {formatBytes(dataCacheSize)}
              </div>
              <div className="text-sm text-muted-foreground">Data Cache</div>
            </div>
            <div className="text-center p-4 bg-muted/50 border border-border rounded-lg hover:bg-muted/70 transition-colors">
              <div className="text-2xl font-bold text-brand-green mb-1">
                {formatBytes(localImageSize + redisImageSize)}
              </div>
              <div className="text-sm text-muted-foreground">Cached Images</div>
            </div>
          </div>

          {cacheStats.redisConnected && (
            <div className="text-center p-3 bg-brand-green/5 border border-brand-green/20 rounded-lg">
              <div className="text-sm font-medium text-brand-green mb-1">
                Redis Connected
              </div>
              <div className="text-xs text-brand-green/80">
                Memory: {formatBytes(cacheStats.memoryUsage)}
              </div>
            </div>
          )}

          <div className="text-center p-4 bg-gradient-to-r from-brand-green/5 to-brand-green/10 border border-brand-green/20 rounded-lg">
            <div className="text-xl font-bold text-brand-green mb-1">
              Total Cache Size: {cacheStats.memoryUsage > 0
                ? formatBytes(cacheStats.memoryUsage)
                : formatBytes(totalCacheSizeBytes)
              }
            </div>
            <div className="text-sm text-muted-foreground">
              {cacheStats.size + cacheStats.imageStats.localSize + cacheStats.imageStats.redisSize} items cached
            </div>
          </div>

          <div className="space-y-3 p-4 bg-muted/30 border border-border rounded-lg">
            <div className="flex justify-between text-sm border-b border-border pb-2">
              <span className="text-muted-foreground">Local Data Cache:</span>
              <span className="font-medium text-foreground">{cacheStats.size} items ({formatBytes(cacheStats.size * 1024)})</span>
            </div>
            <div className="flex justify-between text-sm border-b border-border pb-2">
              <span className="text-muted-foreground">Local Image Cache:</span>
              <span className="font-medium text-foreground">{cacheStats.imageStats.localSize} images ({formatBytes(cacheStats.imageStats.localSize * 51200)})</span>
            </div>
            {cacheStats.redisConnected && (
              <>
                <div className="flex justify-between text-sm border-b border-border pb-2">
                  <span className="text-muted-foreground">Redis Image Cache:</span>
                  <span className="font-medium text-foreground">{cacheStats.imageStats.redisSize} images ({formatBytes(cacheStats.imageStats.redisSize * 51200)})</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Loading Images:</span>
                  <span className="font-medium text-foreground">{cacheStats.imageStats.loadingCount}</span>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={updateStats}
              className="flex-1 border-border hover:border-brand-green/50 hover:bg-brand-green/5 transition-colors"
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={clearCache}
              disabled={loading}
              className="flex-1 hover:bg-destructive/90 transition-colors"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {loading ? 'Clearing...' : 'Clear Cache'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
