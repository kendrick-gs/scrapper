// Create this new file: app/api/scrape-and-stream/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchAllProducts, fetchAllCollections } from '@/lib/shopify-scraper';
import { ShopifyProduct, ShopifyCollection } from '@/lib/types';
import { getUserFromRequest } from '@/lib/auth';
import { addHistory, loadCachedScrape, saveCachedScrape, upsertStoreMeta } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const { shopUrl, force } = await req.json();
    if (!shopUrl) {
      return NextResponse.json({ error: 'shopUrl is required' }, { status: 400 });
    }
    const userEmail = getUserFromRequest(req);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        
        const onProgress = (message: string) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message })}\n\n`));
        };

        try {
          onProgress("Starting scrape...");
          // Check cache for logged-in users
          if (userEmail && !force) {
            const cached = await loadCachedScrape<{ products: ShopifyProduct[]; collections: ShopifyCollection[] }>(userEmail, shopUrl);
            if (cached) {
              onProgress("Loaded results from cache.");
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ finished: true, data: { ...cached } })}\n\n`));
              controller.close();
              return;
            }
          }

          const anon = !userEmail;
          if (anon) {
            onProgress("Note: Not logged in. Only first 250 products and collections will be fetched.");
          }
          const [products, collections] = await Promise.all([
            fetchAllProducts(shopUrl, onProgress, { maxPages: anon ? 1 : undefined }),
            fetchAllCollections(shopUrl, onProgress, { maxCollections: anon ? 250 : undefined }),
          ]);
          onProgress("Data processing complete.");

          // Process data to get vendors and product types
          const vendorCounts: { [key: string]: number } = {};
          products.forEach(product => {
              vendorCounts[product.vendor] = (vendorCounts[product.vendor] || 0) + 1;
          });
          const vendors = Object.keys(vendorCounts)
              .map(name => ({ name: name, count: vendorCounts[name] }))
              .sort((a, b) => a.name.localeCompare(b.name));
          const productTypes = [...new Set(products.map(p => p.product_type))].sort();

          const finalData = {
            products,
            collections,
            vendors,
            productTypes,
          };

          // Save to cache and history for logged-in users
          if (userEmail) {
            await saveCachedScrape(userEmail, shopUrl, { products, collections });
            await upsertStoreMeta(userEmail, shopUrl, {
              lastUpdated: new Date().toISOString(),
              productCount: products.length,
              collectionCount: collections.length,
            });
            await addHistory({
              email: userEmail,
              shopUrl,
              date: new Date().toISOString(),
              productCount: products.length,
              collectionCount: collections.length,
            });
          }

          // Send the final payload
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ finished: true, data: finalData })}\n\n`));
          controller.close();

        } catch (error: any) {
          console.error("Scraping error in stream:", error);
          const errorMessage = `data: ${JSON.stringify({ error: error.message })}\n\n`;
          controller.enqueue(encoder.encode(errorMessage));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    return NextResponse.json({ error: "An internal server error occurred.", details: error.message }, { status: 500 });
  }
}
