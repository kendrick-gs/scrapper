// Create this new file: app/api/scrape-and-stream/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchAllProducts, fetchAllCollections } from '@/lib/shopify-scraper';
import { ShopifyProduct, ShopifyCollection } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { shopUrl } = await req.json();
    if (!shopUrl) {
      return NextResponse.json({ error: 'shopUrl is required' }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        
        const onProgress = (message: string) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message })}\n\n`));
        };

        try {
          onProgress("Starting scrape...");
          const [products, collections] = await Promise.all([
            fetchAllProducts(shopUrl, onProgress),
            fetchAllCollections(shopUrl, onProgress),
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