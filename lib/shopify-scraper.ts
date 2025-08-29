import { ShopifyProduct, ShopifyCollection } from './types';

// Helper to fetch and handle errors
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.json();
}

// Fetches all products using pagination
export async function fetchAllProducts(
  shopUrl: string,
  onProgress: (message: string) => void,
  opts: { maxPages?: number } = {}
): Promise<ShopifyProduct[]> {
  let products: ShopifyProduct[] = [];
  let page = 1;
  const limit = 250;

  onProgress("Starting product fetch...");

  while (true) {
    const url = `${shopUrl}/products.json?limit=${limit}&page=${page}`;
    onProgress(`Fetching product page ${page}...`);
    const data = await fetchJson<{ products: ShopifyProduct[] }>(url);

    if (data.products.length === 0) {
      onProgress("All product pages fetched.");
      break;
    }

    products = products.concat(data.products);
    onProgress(`Fetched ${data.products.length} products. Total: ${products.length}.`);
    page++;
    if (opts.maxPages && page > opts.maxPages) {
      onProgress(`Reached page limit (${opts.maxPages}). Stopping.`);
      break;
    }
  }
  return products;
}

// Fetches all collections
export async function fetchAllCollections(
  shopUrl: string,
  onProgress: (message: string) => void,
  opts: { maxCollections?: number } = {}
): Promise<ShopifyCollection[]> {
    onProgress("Fetching collections...");
    const url = `${shopUrl}/collections.json`;
    const data = await fetchJson<{ collections: ShopifyCollection[] }>(url);
    let cleaned = data.collections.filter(c => (c.handle ?? '').trim().length > 0);
    if (opts.maxCollections && cleaned.length > opts.maxCollections) {
      cleaned = cleaned.slice(0, opts.maxCollections);
      onProgress(`Limiting to first ${opts.maxCollections} collections.`);
    }
    const removed = data.collections.length - cleaned.length;
    if (removed > 0) {
      onProgress(`Filtered out ${removed} collections without handles.`);
    }
    onProgress(`Fetched ${cleaned.length} collections.`);
    return cleaned;
}
