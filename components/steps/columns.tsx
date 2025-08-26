'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ShopifyProduct, ShopifyVariant } from '@/lib/types';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProductRowData = ShopifyProduct | ShopifyVariant;

export function isVariant(data: ProductRowData): data is ShopifyVariant {
    return 'sku' in data && 'product_id' in data;
}

// ## UPDATED SortableHeader COMPONENT ##
const SortableHeader = ({ column, title }: { column: any, title: string }) => {
    const sortDir = column.getIsSorted();
    return (
        <Button
            variant={sortDir ? "default" : "ghost"}
            onClick={() => column.toggleSorting(sortDir === "asc")}
            // This makes the button fill the entire header cell
            className="w-full h-full justify-start px-2"
        >
            <span className="flex-grow text-left">{title}</span>
            <div className="ml-2 flex items-center -space-x-1">
                <ArrowUp className={cn("h-4 w-4", sortDir === 'asc' ? 'text-primary-foreground' : 'text-muted-foreground/50')} />
                <ArrowDown className={cn("h-4 w-4", sortDir === 'desc' ? 'text-primary-foreground' : 'text-muted-foreground/50')} />
            </div>
        </Button>
    )
};

export const columns: ColumnDef<ProductRowData>[] = [
  {
    accessorKey: 'handle',
    header: ({ column }) => <SortableHeader column={column} title="Handle" />,
    size: 250,
    cell: ({ row, getValue }) => {
      const isParent = row.getCanExpand();
      const handle = isVariant(row.original)
        ? (row.getParentRow()?.original as ShopifyProduct)?.handle
        : row.original.handle;

      return (
        <div style={{ paddingLeft: `${row.depth * 2}rem` }} className="flex items-center">
          {isParent ? (
            <button {...{ onClick: row.getToggleExpandedHandler(), style: { cursor: 'pointer' } }} className="mr-2">
              {row.getIsExpanded() ? '▼' : '►'}
            </button>
          ) : <span className="mr-2 w-4 inline-block"></span>}
          {/* Add truncation class here */}
          <span className="line-clamp-2">{handle}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'title',
    header: ({ column }) => <SortableHeader column={column} title="Product Title" />,
    size: 350,
    cell: ({ row }) => {
      const title = isVariant(row.original) ? row.original.title : row.original.title;
      // Add truncation class here
      return <span className={cn("line-clamp-2", isVariant(row.original) && "text-gray-600")}>{title}</span>
    }
  },
  {
    accessorKey: 'images',
    header: 'Images',
    size: 200,
    cell: ({ row }) => {
      if (isVariant(row.original)) return null;
      const images = row.original.images;
      if (!images || images.length === 0) return null;
      return (
        <div className="flex flex-row flex-wrap items-center gap-1 min-w-[180px]">
          {images.map((img) => (
            <div key={img.id} className="relative h-12 w-12">
              <Image src={img.src} alt={img.alt || 'Product image'} fill sizes="48px" className="rounded object-cover" />
            </div>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: 'product_type',
    header: ({ column }) => <SortableHeader column={column} title="Product Type" />,
    size: 150,
    cell: ({ row }) => <span className="line-clamp-2">{isVariant(row.original) ? '' : row.original.product_type}</span>,
  },
  {
    accessorKey: 'vendor',
    header: ({ column }) => <SortableHeader column={column} title="Vendor" />,
    size: 150,
    cell: ({ row }) => <span className="line-clamp-2">{isVariant(row.original) ? '' : row.original.vendor}</span>,
  },
  {
    id: 'price',
    header: ({ column }) => <SortableHeader column={column} title="Price" />,
    size: 100,
    accessorFn: (row) => parseFloat(isVariant(row) ? row.price : row.variants?.[0]?.price || '0'),
    cell: ({ row }) => {
      const price = isVariant(row.original) ? row.original.price : row.original.variants?.[0]?.price;
      return price ? `$${price}` : '';
    }
  },
  {
    accessorKey: 'body_html',
    header: 'Body HTML',
    size: 120,
    cell: ({ row }) => {
      if (isVariant(row.original)) return null;
      const bodyHtml = row.original.body_html;
      if (!bodyHtml?.trim()) return null;
      return (
        <Dialog>
          <DialogTrigger asChild><Button variant="outline" size="sm">View</Button></DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{row.original.title}</DialogTitle>
            </DialogHeader>
            <div className="prose dark:prose-invert max-h-[70vh] overflow-y-auto" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          </DialogContent>
        </Dialog>
      );
    },
  },
  {
    accessorKey: 'tags',
    header: 'Tags',
    size: 120,
    cell: ({ row }) => {
      if (isVariant(row.original)) return null;
      const tags = row.original.tags;
      const tagArray: string[] = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : (Array.isArray(tags) ? tags.filter(Boolean) : []);
      if (tagArray.length === 0) return null;
      return (
        <div className="flex flex-wrap gap-1">
          {tagArray.slice(0, 2).map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
          {tagArray.length > 2 && <Badge variant="outline">+{tagArray.length - 2}</Badge>}
        </div>
      );
    }
  },
  {
    accessorKey: 'updated_at',
    header: ({ column }) => <SortableHeader column={column} title="Updated At" />,
    size: 150,
    cell: ({ row }) => {
      const date = isVariant(row.original) ? row.original.updated_at : row.original.updated_at;
      return new Date(date).toLocaleDateString();
    },
  },
];