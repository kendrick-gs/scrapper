import { NextResponse } from 'next/server';
import { cache, imageCache } from '@/lib/enhanced-cache';

export async function GET() {
  try {
    const cacheStats = cache.getStats();
    const imageCacheSize = imageCache.getCacheSize();

    return NextResponse.json({
      dataCache: cacheStats,
      imageCache: {
        size: imageCacheSize,
      },
      totalItems: cacheStats.size + imageCacheSize,
    });
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return NextResponse.json(
      { error: 'Failed to get cache stats' },
      { status: 500 }
    );
  }
}