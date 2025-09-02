import { NextResponse } from 'next/server';
import { enhancedCache } from '@/lib/enhanced-redis-cache';
import { redisImageCache } from '@/lib/enhanced-redis-cache';

export async function GET() {
  try {
    const dataCacheStats = await enhancedCache.getStats();
    const imageCacheStats = await redisImageCache.getStats();

    // Calculate total cache size in bytes
    const dataCacheSizeBytes = dataCacheStats.keys * 1024; // 1KB per data item
    const localImageSizeBytes = imageCacheStats.keys * 51200; // 50KB per local image
    const redisImageSizeBytes = imageCacheStats.keys * 51200; // 50KB per Redis image
    const totalSizeBytes = dataCacheSizeBytes + localImageSizeBytes + redisImageSizeBytes;

    return NextResponse.json({
      dataCache: dataCacheStats,
      imageCache: imageCacheStats,
      totalSize: totalSizeBytes,
      totalItems: dataCacheStats.keys + imageCacheStats.keys,
      redisConnected: true, // Assume Redis is connected if we got here
      memoryUsage: totalSizeBytes,
      breakdown: {
        dataItems: dataCacheStats.keys,
        localImages: 0, // Not implemented yet
        redisImages: 0, // Not implemented yet
        loadingImages: 0 // Not implemented yet
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