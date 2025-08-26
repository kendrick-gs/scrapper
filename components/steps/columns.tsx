// kendrick-gs/scrapper/scrapper-a31e4028cc7f75eeeb406d17e6548fcd50443ca8/components/steps/columns.tsx
'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { ShopifyProduct, ShopifyVariant } from '@/lib/types';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

// Define a union type for rows, which can be a product or a variant
export type ProductRowData = ShopifyProduct | ShopifyVariant;

// Type guard to check if a row is a variant
export function isVariant(row: ProductRowData): row is ShopifyVariant {
  return 'price' in row && !('vendor' in row);
}

const columnHelper = createColumnHelper<ProductRowData>();

export const columns = [
  columnHelper.accessor('title', {
    header: 'Product Title',
    size: 350, // Initial size
    cell: (info) => {
      const original = info.row.original;
      if (isVariant(original)) {
        // It's a variant row
        return <span className="pl-6 text-gray-600">{original.title}</span>;
      }
      // It's a product row
      return (
        <div className="flex items-center gap-3">
          {original.images?.[0]?.src && (
            <Image
              src={original.images[0].src}
              alt={original.title}
              width={40}
              height={40}
              className="rounded-md object-cover"
            />
          )}
          <span className="font-medium">{original.title}</span>
        </div>
      );
    },
  }),
  columnHelper.accessor((row) => (isVariant(row) ? row.price : row.status), {
    id: 'statusOrPrice',
    header: 'Status / Price',
    size: 150,
    cell: (info) => {
      const original = info.row.original;
      if (isVariant(original)) {
        return `$${original.price}`;
      }
      return <Badge variant={original.status === 'active' ? 'default' : 'secondary'}>{original.status}</Badge>;
    },
  }),
  columnHelper.accessor('vendor', {
    header: 'Vendor',
    size: 200,
    cell: (info) => isVariant(info.row.original) ? '' : info.getValue(),
  }),
  columnHelper.accessor('product_type', {
    header: 'Product Type',
    size: 200,
    cell: (info) => isVariant(info.row.original) ? '' : info.getValue(),
  }),
  columnHelper.accessor((row) => (isVariant(row) ? row.sku : (row.variants?.length ?? 0)), {
    id: 'skuOrVariantCount',
    header: 'SKU / Variants',
    size: 150,
    cell: (info) => {
        const original = info.row.original;
        if (isVariant(original)) {
            return original.sku || 'N/A';
        }
        return `${original.variants.length} variant(s)`;
    }
  }),
];