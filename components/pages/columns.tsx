"use client";

import { ColumnDef } from '@tanstack/react-table';
import { ShopifyProduct, ShopifyVariant } from '@/lib/types';
import { CachedImage } from '@/components/CachedImage';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProductRowData = ShopifyProduct | ShopifyVariant;
export function isVariant(data: ProductRowData): data is ShopifyVariant { return 'sku' in data && 'product_id' in data; }

const SortableHeader = ({ column, title }: { column: any, title: string }) => {
	const sortDir = column.getIsSorted();
	return (
		<Button variant={sortDir ? 'default' : 'ghost'} onClick={() => column.toggleSorting(sortDir === 'asc')} className="w-full h-full justify-start">
			<span>{title}</span>
			<div className="ml-auto flex items-center -space-x-1 pl-2">
				<ArrowUp className={cn('h-4 w-4', sortDir === 'asc' ? 'text-primary-foreground' : 'text-muted-foreground/50')} />
				<ArrowDown className={cn('h-4 w-4', sortDir === 'desc' ? 'text-primary-foreground' : 'text-muted-foreground/50')} />
			</div>
		</Button>
	);
};

export const columns: ColumnDef<ProductRowData>[] = [
	{
		accessorKey: 'handle',
		header: ({ column }) => <SortableHeader column={column} title="Handle" />,
		size: 250,
		minSize: 180,
		cell: ({ row }) => {
			const isParent = row.getCanExpand();
			const handle = isVariant(row.original) ? (row.getParentRow()?.original as ShopifyProduct)?.handle : (row.original as ShopifyProduct).handle;
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
		minSize: 220,
		cell: ({ row, getValue }) => <span className={cn('line-clamp-2', isVariant(row.original) && 'text-muted-foreground pl-4')}>{getValue() as string}</span>
	},
	{
		accessorKey: 'images',
		header: 'Images',
		size: 200,
		minSize: 150,
		cell: ({ row }) => {
			if (isVariant(row.original)) return null;
			const images = (row.original as ShopifyProduct).images;
			if (!images || images.length === 0) return null;
			// Each thumb 48px + 4px gap (approx). We'll measure container width via resize observer hook like pattern.
			// Since we are inside a cell, we can approximate number fit using parent column size (row.getVisibleCells find this col id).
			try {
				const colSize = (row.getVisibleCells().find(c => c.column.id === 'images')?.column.getSize()) || 200;
				const thumbSize = 48; const gap = 4; const unit = thumbSize + gap;
				const maxVisible = Math.max(1, Math.floor((colSize - 4) / unit));
				const visibleImages = images.slice(0, maxVisible);
				const remaining = images.length - visibleImages.length;
				return (
					<div className="flex items-center gap-1 overflow-hidden">
						{visibleImages.map(img => (
							<Dialog key={img.id}>
								<DialogTrigger asChild>
									<div className="relative h-12 w-12 shrink-0 cursor-pointer">
										<CachedImage src={img.src} alt={img.alt || 'Product image'} className="h-12 w-12 rounded object-cover" />
									</div>
								</DialogTrigger>
								<DialogContent className="max-w-3xl">
									<DialogHeader><DialogTitle>{img.alt || 'Product Image'}</DialogTitle></DialogHeader>
									<div className="relative h-96">
										<CachedImage src={img.src} alt={img.alt || 'Product image'} className="h-full w-full object-contain" />
									</div>
								</DialogContent>
							</Dialog>
						))}
						{remaining > 0 && (
							<Dialog>
								<DialogTrigger asChild>
									<button className="h-12 w-12 shrink-0 rounded bg-muted text-xs font-medium flex items-center justify-center hover:bg-muted/70" aria-label={`+${remaining} more images`}>
										+{remaining}
									</button>
								</DialogTrigger>
								<DialogContent className="max-w-4xl">
									<DialogHeader><DialogTitle>All Images</DialogTitle></DialogHeader>
									<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[70vh] overflow-y-auto p-2">
										{images.map(img => (
											<div key={img.id} className="relative w-full aspect-square">
												<CachedImage src={img.src} alt={img.alt || 'Product image'} className="absolute inset-0 h-full w-full object-cover rounded" />
											</div>
										))}
									</div>
								</DialogContent>
							</Dialog>
						)}
					</div>
				);
			} catch {
				return null;
			}
		},
	},
	{
		accessorKey: 'product_type',
		header: ({ column }) => <SortableHeader column={column} title="Product Type" />,
		size: 150,
		minSize: 170,
		cell: ({ row }) => <span className="line-clamp-2">{isVariant(row.original) ? '' : (row.original as ShopifyProduct).product_type}</span>,
	},
	{
		accessorKey: 'vendor',
		header: ({ column }) => <SortableHeader column={column} title="Vendor" />,
		size: 150,
		minSize: 160,
		cell: ({ row }) => <span className="line-clamp-2">{isVariant(row.original) ? '' : (row.original as ShopifyProduct).vendor}</span>,
	},
	{
		id: 'price',
		header: ({ column }) => <SortableHeader column={column} title="Price" />,
		size: 100,
		minSize: 110,
		accessorFn: (row) => parseFloat(isVariant(row) ? row.price : row.variants?.[0]?.price || '0'),
		cell: ({ row }) => {
			const price = isVariant(row.original) ? row.original.price : (row.original as ShopifyProduct).variants?.[0]?.price;
			return price ? `$${price}` : '';
		}
	},
	{
		accessorKey: 'body_html',
		header: 'Body HTML',
		size: 120,
		enableResizing: false,
		cell: ({ row }) => {
			if (isVariant(row.original)) return null;
			const bodyHtml = (row.original as ShopifyProduct).body_html;
			if (!bodyHtml?.trim()) return null;
			return (
				<Dialog>
					<DialogTrigger asChild><Button variant="outline" size="sm">View</Button></DialogTrigger>
					<DialogContent className="max-w-3xl">
						<DialogHeader><DialogTitle>{(row.original as ShopifyProduct).title}</DialogTitle></DialogHeader>
						<div className="prose dark:prose-invert max-h-[70vh] overflow-y-auto" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
					</DialogContent>
				</Dialog>
			);
		},
	},
	{
		accessorKey: 'tags',
		header: 'Tags',
		size: 140,
		minSize: 90,
		maxSize: 260,
		cell: ({ row }) => {
			if (isVariant(row.original)) return null;
			const tags = (row.original as ShopifyProduct).tags;
			const tagArray: string[] = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : (Array.isArray(tags) ? tags.filter(Boolean) : []);
			if (tagArray.length === 0) return null;
			return (
				<div className="flex flex-col gap-1 max-w-full overflow-hidden">
					{tagArray.slice(0, 2).map(tag => <Badge key={tag} variant="secondary" className="truncate max-w-full">{tag}</Badge>)}
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
		minSize: 140,
		cell: ({ row }) => { const date = (row.original as any).updated_at; return new Date(date).toLocaleDateString(); },
	},
];
