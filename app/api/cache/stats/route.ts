import { NextResponse } from 'next/server';
import { enhancedCache } from '@/lib/enhanced-redis-cache';
import { redisImageCache } from '@/lib/enhanced-redis-cache';

export async function GET() {
  try {
    const dataCacheStats = await enhancedCache.getStats();
    const imageCacheStats = await redisImageCache.getStats();

    // Calculate total cache size in bytes
    const dataCacheSizeBytes = dataCacheStats.size * 1024; // 1KB per data item
    const localImageSizeBytes = imageCacheStats.localSize * 51200; // 50KB per local image
    const redisImageSizeBytes = imageCacheStats.redisSize * 51200; // 50KB per Redis image
    const totalSizeBytes = dataCacheSizeBytes + localImageSizeBytes + redisImageSizeBytes;

    return NextResponse.json({
      dataCache: dataCacheStats,
      imageCache: imageCacheStats,
      totalSize: totalSizeBytes,
      totalItems: dataCacheStats.size + imageCacheStats.localSize + imageCacheStats.redisSize,
      redisConnected: dataCacheStats.redisConnected,
      memoryUsage: totalSizeBytes,
      breakdown: {
        dataItems: dataCacheStats.size,
        localImages: imageCacheStats.localSize,
        redisImages: imageCacheStats.redisSize,
        loadingImages: imageCacheStats.loadingCount
      }
    });
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return NextResponse.json(
      { error: 'Failed to get cache stats', totalSize: 0, redisConnected: false },
      { status: 500 }
    );
  }
}