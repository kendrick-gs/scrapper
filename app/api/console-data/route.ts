import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getStores, loadCachedScrape } from '@/lib/redis-storage';

export async function GET(req: NextRequest) {
  const email = getUserFromRequest(req);
  if (!email) return NextResponse.json({ stores: [], products: [], collections: [], totalProducts: 0, totalCollections: 0, hasMore: false });

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const storeFilter = url.searchParams.get('store') || 'all';

  try {
    const stores = await getStores(email);
    const filteredStores = storeFilter === 'all' ? stores : stores.filter(s => s.shopUrl.includes(storeFilter));

    let allProducts: any[] = [];
    let allCollections: any[] = [];
    let totalProducts = 0;
    let totalCollections = 0;

    // Load data from all stores but with pagination
    for (const store of filteredStores) {
      try {
        const data = await loadCachedScrape<{ products: any[]; collections: any[] }>(email, store.shopUrl);
        if (data) {
          const host = (() => { try { return new URL(store.shopUrl).hostname; } catch { return store.shopUrl; } })();

          // Count totals
          totalProducts += data.products?.length || 0;
          totalCollections += data.collections?.length || 0;

          // Add store metadata to products and collections
          const productsWithMeta = (data.products || []).map(p => ({
            ...p,
            __storeUrl: store.shopUrl,
            __storeHost: host
          }));

          const collectionsWithMeta = (data.collections || []).map(c => ({
            ...c,
            __storeUrl: store.shopUrl,
            __storeHost: host
          }));

          allProducts = [...allProducts, ...productsWithMeta];
          allCollections = [...allCollections, ...collectionsWithMeta];
        }
      } catch (error) {
        console.warn(`Failed to load data for store ${store.shopUrl}:`, error);
      }
    }

    // Apply pagination to products
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = allProducts.slice(startIndex, endIndex);
    const hasMore = endIndex < allProducts.length;

    return NextResponse.json({
      stores: filteredStores,
      products: paginatedProducts,
      collections: allCollections.slice(0, 100), // Limit collections to first 100
      totalProducts,
      totalCollections,
      hasMore,
      page,
      limit,
      loadedProducts: paginatedProducts.length
    });
  } catch (error) {
    console.error('Failed to load console data:', error);
    return NextResponse.json(
      { error: 'Failed to load data', stores: [], products: [], collections: [], totalProducts: 0, totalCollections: 0, hasMore: false },
      { status: 500 }
    );
  }
}

