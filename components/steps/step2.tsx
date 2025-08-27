'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  flexRender,
  SortingState,
  ColumnFiltersState,
  ColumnSizingState,
} from '@tanstack/react-table';
import { useScrapeStore } from '@/store/useScrapeStore';
import { columns, ProductRowData, isVariant } from './columns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShopifyProduct, ShopifyCollection } from '@/lib/types';
import { cn } from '@/lib/utils';
import { XIcon } from 'lucide-react';

function LoadingView({ logs }: { logs: string[] }) {
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
  const [displayProducts, setDisplayProducts] = useState<ShopifyProduct[]>(allProducts);
  const [isTableLoading, setTableLoading] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<{ handle: string, title: string } | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});

  useEffect(() => { setDisplayProducts(allProducts); }, [allProducts]);

  const table = useReactTable({
    data: displayProducts,
    columns,
    state: { sorting, columnFilters, globalFilter, columnSizing },
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: 'onChange',
    getSubRows: (originalRow: ProductRowData) => {
        if (!isVariant(originalRow) && originalRow.variants && originalRow.variants.length > 1) {
            return originalRow.variants;
        }
        return undefined;
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });
  
  const availableVendors = useMemo(() => {
    const vendorCounts: { [key: string]: number } = {};
    allProducts.forEach(prod => {
        vendorCounts[prod.vendor] = (vendorCounts[prod.vendor] || 0) + 1;
    });
    return Object.keys(vendorCounts).map(name => ({ name, count: vendorCounts[name] })).sort((a,b) => a.name.localeCompare(b.name));
  }, [allProducts]);

  const availableProductTypes = useMemo(() => {
    const types = new Set<string>(allProducts.map(p => p.product_type));
    return Array.from(types).sort();
  }, [allProducts]);

  const handleCollectionSelect = async (collectionHandle: string) => {
    const collection = collections.find(c => c.handle === collectionHandle);
    setSelectedCollection(collection ? { handle: collection.handle, title: collection.title } : null);
    if (collectionHandle === 'all') { 
        setDisplayProducts(allProducts);
        table.resetColumnFilters(); 
        return; 
    }
    if (collectionCache[collectionHandle]) { setDisplayProducts(collectionCache[collectionHandle]); return; }
    setTableLoading(true);
    try {
      const res = await fetch('/api/collection-products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopUrl, collectionHandle }) });
      const data = await res.json();
      if (data.products) {
        addCollectionToCache(collectionHandle, data.products);
        setDisplayProducts(data.products);
      } else { throw new Error(data.error || 'Failed to fetch'); }
    } catch (error) { console.error(error); alert('Could not load products.'); } finally { setTableLoading(false); }
  };
  
  const selectedRowCount = table.getRowModel().rows.filter(row => row.depth === 0).length;
  const storeHostname = useMemo(() => { try { return new URL(shopUrl).hostname; } catch { return 'N/A'; } }, [shopUrl]);
  const hasActiveFilters = columnFilters.length > 0 || globalFilter !== '' || !!selectedCollection;

  return (
    <div className="w-full space-y-4">
      <div className="w-full max-w-[1440px] mx-auto space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Product View - <span className="text-gray-500">{storeHostname}</span></h2>
          <div className="flex items-center gap-4">
            <p>
              {selectedCollection 
                ? <>Showing <strong>{selectedRowCount}</strong> products in "<strong>{selectedCollection.title}</strong>"</>
                : <>Showing <strong>{selectedRowCount}</strong> of <strong>{allProducts.length}</strong> total products</>
              }
            </p>
            <Button>Export Products (CSV)</Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 h-10">
          <div className="flex flex-grow items-center gap-4">
            <div className="h-10 w-10 flex-shrink-0 rounded-md bg-brand-green-light" />
            
            <div className="relative flex-grow-0 flex-shrink-0" style={{ width: '240px' }}>
              <Input 
                placeholder="Search" 
                value={globalFilter ?? ''} 
                onChange={e => setGlobalFilter(e.target.value)} 
                className={cn("h-10", globalFilter && "search-input-active border-2 border-brand-green")}
              />
              {globalFilter && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setGlobalFilter('')}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="h-6 w-2 flex-shrink-0 bg-brand-green-light rounded-full" />

            <div className="flex-grow" style={{ minWidth: '240px' }}>
              <Select onValueChange={handleCollectionSelect} value={selectedCollection?.handle || 'all'}>
                <SelectTrigger className={cn("h-10 w-full", selectedCollection && "filter-select")} data-state={selectedCollection ? 'active' : 'inactive'}>
                    <SelectValue placeholder="All Collections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Collections</SelectItem>
                  {collections.map(col => <SelectItem key={col.id} value={col.handle}>{col.title} ({col.products_count})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="h-6 w-2 flex-shrink-0 bg-brand-green-light rounded-full" />
            
            <div className="flex-grow" style={{ minWidth: '200px' }}>
               <Select onValueChange={value => table.getColumn('vendor')?.setFilterValue(value === 'all' ? '' : value)} value={table.getColumn('vendor')?.getFilterValue() as string || 'all'}>
                <SelectTrigger className={cn("h-10 w-full", !!table.getColumn('vendor')?.getFilterValue() && "filter-select")} data-state={table.getColumn('vendor')?.getFilterValue() ? 'active' : 'inactive'}>
                    <SelectValue placeholder="All Vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {availableVendors.map(vendor => <SelectItem key={vendor.name} value={vendor.name}>{vendor.name} ({vendor.count})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-grow" style={{ minWidth: '200px' }}>
              <Select onValueChange={value => table.getColumn('product_type')?.setFilterValue(value === 'all' ? '' : value)} value={table.getColumn('product_type')?.getFilterValue() as string || 'all'}>
                <SelectTrigger className={cn("h-10 w-full", !!table.getColumn('product_type')?.getFilterValue() && "filter-select")} data-state={table.getColumn('product_type')?.getFilterValue() ? 'active' : 'inactive'}>
                    <SelectValue placeholder="All Product Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Product Types</SelectItem>
                  {availableProductTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex flex-shrink-0 items-center gap-4 h-full">
            {hasActiveFilters && (
              <Button variant="link" onClick={() => { table.resetColumnFilters(); setGlobalFilter(''); handleCollectionSelect('all'); }}>Clear Filters</Button>
            )}
            {hasActiveFilters && table.getState().sorting.length > 0 && <div className="h-6 w-2 flex-shrink-0 bg-brand-green-light rounded-full" />}
            {table.getState().sorting.length > 0 && (
                <Button variant="link" onClick={() => table.resetSorting()}>Reset Sort</Button>
            )}
            <div className="h-full w-2 flex-shrink-0 bg-brand-green-light rounded-full" />
          </div>
        </div>
      </div>
      
      <div className="rounded-md border bg-gray-50 dark:bg-card">
        <div className="w-full relative overflow-x-auto">
          {isTableLoading && ( <div className="absolute inset-0 bg-white/75 dark:bg-black/75 flex items-center justify-center z-10"><p className="text-lg">Loading Collection...</p></div> )}
          {table.getRowModel().rows.length > 0 ? (
            <Table style={{ width: table.getCenterTotalSize() }}>
              <TableHeader>
                {table.getHeaderGroups().map(hg => (
                  <TableRow key={hg.id} className="hover:bg-gray-200 dark:hover:bg-gray-800">
                    {hg.headers.map(h => (
                      <TableHead key={h.id} style={{ width: h.getSize() }} className="relative p-0">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        <div
                          onMouseDown={h.getResizeHandler()}
                          onTouchStart={h.getResizeHandler()}
                          className={cn('resizer', h.column.getIsResizing() && 'isResizing')}
                        />
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map(row => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="dark:bg-background">
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id} style={{ width: cell.column.getSize() }} className="p-4 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
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

      <div className="flex items-center justify-between gap-4 py-4 w-full">
        <div className="flex-1">
        </div>
        <div className="flex flex-shrink-0 justify-center items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>First</Button>
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
            <div className="text-sm text-muted-foreground whitespace-nowrap">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </div>
            <Button variant="outline"  size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
            <Button variant="outline" size="sm" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>Last</Button>
        </div>
        <div className="flex flex-1 justify-end items-center gap-2">
            <span className="text-sm text-muted-foreground">Show</span>
            <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={value => { table.setPageSize(Number(value)) }}
            >
                <SelectTrigger className="w-[80px] h-9">
                    <SelectValue placeholder="Page size" />
                </SelectTrigger>
                <SelectContent>
                    {[10, 25, 50, 100].map(size => (
                        <SelectItem key={size} value={`${size}`}>
                            {size}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">products</span>
        </div>
      </div>
    </div>
  );
}

export default function Step2Review() {
  const { 
    shopUrl, addLog, setResults, isLoading, logs,
    products, collections, collectionCache, addCollectionToCache, reset
  } = useScrapeStore();

  useEffect(() => {
    if (!isLoading) return;

    const streamScrape = async () => {
      try {
        const response = await fetch('/api/scrape-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopUrl }),
        });

        if (!response.body) {
          throw new Error("Response body is null");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data:')) {
              const jsonString = line.substring(5);
              try {
                const data = JSON.parse(jsonString);

                if (data.finished) {
                  setResults(data.data);
                  return;
                } else if (data.message) {
                  addLog(data.message);
                } else if (data.error) {
                  addLog(`ERROR: ${data.error}`);
                }
              } catch (e) {
                  console.error("Failed to parse stream JSON:", jsonString);
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to stream scrape:", error);
        addLog(`A critical error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    streamScrape();

  }, [isLoading, shopUrl, addLog, setResults, reset]);

  if (isLoading) {
    return <LoadingView logs={logs} />;
  }

  if (!isLoading && products.length > 0) {
    return (
      <ProductTableView 
          allProducts={products}
          collections={collections}
          shopUrl={shopUrl}
          collectionCache={collectionCache}
          addCollectionToCache={addCollectionToCache}
      />
    );
  }

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