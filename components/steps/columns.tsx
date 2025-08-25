'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ShopifyProduct, ShopifyVariant } from '@/lib/types';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProductRowData = ShopifyProduct | ShopifyVariant;
function isVariant(data: ProductRowData): data is ShopifyVariant {
    return 'sku' in data && 'product_id' in data;
}

const SortableHeader = ({ column, title }: { column: any, title: string }) => {
    const sortDir = column.getIsSorted();
    return (
        <Button
            variant={sortDir ? "secondary" : "ghost"}
            onClick={() => column.toggleSorting(sortDir === "asc")}
            className="whitespace-nowrap"
        >
            {title}
            <div className="ml-2">
                <ArrowUp className={cn("h-3 w-3", sortDir === 'asc' ? 'text-foreground' : 'text-muted-foreground/50')} />
                <ArrowDown className={cn("h-3 w-3 -mt-1", sortDir === 'desc' ? 'text-foreground' : 'text-muted-foreground/50')} />
            </div>
        </Button>
    )
};


export const columns: ColumnDef<ProductRowData>[] = [
  {
    accessorKey: 'handle',
    header: ({ column }) => <SortableHeader column={column} title="Handle" />,
    size: 250,
    minSize: 150, // Add min/max sizes
    maxSize: 400,
    cell: ({ row }) => {
      const isParent = row.getCanExpand();
      const handle = isVariant(row.original) ? row.getParentRow()?.original.handle : row.original.handle;
      const fullHandleText = handle || '';
      return (
        <div style={{ paddingLeft: `${row.depth * 2}rem` }} className="flex items-center">
          {isParent ? (
            <button onClick={row.getToggleExpandedHandler()} style={{ cursor: 'pointer' }} className="mr-2">
              {row.getIsSorted() ? '▼' : '►'}
            </button>
          ) : <span className="mr-2 w-4 inline-block"></span>}
          <span className="truncate" title={fullHandleText}>{fullHandleText}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'title',
    header: ({ column }) => <SortableHeader column={column} title="Product Title" />,
    size: 300,
    minSize: 200,
    cell: ({ row }) => {
        const title = row.depth === 0 ? (row.getValue('title') as string) : '';
        return <div className="truncate" title={title}>{title}</div>;
    },
  },
  {
    accessorKey: 'images',
    header: 'Images',
    size: 200,
    minSize: 100,
    cell: ({ row }) => {
      if (row.depth !== 0) return null;
      const images = (row.original as ShopifyProduct).images;
      if (!images || images.length === 0) return null;
      return (
        <div className="flex flex-row flex-wrap items-center gap-1 min-w-[180px]">
          {images.map((img) => (
            <div key={img.id} className="relative h-10 w-10">
                <Image src={img.src} alt={img.alt || 'Product image'} fill sizes="40px" className="rounded object-cover" />
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
    minSize: 100,
    cell: ({ row }) => {
        const type = row.depth === 0 ? (row.original as ShopifyProduct).product_type : '';
        return <div className="truncate" title={type}>{type}</div>
    },
  },
  {
    accessorKey: 'vendor',
    header: ({ column }) => <SortableHeader column={column} title="Vendor" />,
    size: 150,
    minSize: 100,
    cell: ({ row }) => {
        const vendor = row.depth === 0 ? (row.original as ShopifyProduct).vendor : '';
        return <div className="truncate" title={vendor}>{vendor}</div>
    },
  },
  {
    id: 'price',
    header: ({ column }) => <SortableHeader column={column} title="Price" />,
    size: 100,
    minSize: 80,
    maxSize: 150,
    accessorFn: (row) => {
        const priceString = isVariant(row) ? row.price : (row as ShopifyProduct).variants?.[0]?.price;
        return parseFloat(priceString || '0');
    },
    cell: ({ row }) => {
      const price = isVariant(row.original) ? row.original.price : (row.original as ShopifyProduct).variants?.[0]?.price;
      return price ? `$${price}` : '';
    }
  },
  {
    accessorKey: 'body_html',
    header: 'Body HTML',
    size: 100,
    minSize: 80,
    maxSize: 150,
    cell: ({ row }) => {
      if (row.depth !== 0) return null;
      const bodyHtml = (row.original as ShopifyProduct).body_html;
      if (!bodyHtml?.trim()) return null;
      return (
        <Dialog>
          <DialogTrigger asChild><Button variant="outline" size="sm">View</Button></DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{(row.original as ShopifyProduct).title}</DialogTitle>
              <DialogDescription className="sr-only">Product body HTML content</DialogDescription>
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
    size: 100,
    minSize: 80,
    maxSize: 150,
    cell: ({ row }) => {
        if (row.depth !== 0) return null;
        let tags = (row.original as ShopifyProduct).tags;
        let tagArray: string[] = [];
        if (typeof tags === 'string' && tags.trim()) { tagArray = tags.split(',').map(tag => tag.trim()).filter(Boolean); }
        else if (Array.isArray(tags)) { tagArray = tags.filter(Boolean); }
        if (tagArray.length === 0) return null;
        return (
            <Dialog>
                <DialogTrigger asChild><Button variant="outline" size="sm">View ({tagArray.length})</Button></DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Tags</DialogTitle>
                      <DialogDescription className="sr-only">A list of product tags</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-wrap gap-2">{tagArray.map(tag => (<Badge key={tag} variant="secondary">{tag}</Badge>))}</div>
                </DialogContent>
            </Dialog>
        );
    }
  },
  {
    accessorKey: 'updated_at',
    header: ({ column }) => <SortableHeader column={column} title="Updated At" />,
    size: 120,
    minSize: 100,
    cell: ({ row }) => new Date(row.getValue('updated_at')).toLocaleDateString(),
  },
];