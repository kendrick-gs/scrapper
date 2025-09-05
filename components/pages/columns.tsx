"use client";

import { ColumnDef } from '@tanstack/react-table';
import React from 'react';
import { useLayoutEffect } from 'react';
import { ShopifyProduct, ShopifyVariant } from '@/lib/types';
import { CachedImage } from '@/components/CachedImage';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProductRowData = ShopifyProduct | ShopifyVariant;
export function isVariant(data: ProductRowData): data is ShopifyVariant { return 'sku' in data && 'product_id' in data; }

// Column min widths
const MIN_COLUMN_SIZES: Record<string, number> = { handle:180, title:220, option:140, images:150, product_type:180, vendor:170, price:130, updated_at:150 };

const SortableHeader = ({ column, title }: { column: any; title: string }) => {
	const sortDir = column.getIsSorted();
	const minForCol = MIN_COLUMN_SIZES[column.id] ?? 140;
	useLayoutEffect(()=>{ if(column.getSize() < minForCol) column.setSize(minForCol); },[column,minForCol]);
	// Consistent icon coloring: always show both; highlight active direction; ensure contrast when sorted (default variant)
	const upActive = sortDir==='asc';
	const downActive = sortDir==='desc';
	const inactiveOnActiveBg = 'text-primary-foreground/35';
	return (
		<Button
			variant={sortDir? 'default':'ghost'}
			onClick={()=>column.toggleSorting(sortDir==='asc')}
			className={cn(
				'group w-full h-full justify-start px-3 pr-5 gap-2 whitespace-nowrap transition-colors',
				!sortDir && 'hover:bg-primary hover:text-primary-foreground'
			)}
			style={{minWidth:minForCol}}
		>
			<span className={cn(
				'whitespace-nowrap leading-none transition-colors',
				sortDir ? 'text-primary-foreground' : 'text-foreground group-hover:text-primary-foreground'
			)}>{title}</span>
			<div className="ml-auto flex items-center gap-0.5 pl-1 pr-1">
				<ArrowUp className={cn('h-4 w-4 flex-none transition-colors',
					upActive ? 'text-primary-foreground' : (sortDir ? inactiveOnActiveBg : 'text-muted-foreground/45 group-hover:text-primary-foreground/90')
				)} />
				<ArrowDown className={cn('h-4 w-4 flex-none transition-colors',
					downActive ? 'text-primary-foreground' : (sortDir ? inactiveOnActiveBg : 'text-muted-foreground/45 group-hover:text-primary-foreground/90')
				)} />
			</div>
		</Button>
	);
};

