import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { fetchAllProducts, fetchAllCollections } from '@/lib/shopify-scraper';
import { saveCachedScrape, upsertStoreMeta } from '@/lib/storage';

export async function POST(req: NextRequest) {
  const email = getUserFromRequest(req);
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { shopUrl } = await req.json();
  if (!shopUrl) return NextResponse.json({ error: 'shopUrl is required' }, { status: 400 });

  const onProgress = (_: string) => {};
  try {
    const [products, collections] = await Promise.all([
      fetchAllProducts(shopUrl, onProgress),
      fetchAllCollections(shopUrl, onProgress),
    ]);
    await saveCachedScrape(email, shopUrl, { products, collections });
    const lastUpdated = new Date().toISOString();
    await upsertStoreMeta(email, shopUrl, { lastUpdated, productCount: products.length, collectionCount: collections.length });
    return NextResponse.json({ ok: true, lastUpdated, productCount: products.length, collectionCount: collections.length });
  } catch (e: any) {
    return NextResponse.json({ error: 'Refresh failed', details: e.message }, { status: 500 });
  }
}

