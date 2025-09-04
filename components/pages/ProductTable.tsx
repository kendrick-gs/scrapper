'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
	useReactTable,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	getExpandedRowModel,
	flexRender,
	SortingState,
	ColumnFiltersState,
	ColumnSizingState,
	ExpandedState,
	Row,
} from '@tanstack/react-table';
import { useScrapeStore } from '@/store/useScrapeStore';
import { columns, ProductRowData, isVariant } from './columns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShopifyProduct, ShopifyCollection } from '@/lib/types';
import { useUserPrefsStore } from '@/store/useUserPrefsStore';
import { cn } from '@/lib/utils';
import { XIcon } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import type { Table as ReactTableType } from '@tanstack/react-table';

function VirtualizedRows({ table, parentRef }: { table: ReactTableType<any>; parentRef: React.RefObject<HTMLDivElement | null>; }) {
	const rowVirtualizer = useVirtualizer({
		count: table.getRowModel().rows.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 48,
		overscan: 12,
	});
	const virtualRows = rowVirtualizer.getVirtualItems();
	const totalSize = rowVirtualizer.getTotalSize();
	return (
		<tr>
			<td colSpan={table.getAllColumns().length} className="p-0">
				<div ref={parentRef} className="max-h-[70vh] overflow-y-auto">
					<div style={{ height: totalSize, position: 'relative' }}>
						{virtualRows.map((vi: any) => {
							const row = table.getRowModel().rows[vi.index];
							return (
								<div key={row.id} data-index={vi.index} style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vi.start}px)` }}>
									<TableRow data-state={row.getIsSelected() && 'selected'} className="dark:bg-background">
										{row.getVisibleCells().map((cell, cIdx) => (
											<TableCell key={cell.id} style={{ width: cell.column.getSize() }} className={cn('p-4 align-middle', cIdx === 0 && 'sticky left-0 z-10 bg-background')}>
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</TableCell>
										))}
									</TableRow>
								</div>
							);
						})}
					</div>
				</div>
			</td>
		</tr>
	);
}

function LoadingView({ logs }: { logs: string[] }) {
			const parentRef = useRef<HTMLDivElement | null>(null);
			// Virtualizer initialized after table instance below

		return (
		<Card className="w-full max-w-2xl mx-auto">
			<CardHeader><CardTitle>Fetching Products...</CardTitle></CardHeader>
			<CardContent>
				<Progress value={logs.length * 2} className="w-full mb-4" />
				<div className="w-full h-64 bg-gray-900 text-white font-mono text-sm p-4 overflow-y-auto rounded-md">
					{logs.map((log, index) => (<p key={index} className="whitespace-pre-wrap">{`> ${log}`}</p>))}
				</div>
			</CardContent>
		</Card>
	);
}

function ProductTableView({
		allProducts,
		collections,
		shopUrl,
		collectionCache,
		addCollectionToCache
}: {
		allProducts: ShopifyProduct[];
		collections: ShopifyCollection[];
		shopUrl: string;
		collectionCache: Record<string, ShopifyProduct[]>;
		addCollectionToCache: (handle: string, products: ShopifyProduct[]) => void;
}) {
	const user = useAuthStore(state => state.user);
	const parentRef = useRef<HTMLDivElement | null>(null);
	const [activeCollectionProducts, setActiveCollectionProducts] = useState<ShopifyProduct[] | null>(null);
	const [isCollectionLoading, setCollectionLoading] = useState(false);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [globalFilter, setGlobalFilter] = useState('');
	const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
	const [expanded, setExpanded] = useState<ExpandedState>({});
	// user prefs
	const { pageSize, density } = useUserPrefsStore();

	// persist table state (column sizing + filters + sorting) keyed by a version
	const TABLE_STATE_KEY = 'scrapper-table-state-v1';
	useEffect(() => {
		try {
			const raw = localStorage.getItem(TABLE_STATE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw);
				if (parsed.columnSizing) setColumnSizing(parsed.columnSizing);
				if (parsed.sorting) setSorting(parsed.sorting);
				if (parsed.columnFilters) setColumnFilters(parsed.columnFilters);
				if (parsed.globalFilter) setGlobalFilter(parsed.globalFilter);
			}
		} catch {}
	// run once
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		const payload = JSON.stringify({ columnSizing, sorting, columnFilters, globalFilter });
		localStorage.setItem(TABLE_STATE_KEY, payload);
	}, [columnSizing, sorting, columnFilters, globalFilter]);
	const baseProductData = activeCollectionProducts || allProducts;
	const EMPTY_VALUE = '__empty__';

	const tableData = useMemo(() => {
		let products = [...baseProductData];
		const vendorFilter = columnFilters.find(f => f.id === 'vendor')?.value as string | undefined;
		const productTypeFilter = columnFilters.find(f => f.id === 'product_type')?.value as string | undefined;
		if (vendorFilter || productTypeFilter || globalFilter) {
			products = products.filter(product => {
				let productMatches = true;
				if (vendorFilter) {
					const normalizedVendor = vendorFilter === EMPTY_VALUE ? '' : vendorFilter;
					if ((product.vendor ?? '').trim() !== normalizedVendor) productMatches = false;
				}
				if (productTypeFilter) {
					const normalizedType = productTypeFilter === EMPTY_VALUE ? '' : productTypeFilter;
					if ((product.product_type ?? '').trim() !== normalizedType) productMatches = false;
				}
				if (globalFilter) {
					const lower = globalFilter.toLowerCase();
					const productFieldsMatch =
						product.title.toLowerCase().includes(lower) ||
						product.handle.toLowerCase().includes(lower) ||
						(product.vendor ?? '').toLowerCase().includes(lower) ||
						(product.product_type ?? '').toLowerCase().includes(lower);
					const variantFieldsMatch = product.variants.some(variant =>
						variant.title.toLowerCase().includes(lower) ||
						(variant.sku && variant.sku.toLowerCase().includes(lower))
					);
					if (!productFieldsMatch && !variantFieldsMatch) productMatches = false;
				}
				return productMatches;
			});
		}
		return products;
	}, [baseProductData, columnFilters, globalFilter]);

	const availableVendors = useMemo(() => {
		const vendorCounts: { [key: string]: number } = {};
		tableData.forEach(prod => {
			const key = (prod.vendor ?? '').trim() || EMPTY_VALUE;
			vendorCounts[key] = (vendorCounts[key] || 0) + 1;
		});
		return Object.keys(vendorCounts).map(name => ({ name, count: vendorCounts[name] })).sort((a,b) => a.name.localeCompare(b.name));
	}, [tableData]);

	const availableProductTypes = useMemo(() => {
		const types = new Set<string>();
		tableData.forEach(p => { const key = (p.product_type ?? '').trim() || EMPTY_VALUE; types.add(key); });
		return Array.from(types).sort();
	}, [tableData]);

	const table = useReactTable({
		data: tableData,
		columns,
		state: { sorting, columnSizing, expanded },
		onExpandedChange: setExpanded,
		onColumnSizingChange: setColumnSizing,
		columnResizeMode: 'onChange',
		getRowId: (row) => isVariant(row) ? `variant-${row.id}` : `product-${row.id}`,
		getSubRows: (originalRow: ProductRowData) => {
			if (!isVariant(originalRow) && originalRow.variants?.length > 1 && originalRow.variants[0].title !== "Default Title") {
				return originalRow.variants;
			}
			return undefined;
		},
		onSortingChange: setSorting,
		manualFiltering: true,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
	});

	// apply page size from prefs once
	useEffect(() => {
		table.setPageSize(pageSize);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pageSize]);

	const handleCollectionSelect = useCallback(async (rawHandle: string | null) => {
		if (!user) return;
		setExpanded({});
		if (rawHandle === null || rawHandle === 'all') { setActiveCollectionProducts(null); return; }
		const collectionHandle: string = rawHandle === EMPTY_VALUE ? '' : rawHandle;
		if (collectionHandle === '') { setActiveCollectionProducts(null); return; }
		if (collectionCache[collectionHandle]) { setActiveCollectionProducts(collectionCache[collectionHandle]); return; }
		setCollectionLoading(true);
		try {
			const res = await fetch('/api/collection-products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopUrl, collectionHandle }) });
			const data = await res.json();
			if (data.products) { addCollectionToCache(collectionHandle, data.products); setActiveCollectionProducts(data.products); }
			else throw new Error(data.error || 'Failed to fetch');
		} catch (e) { console.error(e); alert('Could not load products for this collection.'); }
		finally { setCollectionLoading(false); }
	}, [shopUrl, collectionCache, addCollectionToCache, user]);

	const handleClearFilters = useCallback(() => {
		setColumnFilters([]); setGlobalFilter(''); handleCollectionSelect(null); table.resetSorting(true);
	}, [handleCollectionSelect, table]);

	const selectedCollectionHandle = useMemo(() => {
		if (!activeCollectionProducts) return 'all';
		const firstProductId = activeCollectionProducts[0]?.id;
		for (const col of collections) {
			if (collectionCache[col.handle]?.some(p => p.id === firstProductId)) {
				return (col.handle ?? '').trim() || EMPTY_VALUE;
			}
		}
		return 'all';
	}, [activeCollectionProducts, collections, collectionCache]);

	const selectedCollection = collections.find(c => ((c.handle ?? '').trim() || EMPTY_VALUE) === selectedCollectionHandle);
	const selectedRowCount = tableData.length;
	const storeHostname = useMemo(() => { try { return new URL(shopUrl).hostname; } catch { return 'N/A'; } }, [shopUrl]);
	const hasActiveFilters = columnFilters.length > 0 || globalFilter !== '' || !!activeCollectionProducts;

	const handleExport = async () => {
		const response = await fetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ products: tableData }) });
		if (response.ok) {
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url; a.download = 'shopify_import.csv'; document.body.appendChild(a); a.click(); a.remove();
		} else { alert('Failed to export products.'); }
	};

	return (
		<div className="w-full space-y-4">
			<div className="w-full max-w-[1440px] mx-auto space-y-4 px-4">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-2xl font-bold">Product View - <span className="text-gray-500">{storeHostname}</span></h2>
					<div className="flex items-center gap-4">
						<p>
							{activeCollectionProducts
								? <>Showing <strong>{selectedRowCount}</strong> products in "<strong>{selectedCollection?.title}</strong>"</>
								: <>Showing <strong>{selectedRowCount}</strong> of <strong>{allProducts.length}</strong> total products</>
							}
						</p>
						<Button onClick={handleExport}>Export Products (CSV)</Button>
					</div>
				</div>
				<div className="flex items-center justify-between gap-4 flex-wrap">
					<div className="flex flex-grow items-center gap-4 flex-wrap">
						<div className="flex-shrink-0" style={{ width: '240px' }}>
							<Select onValueChange={(val) => handleCollectionSelect(val === 'all' ? null : val)} value={selectedCollectionHandle} disabled={!user}>
								<SelectTrigger className={cn("h-10 w-full", selectedCollectionHandle !== 'all' && "filter-select")}> <SelectValue placeholder="All Collections" /> </SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Collections</SelectItem>
									{collections.map(col => { const value = (col.handle ?? '').trim() || EMPTY_VALUE; return (<SelectItem key={col.id} value={value}>{col.title} ({col.products_count})</SelectItem>); })}
								</SelectContent>
							</Select>
							{!user && (<div className="text-xs text-muted-foreground mt-1">Login to filter by collection</div>)}
						</div>
						<div className="h-10 w-2 flex-shrink-0 bg-brand-green-light rounded-full" />
						<div className="flex-shrink-0" style={{ width: '200px' }}>
							<Select onValueChange={(value) => { setColumnFilters(prev => { const filtered = prev.filter(f => f.id !== 'vendor'); if (value !== 'all') { filtered.push({ id: 'vendor', value }); } return filtered; }); }} value={columnFilters.find(f => f.id === 'vendor')?.value as string || 'all'}>
								<SelectTrigger className={cn("h-10 w-full", !!columnFilters.find(f => f.id === 'vendor')?.value && "filter-select")}> <SelectValue placeholder="All Vendors" /> </SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Vendors</SelectItem>
									{availableVendors.map(vendor => (<SelectItem key={vendor.name} value={vendor.name}>{vendor.name === EMPTY_VALUE ? 'No Vendor' : vendor.name} ({vendor.count})</SelectItem>))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex-shrink-0" style={{ width: '200px' }}>
							<Select onValueChange={(value) => { setColumnFilters(prev => { const filtered = prev.filter(f => f.id !== 'product_type'); if (value !== 'all') { filtered.push({ id: 'product_type', value }); } return filtered; }); }} value={columnFilters.find(f => f.id === 'product_type')?.value as string || 'all'}>
								<SelectTrigger className={cn("h-10 w-full", !!columnFilters.find(f => f.id === 'product_type')?.value && "filter-select")}> <SelectValue placeholder="All Product Types" /> </SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Product Types</SelectItem>
									{availableProductTypes.map(type => (<SelectItem key={type} value={type}>{type === EMPTY_VALUE ? 'No Product Type' : type}</SelectItem>))}
								</SelectContent>
							</Select>
						</div>
						{hasActiveFilters && (<Button variant="link" onClick={handleClearFilters}>Clear Filters</Button>)}
					</div>
				</div>
			</div>
			<div className={cn("rounded-md border bg-gray-50 dark:bg-card", density === 'compact' && 'text-sm')}> 
				<div className="w-full p-3 border-b bg-gray-100 dark:bg-muted flex items-center justify-start gap-3 sticky left-0 z-10">
					{table.getState().sorting.length > 0 && (<Button variant="link" onClick={() => table.resetSorting()}>Reset Sort</Button>)}
					<div className="relative" style={{ width: '240px' }}>
						<Input placeholder="Search..." value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} className={cn("h-10", globalFilter && "border-2 border-brand-green ring-0 focus-visible:ring-0 focus-visible:border-brand-green")}/>
						{globalFilter && (<Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setGlobalFilter('')}><XIcon className="h-4 w-4" /></Button>)}
					</div>
				</div>
			<div className="w-full relative overflow-x-auto">
					{isCollectionLoading && (<div className="absolute inset-0 bg-white/75 dark:bg-black/75 flex items-center justify-center z-10"><p className="text-lg">Loading Collection...</p></div>)}
								  {table.getRowModel().rows.length > 0 ? (
									<Table style={{ width: table.getCenterTotalSize() }}>
							<TableHeader>
								{table.getHeaderGroups().map(hg => (
									<TableRow key={hg.id} className="bg-gray-100 dark:bg-muted hover:bg-gray-200 dark:hover:bg-gray-800">
										{hg.headers.map((h, hIdx) => (
											<TableHead key={h.id} style={{ width: h.getSize() }} className={cn('relative px-4', hIdx === 0 && 'sticky left-0 z-10 bg-gray-100 dark:bg-muted')}>
												{flexRender(h.column.columnDef.header, h.getContext())}
												<div onMouseDown={h.getResizeHandler()} onTouchStart={h.getResizeHandler()} className={cn('resizer', h.column.getIsResizing() && 'isResizing')} />
											</TableHead>
										))}
									</TableRow>
								))}
							</TableHeader>
															<TableBody>
																{/* Virtualized body injected dynamically below to ensure table is defined */}
																<VirtualizedRows table={table} parentRef={parentRef} />
															</TableBody>
						</Table>
					) : (
						<div className="text-center p-8">
							<h3 className="text-lg font-semibold">No products found</h3>
							<p className="text-muted-foreground">Your search or filter combination returned no results.</p>
						</div>
					)}
				</div>
			</div>
			<div className={cn("flex items-center justify-between gap-4 py-4 w-full", density === 'compact' && 'text-xs')}> 
				<div className="flex-1" />
				<div className="flex flex-shrink-0 justify-center items-center gap-4">
					<Button variant="outline" size="sm" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>First</Button>
					<Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
					<div className="text-sm text-muted-foreground whitespace-nowrap">Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</div>
					<Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
					<Button variant="outline" size="sm" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>Last</Button>
				</div>
				<div className="flex flex-1 justify-end items-center gap-2">
					<span className="text-sm text-muted-foreground">Show</span>
					<Select value={`${table.getState().pagination.pageSize}`} onValueChange={value => table.setPageSize(Number(value))}>
						<SelectTrigger className="w-[80px] h-9"> <SelectValue placeholder="Page size" /> </SelectTrigger>
						<SelectContent>
							{[10,25,50,100].map(size => (<SelectItem key={size} value={`${size}`}>{size}</SelectItem>))}
						</SelectContent>
					</Select>
					<span className="text-sm text-muted-foreground">products</span>
				</div>
			</div>
		</div>
	);
}

export default function ProductTable() {
	const { shopUrl, addLog, setResults, isLoading, logs, products, collections, collectionCache, addCollectionToCache, reset } = useScrapeStore();
	useEffect(() => {
		if (!isLoading) return;
		const streamScrape = async () => {
			try {
				const response = await fetch('/api/scrape-stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopUrl }) });
				if (!response.body) throw new Error('Response body is null');
				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				let buffer = '';
				while (true) {
					const { done, value } = await reader.read(); if (done) break;
					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n\n'); buffer = lines.pop() || '';
					for (const line of lines) {
						if (line.startsWith('data:')) {
							const jsonString = line.substring(5);
							try {
								const data = JSON.parse(jsonString);
								if (data.finished) { setResults(data.data); return; }
								else if (data.message) { addLog(data.message); }
								else if (data.error) { addLog(`ERROR: ${data.error}`); }
							} catch (e) { console.error('Failed to parse stream JSON:', jsonString); }
						}
					}
				}
			} catch (error) {
				console.error('Failed to stream scrape:', error);
				addLog(`A critical error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		};
		streamScrape();
	}, [isLoading, shopUrl, addLog, setResults, reset]);

	if (isLoading) return <LoadingView logs={logs} />;
	if (!isLoading && products.length > 0) return (
		<ProductTableView allProducts={products} collections={collections} shopUrl={shopUrl} collectionCache={collectionCache} addCollectionToCache={addCollectionToCache} />
	);
	return (
		<Card className="w-full max-w-2xl mx-auto">
			<CardHeader>
				<CardTitle>Scraping Complete</CardTitle>
			</CardHeader>
			<CardContent>
				<p>No products were found for this store.</p>
				<Button onClick={reset} className="mt-4">Start Over</Button>
			</CardContent>
		</Card>
	);
}