export const columns: ColumnDef<ProductRowData>[] = [
	{ accessorKey:'handle', header: ({column})=> <SortableHeader column={column} title="Handle" />, size:250, minSize:180,
		cell: ({row})=>{ const isParent=row.getCanExpand(); const product = isVariant(row.original)? (row.getParentRow()?.original as ShopifyProduct) : (row.original as ShopifyProduct); const handle = product?.handle; let badge: React.ReactNode = null; if(!isVariant(row.original) && product){ const variants=product.variants||[]; const meaningful=variants.filter(v=>v.title!=='Default Title'); const variantCount=meaningful.length>1?meaningful.length:0; if(variantCount>0){ badge=<span className="ml-2 inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 h-5 text-[11px] font-medium tracking-tight shadow-sm backdrop-blur-sm">{variantCount}<span className="ml-1 hidden sm:inline">variants</span></span>; } } return <div style={{paddingLeft:`${row.depth*1.5}rem`}} className="flex items-center">{isParent? <button onClick={row.getToggleExpandedHandler()} aria-label={row.getIsExpanded()? 'Collapse row':'Expand row'} className="mr-2 cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground">{row.getIsExpanded()? '▼':'►'}</button> : <span className="mr-2 w-4 inline-block" /> }<span className="line-clamp-2 font-medium">{handle}</span>{badge}</div>; }
	},
	{ id:'option', header: ({column})=> <SortableHeader column={column} title="Options" />, size:170, minSize:140, meta:{ toggleable:true, group:'extra' },
		cell: ({row})=>{ if(isVariant(row.original)){ const v:any=row.original; const opts=v.__options&&v.__options.length?v.__options:[{name:v.__primaryOptionName||'Option', value:v.__optionValue||v.option1||v.title}]; const text=opts.map((o:any)=>`${o.name}: ${o.value}`).join(' • '); return <span className="pl-4 text-muted-foreground line-clamp-2" title={text}>{text}</span>; } const pv:any=row.original; return pv.__optionNames?.length? <span className="font-medium text-muted-foreground/80">{pv.__optionNames.join(' / ')}</span> : <span className="text-muted-foreground/40">—</span>; }
	},
	{ accessorKey:'title', header: ({column})=> <SortableHeader column={column} title="Title" />, size:320, minSize:220,
		cell: ({row, getValue})=>{ if(isVariant(row.original)){ const v:any=row.original; const opt=v.__optionValue||v.option1||v.title; return <span className="text-muted-foreground pl-4 line-clamp-2">{opt}</span>; } return <span className="line-clamp-2">{getValue() as string}</span>; }
	},
	{ accessorKey:'images', header:'Images', size:200, minSize:150,
		cell: ({row})=>{ if(isVariant(row.original)){ const v:any=row.original; const img=v.featured_image?.src||v.__imageSrc; if(!img) return null; return <div className="h-12 w-12"><CachedImage src={img} alt={v.title||'Variant image'} className="h-12 w-12 rounded object-cover" /></div>; } const images=(row.original as ShopifyProduct).images; if(!images||images.length===0) return null; try { const colSize=(row.getVisibleCells().find((c:any)=>c.column.id==='images')?.column.getSize())||200; const thumbSize=48, gap=4, unit=thumbSize+gap; const capacity=Math.max(1, Math.floor((colSize-4)/unit)); let visibleImages:any[]=[]; let remaining=0; if(images.length<=capacity){visibleImages=images;} else if(capacity===1){visibleImages=images.slice(0,1); remaining=images.length-1;} else {visibleImages=images.slice(0, capacity-1); remaining=images.length-visibleImages.length;} return <div className="flex items-center gap-1 overflow-hidden h-12">{visibleImages.map(img=> <Dialog key={img.id}><DialogTrigger asChild><div className="relative h-12 w-12 shrink-0 cursor-pointer flex-none"><CachedImage src={img.src} alt={img.alt||'Product image'} className="h-12 w-12 rounded object-cover" /></div></DialogTrigger><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{img.alt||'Product Image'}</DialogTitle></DialogHeader><div className="relative h-96"><CachedImage src={img.src} alt={img.alt||'Product image'} className="h-full w-full object-contain" /></div></DialogContent></Dialog>)}{remaining>0 && <Dialog><DialogTrigger asChild><button className="h-12 w-12 shrink-0 flex-none rounded bg-muted text-xs font-medium flex items-center justify-center hover:bg-muted/70" aria-label={`+${remaining} more images`}>+{remaining}</button></DialogTrigger><DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>All Images</DialogTitle></DialogHeader><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[70vh] overflow-y-auto p-2">{images.map(img=> <div key={img.id} className="relative w-full aspect-square"><CachedImage src={img.src} alt={img.alt||'Product image'} className="absolute inset-0 h-full w-full object-cover rounded" /></div>)}</div></DialogContent></Dialog>}</div>; } catch { return null; } }
	},
	{ accessorKey:'product_type', header: ({column})=> <SortableHeader column={column} title="Product Type" />, size:MIN_COLUMN_SIZES.product_type, minSize:MIN_COLUMN_SIZES.product_type, cell: ({row})=> <span className="line-clamp-2">{isVariant(row.original)?'':(row.original as ShopifyProduct).product_type}</span> },
	{ accessorKey:'vendor', header: ({column})=> <SortableHeader column={column} title="Vendor" />, size:170, minSize:170, cell: ({row})=> <span className="line-clamp-2">{isVariant(row.original)?'':(row.original as ShopifyProduct).vendor}</span> },
	{ id:'price', header: ({column})=> <SortableHeader column={column} title="Price" />, size:MIN_COLUMN_SIZES.price, minSize:MIN_COLUMN_SIZES.price, accessorFn: (row:any)=> parseFloat(isVariant(row)?row.price: row.variants?.[0]?.price || '0'), cell: ({row})=> { const price=isVariant(row.original)?row.original.price:(row.original as ShopifyProduct).variants?.[0]?.price; return price?`$${price}`:''; } },
	{ accessorKey:'body_html', header:'Body HTML', size:120, enableResizing:false, cell: ({row})=> { if(isVariant(row.original)) return null; const bodyHtml=(row.original as ShopifyProduct).body_html; if(!bodyHtml?.trim()) return null; return <Dialog><DialogTrigger asChild><Button variant="outline" size="sm">View</Button></DialogTrigger><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{(row.original as ShopifyProduct).title}</DialogTitle></DialogHeader><div className="prose dark:prose-invert max-h-[70vh] overflow-y-auto" dangerouslySetInnerHTML={{__html: bodyHtml}} /></DialogContent></Dialog>; } },
	{ accessorKey:'tags', header:'Tags', size:140, minSize:90, maxSize:260, cell: ({row})=> { if(isVariant(row.original)) return null; const tags=(row.original as ShopifyProduct).tags; const tagArray:string[] = typeof tags==='string'? tags.split(',').map(t=>t.trim()).filter(Boolean) : (Array.isArray(tags)? tags.filter(Boolean): []); if(tagArray.length===0) return null; return <div className="flex flex-col gap-1 max-w-full overflow-hidden">{tagArray.slice(0,2).map(tag=> <Badge key={tag} variant="secondary" className="truncate max-w-full">{tag}</Badge>)}{tagArray.length>2 && <Dialog><DialogTrigger asChild><Badge variant="outline" className="cursor-pointer">+{tagArray.length-2}</Badge></DialogTrigger><DialogContent><DialogHeader><DialogTitle>All Tags</DialogTitle></DialogHeader><div className="flex flex-wrap gap-2">{tagArray.map(tag=> <Badge key={tag} variant="secondary">{tag}</Badge>)}</div></DialogContent></Dialog>}</div>; } },
	{ accessorKey:'updated_at', header: ({column})=> <SortableHeader column={column} title="Updated At" />, size:150, minSize:140, cell: ({row})=> { const date=(row.original as any).updated_at; return new Date(date).toLocaleDateString(); } }
];
