import { NextRequest, NextResponse } from 'next/server';
import { cache, imageCache } from '@/lib/enhanced-cache';

export async function POST(request: NextRequest) {
  try {
    const { type = 'all' } = await request.json();

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
      default:
        return NextResponse.json({ error: 'Invalid cache type' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `${type} cache cleared successfully`
    });
  } catch (error) {
    console.error('Failed to clear cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}