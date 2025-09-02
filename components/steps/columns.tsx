'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ShopifyProduct, ShopifyVariant } from '@/lib/types';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HtmlEditor } from '@/components/HtmlEditor';
import { CachedImage } from '@/lib/cache-client';

export type ProductRowData = ShopifyProduct | ShopifyVariant;

export function isVariant(data: ProductRowData): data is ShopifyVariant {
    return 'sku' in data && 'product_id' in data;
}

// ## FINAL HEADER COMPONENT ##
const SortableHeader = ({ column, title }: { column: any, title: string }) => {
  const sortDir = column.getIsSorted();
  const isActive = !!sortDir;
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(sortDir === "asc")}
      className={cn(
        "w-full h-full justify-start",
        // Fill the header cell area and invert colors when active
        isActive
          ? "bg-gray-800 text-white hover:bg-gray-800"
          : "text-gray-900 hover:bg-gray-200"
      )}
    >
      <span className={cn(isActive ? "text-white" : "text-gray-900")}>{title}</span>
      <div className="ml-auto flex items-center -space-x-1 pl-2">
        <ArrowUp className={cn("h-4 w-4", sortDir === 'asc' ? (isActive ? 'text-white' : 'text-gray-900') : (isActive ? 'text-white/70' : 'text-gray-600'))} />
        <ArrowDown className={cn("h-4 w-4", sortDir === 'desc' ? (isActive ? 'text-white' : 'text-gray-900') : (isActive ? 'text-white/70' : 'text-gray-600'))} />
      </div>
    </Button>
  )
};

export const columns: ColumnDef<ProductRowData>[] = [
  {
    accessorKey: 'handle',
    header: ({ column }) => <SortableHeader column={column} title="Handle" />,
    size: 250,
    cell: ({ row }) => {
      const isParent = row.getCanExpand();
      const handle = isVariant(row.original)
        ? (row.getParentRow()?.original as ShopifyProduct)?.handle
        : row.original.handle;
      return (
        <div style={{ paddingLeft: `${row.depth * 1.5}rem` }} className="flex items-center">
          {isParent ? (
            <button {...{ onClick: row.getToggleExpandedHandler(), style: { cursor: 'pointer' } }} className="mr-2">
              {row.getIsExpanded() ? '▼' : '►'}
            </button>
          ) : <span className="mr-2 w-4 inline-block"></span>}
          <span className="line-clamp-2 font-medium">{handle}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'title',
    header: ({ column }) => <SortableHeader column={column} title="Product Title" />,
    size: 350,
    cell: ({ row, getValue }) => {
      return <span className={cn("line-clamp-2", isVariant(row.original) && "text-muted-foreground pl-4")}>{getValue() as string}</span>
    }
  },
  {
    accessorKey: 'images',
    header: () => <span className="text-gray-900">Images</span>,
    size: 250, // Increased size to show more images
    cell: ({ row }) => {
      if (isVariant(row.original)) return null;
      const images = row.original.images;
      if (!images || images.length === 0) return null;
      return (
        <div className="flex flex-row flex-wrap items-center gap-1 overflow-hidden">
          {images.slice(0, 6).map((img, index) => (
            <Dialog key={img.id}>
              <DialogTrigger asChild>
                <div className="relative h-10 w-10 cursor-pointer flex-shrink-0">
                  <CachedImage
                    src={img.src}
                    alt={img.alt || 'Product image'}
                    fill
                    sizes="40px"
                    className="rounded object-cover hover:scale-105 transition-transform"
                  />
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>{img.alt || 'Product Image'}</DialogTitle>
                </DialogHeader>
                <div className="relative h-96">
                  <CachedImage
                    src={img.src}
                    alt={img.alt || 'Product image'}
                    fill
                    sizes="100vw"
                    className="object-contain"
                  />
                </div>
              </DialogContent>
            </Dialog>
          ))}
          {images.length > 6 && (
            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-xs font-medium flex-shrink-0">
              +{images.length - 6}
            </div>
          )}
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
    header: () => <span className="text-gray-900">Body HTML</span>,
    size: 120,
    cell: ({ row }) => {
        if (isVariant(row.original)) return null;
        const bodyHtml = row.original.body_html;
        if (!bodyHtml?.trim()) return null;
        return (
            <HtmlEditor
                title={row.original.title || 'Product'}
                initialHtml={bodyHtml}
                onSave={(newHtml) => {
                    // This would need to be handled by the parent component
                    // For now, we'll just log it
                    console.log('HTML updated:', newHtml);
                }}
                trigger={<Button variant="outline" size="sm">Edit HTML</Button>}
            />
        );
    },
  },
  {
    accessorKey: 'tags',
    header: () => <span className="text-gray-900">Tags</span>,
    size: 120,
    cell: ({ row }) => {
        if (isVariant(row.original)) return null;
        const tags = row.original.tags;
        const tagArray: string[] = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : (Array.isArray(tags) ? tags.filter(Boolean) : []);
        if (tagArray.length === 0) return null;
        return (
            <div className="flex flex-wrap gap-1">
                {tagArray.slice(0, 2).map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                {tagArray.length > 2 && (
                    <Dialog>
                        <DialogTrigger asChild><Badge variant="outline" className="cursor-pointer">+{tagArray.length - 2}</Badge></DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>All Tags</DialogTitle></DialogHeader>
                            <div className="flex flex-wrap gap-2">{tagArray.map(tag => (<Badge key={tag} variant="secondary">{tag}</Badge>))}</div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        );
    }
  },
  {
    accessorKey: 'updated_at',
    header: ({ column }) => <SortableHeader column={column} title="Updated At" />,
    size: 150,
    cell: ({ row }) => {
      const date = row.original.updated_at;
      return new Date(date).toLocaleDateString();
    },
  },
];
