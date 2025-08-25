import { NextRequest, NextResponse } from 'next/server';
import { ShopifyProduct } from '@/lib/types';

// Helper to fetch and handle errors
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.json();
}

// Fetches all products for a specific collection, handling pagination
async function fetchProductsForCollection(
  shopUrl: string,
  collectionHandle: string,
): Promise<ShopifyProduct[]> {
  let products: ShopifyProduct[] = [];
  let page = 1;
  const limit = 250;

  while (true) {
    const url = `${shopUrl}/collections/${collectionHandle}/products.json?limit=${limit}&page=${page}`;
    const data = await fetchJson<{ products: ShopifyProduct[] }>(url);

    if (data.products.length === 0) {
      break;
    }
    products = products.concat(data.products);
    page++;
  }
  return products;
}

export async function POST(req: NextRequest) {
  try {
    const { shopUrl, collectionHandle } = await req.json();
    if (!shopUrl || !collectionHandle) {
      return NextResponse.json({ error: 'shopUrl and collectionHandle are required' }, { status: 400 });
    }

    const products = await fetchProductsForCollection(shopUrl, collectionHandle);
    return NextResponse.json({ products });

  } catch (error: any) {
    console.error("Error in /api/collection-products:", error);
    return NextResponse.json(
      { error: "An internal server error occurred.", details: error.message },
      { status: 500 }
    );
  }
}