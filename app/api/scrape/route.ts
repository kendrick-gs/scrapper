import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { scrapeCache } from '@/lib/cache';
import { fetchAllProducts, fetchAllCollections } from '@/lib/shopify-scraper';

export async function POST(req: NextRequest) {
  // Add a try...catch block around the entire function
  try {
    const body = await req.json();
    const { shopUrl } = body;

    if (!shopUrl) {
      return NextResponse.json({ error: 'shopUrl is required' }, { status: 400 });
    }
    
    // It's good practice to validate the URL format
    let normalizedUrl;
    try {
        normalizedUrl = new URL(shopUrl).origin;
    } catch (urlError) {
        return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }
    
    const sessionId = uuidv4();

    // We don't await this, it runs in the background
    scrapeAndCache(normalizedUrl, sessionId);

    return NextResponse.json({ sessionId });

  } catch (error: any) {
    // This will catch any errors, including JSON parsing errors in the request
    console.error("Error in /api/scrape:", error); // Log the full error to the server console
    return NextResponse.json(
      { error: "An internal server error occurred.", details: error.message }, 
      { status: 500 }
    );
  }
}

async function scrapeAndCache(shopUrl: string, sessionId: string) {
    const streamKey = `stream-${sessionId}`;
    const dataKey = `data-${sessionId}`;

    const updateProgress = (message: string) => {
        const existing = scrapeCache.get<string[]>(streamKey) || [];
        scrapeCache.set(streamKey, [...existing, message]);
    };

    try {
        const [products, collections] = await Promise.all([
            fetchAllProducts(shopUrl, updateProgress),
            fetchAllCollections(shopUrl, updateProgress),
        ]);
        
        const vendorCounts: { [key: string]: number } = {};
        products.forEach(product => {
            vendorCounts[product.vendor] = (vendorCounts[product.vendor] || 0) + 1;
        });

        const vendors = Object.keys(vendorCounts)
            .map(name => ({
                name: name,
                count: vendorCounts[name]
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        const productTypes = [...new Set(products.map(p => p.product_type))].sort();
        
        scrapeCache.set(dataKey, {
            products,
            collections,
            vendors,
            productTypes,
            status: 'completed',
        });
        updateProgress('---DONE---');

    } catch (error: any) {
        console.error(`Scraping error for session ${sessionId}:`, error);
        updateProgress(`Error: ${error.message}`);
        updateProgress('---ERROR---');
        scrapeCache.set(dataKey, { status: 'error', message: error.message });
    }
}