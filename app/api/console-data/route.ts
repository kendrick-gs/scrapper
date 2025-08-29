import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getStores, loadCachedScrape } from '@/lib/storage';

export async function GET(req: NextRequest) {
  const email = getUserFromRequest(req);
  if (!email) return NextResponse.json({ stores: [], products: [], collections: [] });
  const stores = await getStores(email);
  const products: any[] = [];
  const collections: any[] = [];
  for (const store of stores) {
    const data = await loadCachedScrape<{ products: any[]; collections: any[] }>(email, store.shopUrl);
    if (data) {
      const host = (() => { try { return new URL(store.shopUrl).hostname; } catch { return store.shopUrl; } })();
      for (const p of data.products || []) {
        products.push({ ...p, __storeUrl: store.shopUrl, __storeHost: host });
      }
      for (const c of data.collections || []) {
        collections.push({ ...c, __storeUrl: store.shopUrl, __storeHost: host });
      }
    }
  }
  return NextResponse.json({ stores, products, collections });
}

