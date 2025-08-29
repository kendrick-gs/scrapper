import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getStores, loadCachedScrape } from '@/lib/storage';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shopUrl = searchParams.get('shopUrl');
  const email = getUserFromRequest(req);
  if (!email || !shopUrl) {
    return NextResponse.json({ exists: false });
  }

  const cached = await loadCachedScrape<{ products?: any[]; collections?: any[] }>(email, shopUrl);
  const stores = await getStores(email);
  const meta = stores.find(s => s.shopUrl === shopUrl);

  if (cached) {
    return NextResponse.json({
      exists: true,
      productCount: cached.products?.length || 0,
      collectionCount: cached.collections?.length || 0,
      lastUpdated: meta?.lastUpdated || null,
    });
  }
  return NextResponse.json({ exists: false });
}

