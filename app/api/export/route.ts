import { NextRequest, NextResponse } from 'next/server';
import { ShopifyProduct } from '@/lib/types';
import Papa from 'papaparse';

// This function transforms your product JSON into the format Shopify expects
function formatForShopifyImport(products: ShopifyProduct[]): any[] {
  const shopifyRows: any[] = [];

  products.forEach(product => {
    // Each variant gets its own row in the CSV
    product.variants.forEach((variant, index) => {
      const isFirstVariant = index === 0;
      shopifyRows.push({
        'Handle': product.handle,
        'Title': isFirstVariant ? product.title : '',
        'Body (HTML)': isFirstVariant ? product.body_html : '',
        'Vendor': isFirstVariant ? product.vendor : '',
        'Product Category': '', // Shopify requires this header
        'Type': isFirstVariant ? product.product_type : '',
        'Tags': isFirstVariant ? product.tags : '',
        'Published': product.status === 'active' ? 'TRUE' : 'FALSE',
        'Option1 Name': 'Title', // Simplified for this example
        'Option1 Value': variant.title,
        'Option2 Name': '',
        'Option2 Value': '',
        'Option3 Name': '',
        'Option3 Value': '',
        'Variant SKU': variant.sku,
        'Variant Grams': '',
        'Variant Inventory Tracker': '',
        'Variant Inventory Qty': '',
        'Variant Inventory Policy': 'deny',
        'Variant Fulfillment Service': 'manual',
        'Variant Price': variant.price,
        'Variant Compare At Price': '',
        'Variant Requires Shipping': 'TRUE',
        'Variant Taxable': 'TRUE',
        'Variant Barcode': '',
        'Image Src': isFirstVariant ? product.images?.[0]?.src || '' : '',
        'Image Position': isFirstVariant ? '1' : '',
        'Image Alt Text': isFirstVariant ? product.images?.[0]?.alt || '' : '',
        'Gift Card': 'FALSE',
        'SEO Title': '',
        'SEO Description': '',
        'Google Shopping / Google Product Category': '',
        'Google Shopping / Gender': '',
        'Google Shopping / Age Group': '',
        'Google Shopping / MPN': '',
        'Google Shopping / AdWords Grouping': '',
        'Google Shopping / AdWords Labels': '',
        'Google Shopping / Condition': '',
        'Google Shopping / Custom Product': '',
        'Google Shopping / Custom Label 0': '',
        'Google Shopping / Custom Label 1': '',
        'Google Shopping / Custom Label 2': '',
        'Google Shopping / Custom Label 3': '',
        'Google Shopping / Custom Label 4': '',
        'Variant Image': '',
        'Variant Weight Unit': 'kg',
        'Variant Tax Code': '',
        'Cost per item': '',
        'Price / International': '',
        'Compare At Price / International': '',
        'Status': product.status
      });
    });
  });

  return shopifyRows;
}

export async function POST(req: NextRequest) {
  try {
    const { products } = (await req.json()) as { products: ShopifyProduct[] };
    if (!products) {
      return NextResponse.json({ error: 'No products provided' }, { status: 400 });
    }

    const formattedData = formatForShopifyImport(products);
    const csv = Papa.unparse(formattedData);

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="shopify_import.csv"',
      },
    });

  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}