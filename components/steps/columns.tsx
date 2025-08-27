import { ColumnDef } from '@tanstack/react-table';
import { ShopifyProduct, ShopifyVariant } from '@/lib/types';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProductRowData = ShopifyProduct | ShopifyVariant;

export function isVariant(data: ProductRowData): data is ShopifyVariant {
    return 'sku' in data && 'product_id' in data;
}

const SortableHeader = ({ column, title }: { column: any, title: string }) => {
    const sortDir = column.getIsSorted();
    return (
        <Button
            variant={sortDir ? "default" : "ghost"}
            onClick={() => column.toggleSorting(sortDir === "asc")}
            // ## UPDATED: Added px-4 for horizontal padding ##
            className="w-full h-full justify-start px-4"
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
    cell: ({ row }) => { /* ... cell logic ... */ },
  },
  {
    accessorKey: 'title',
    header: ({ column }) => <SortableHeader column={column} title="Product Title" />,
    size: 350,
    cell: ({ row }) => { /* ... cell logic ... */ },
  },
  {
    accessorKey: 'images',
    // ## UPDATED: Added padded div for non-sortable header ##
    header: () => <div className="px-4 text-left font-medium">Images</div>,
    size: 200,
    cell: ({ row }) => { /* ... cell logic ... */ },
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
    cell: ({ row }) => { /* ... cell logic ... */ },
  },
  {
    accessorKey: 'body_html',
    // ## UPDATED: Added padded div for non-sortable header ##
    header: () => <div className="px-4 text-left font-medium">Body HTML</div>,
    size: 120,
    cell: ({ row }) => { /* ... cell logic ... */ },
  },
  {
    accessorKey: 'tags',
    // ## UPDATED: Added padded div for non-sortable header ##
    header: () => <div className="px-4 text-left font-medium">Tags</div>,
    size: 120,
    cell: ({ row }) => { /* ... cell logic ... */ },
  },
  {
    accessorKey: 'updated_at',
    header: ({ column }) => <SortableHeader column={column} title="Updated At" />,
    size: 150,
    cell: ({ row }) => { /* ... cell logic ... */ },
  },
];
