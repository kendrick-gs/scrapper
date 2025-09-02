'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  ExpandedState,
  Row,
} from '@tanstack/react-table';
import { useScrapeState, useScrapeProducts, useScrapeMutation } from '@/hooks/useScrape';
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
import { useAuth } from '@/hooks/useAuth';

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
  const { user } = useAuth();
  const [activeCollectionProducts, setActiveCollectionProducts] = useState<ShopifyProduct[] | null>(null);
  const [isCollectionLoading, setCollectionLoading] = useState(false);
  
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const baseProductData = activeCollectionProducts || allProducts;

  // *** FIX: Custom filtering logic that preserves expandable structure ***
  const tableData = useMemo(() => {
    let products = [...baseProductData];

    // Get filter values
    const vendorFilter = columnFilters.find(f => f.id === 'vendor')?.value as string | undefined;
    const productTypeFilter = columnFilters.find(f => f.id === 'product_type')?.value as string | undefined;

    // Apply filters but preserve product structure for expansion
    if (vendorFilter || productTypeFilter || globalFilter) {
      products = products.filter(product => {
        // Check if product matches filters
        let productMatches = true;

        if (vendorFilter) {
          const normalizedVendor = vendorFilter === EMPTY_VALUE ? '' : vendorFilter;
          if ((product.vendor ?? '').trim() !== normalizedVendor) {
            productMatches = false;
          }
        }
        if (productTypeFilter) {
          const normalizedType = productTypeFilter === EMPTY_VALUE ? '' : productTypeFilter;
          if ((product.product_type ?? '').trim() !== normalizedType) {
            productMatches = false;
          }
        }

        // Global filter check
        if (globalFilter) {
          const lowerGlobalFilter = globalFilter.toLowerCase();
          const productFieldsMatch =
            product.title.toLowerCase().includes(lowerGlobalFilter) ||
            product.handle.toLowerCase().includes(lowerGlobalFilter) ||
            (product.vendor ?? '').toLowerCase().includes(lowerGlobalFilter) ||
            (product.product_type ?? '').toLowerCase().includes(lowerGlobalFilter);

          const variantFieldsMatch = product.variants.some(variant =>
            variant.title.toLowerCase().includes(lowerGlobalFilter) ||
            (variant.sku && variant.sku.toLowerCase().includes(lowerGlobalFilter))
          );

          if (!productFieldsMatch && !variantFieldsMatch) {
            productMatches = false;
          }
        }

        return productMatches;
      });
    }

    return products;
  }, [baseProductData, columnFilters, globalFilter]);

  // *** FIX: Update filter options based on current tableData instead of filteredData ***
  const EMPTY_VALUE = '__empty__';
  const availableVendors = useMemo(() => {
    const vendorCounts: { [key: string]: number } = {};
    tableData.forEach(prod => {
      const key = (prod.vendor ?? '').trim() || EMPTY_VALUE;
      vendorCounts[key] = (vendorCounts[key] || 0) + 1;
    });
    return Object.keys(vendorCounts)
      .map(name => ({ name, count: vendorCounts[name] }))
      .sort((a,b) => a.name.localeCompare(b.name));
  }, [tableData]);

  const availableProductTypes = useMemo(() => {
    const types = new Set<string>();
    tableData.forEach(p => {
      const key = (p.product_type ?? '').trim() || EMPTY_VALUE;
      types.add(key);
    });
    return Array.from(types).sort();
  }, [tableData]);

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting, columnSizing, expanded },
    onExpandedChange: setExpanded,
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: 'onChange',
    // *** IMPORTANT: Keep these settings for robust expandable rows ***
    getRowId: (row) => isVariant(row) ? `variant-${row.id}` : `product-${row.id}`,
    getSubRows: (originalRow: ProductRowData) => {
      if (!isVariant(originalRow) && originalRow.variants?.length > 1 && originalRow.variants[0].title !== "Default Title") {
        return originalRow.variants;
      }
      return undefined;
    },
    onSortingChange: setSorting,
    // Don't use TanStack's built-in filtering since we handle it manually
    manualFiltering: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });
  
  // *** FIX: Robust handler for collection selection ***
  const handleCollectionSelect = useCallback(async (rawHandle: string | null) => {
    if (!user) {
      return; // not allowed when not logged in
    }
    setExpanded({});
    if (rawHandle === null || rawHandle === 'all') {
      setActiveCollectionProducts(null);
      return;
    }
    const collectionHandle: string = rawHandle === EMPTY_VALUE ? '' : rawHandle;
    if (collectionHandle === '') {
      // A collection without a handle cannot be fetched reliably
      setActiveCollectionProducts(null);
      return;
    }
    
    if (collectionCache[collectionHandle]) {
      setActiveCollectionProducts(collectionCache[collectionHandle]);
      return;
    }

    setCollectionLoading(true);
    try {
      const res = await fetch('/api/collection-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopUrl, collectionHandle })
      });
      const data = await res.json();
      if (data.products) {
        addCollectionToCache(collectionHandle, data.products);
        setActiveCollectionProducts(data.products);
      } else {
        throw new Error(data.error || 'Failed to fetch');
      }
    } catch (error) {
      console.error(error);
      alert('Could not load products for this collection.');
    } finally {
      setCollectionLoading(false);
    }
  }, [shopUrl, collectionCache, addCollectionToCache, user]);

  const handleClearFilters = useCallback(() => {
    setColumnFilters([]);
    setGlobalFilter('');
    handleCollectionSelect(null);
    table.resetSorting(true);
  }, [handleCollectionSelect, table]);

  const selectedCollectionHandle = useMemo(() => {
      if (!activeCollectionProducts) return 'all';
      // This is a proxy to find the handle since we don't store it directly.
      // A more robust solution might involve storing the selected handle in state.
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
    const response = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: tableData }),
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'shopify_import.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      alert('Failed to export products.');
    }
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
        {/* Top filters stay above the table */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 flex-wrap">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap w-full lg:w-auto">
            <div className="flex-shrink-0 w-full sm:w-[240px]">
              <Select onValueChange={(val) => handleCollectionSelect(val === 'all' ? null : val)} value={selectedCollectionHandle} disabled={!user}>
                <SelectTrigger className={cn("h-10 w-full", selectedCollectionHandle !== 'all' && "filter-select")}>
                    <SelectValue placeholder="All Collections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Collections</SelectItem>
                  {collections.map(col => {
                    const value = (col.handle ?? '').trim() || EMPTY_VALUE;
                    return (
                      <SelectItem key={col.id} value={value}>
                        {col.title} ({col.products_count})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {!user && (
                <div className="text-xs text-muted-foreground mt-1">Login to filter by collection</div>
              )}
            </div>

            <div className="h-2 lg:h-10 w-full lg:w-2 flex-shrink-0 bg-brand-green-light rounded-full lg:rounded-none" />

            <div className="flex-shrink-0 w-full sm:w-[200px]">
              <Select
                onValueChange={(value) => {
                  setColumnFilters(prev => {
                    const filtered = prev.filter(f => f.id !== 'vendor');
                    if (value !== 'all') {
                      filtered.push({ id: 'vendor', value });
                    }
                    return filtered;
                  });
                }}
                value={columnFilters.find(f => f.id === 'vendor')?.value as string || 'all'}
              >
                <SelectTrigger className={cn("h-10 w-full", !!columnFilters.find(f => f.id === 'vendor')?.value && "filter-select")}>
                    <SelectValue placeholder="All Vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {availableVendors.map(vendor => (
                    <SelectItem key={vendor.name} value={vendor.name}>
                      {vendor.name === EMPTY_VALUE ? 'No Vendor' : vendor.name} ({vendor.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-shrink-0 w-full sm:w-[200px]">
              <Select
                onValueChange={(value) => {
                  setColumnFilters(prev => {
                    const filtered = prev.filter(f => f.id !== 'product_type');
                    if (value !== 'all') {
                      filtered.push({ id: 'product_type', value });
                    }
                    return filtered;
                  });
                }}
                value={columnFilters.find(f => f.id === 'product_type')?.value as string || 'all'}
              >
                <SelectTrigger className={cn("h-10 w-full", !!columnFilters.find(f => f.id === 'product_type')?.value && "filter-select")}>
                    <SelectValue placeholder="All Product Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Product Types</SelectItem>
                  {availableProductTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type === EMPTY_VALUE ? 'No Product Type' : type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button variant="link" onClick={handleClearFilters}>Clear Filters</Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Full-bleed wrapper so the table expands to viewport width */}
      <div className="w-screen -mx-4 md:-mx-8">
      <div className="rounded-2xl border-2 bg-gray-50 dark:bg-card overflow-hidden">
        {/* Toolbar inside the table frame but outside horizontal scroll */}
        <div className="w-full px-3 py-[18px] border-b bg-gray-100 dark:bg-muted flex flex-col sm:flex-row items-start sm:items-center justify-start gap-3 sticky left-0 z-10">
          {table.getState().sorting.length > 0 && (
            <Button variant="link" onClick={() => table.resetSorting()}>Reset Sort</Button>
          )}
          <div className="relative w-full sm:w-[240px]">
            <Input
              placeholder="Search..."
              value={globalFilter ?? ''}
              onChange={e => setGlobalFilter(e.target.value)}
              className={cn(
                "h-10",
                globalFilter && "border-2 border-brand-green ring-0 ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-green"
              )}
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
        </div>
        <div className="w-full relative overflow-x-auto">
          {isCollectionLoading && ( <div className="absolute inset-0 bg-white/75 dark:bg-black/75 flex items-center justify-center z-10"><p className="text-lg">Loading Collection...</p></div> )}
          {table.getRowModel().rows.length > 0 ? (
            <Table style={{ width: table.getCenterTotalSize() }}>
              <TableHeader>
                {table.getHeaderGroups().map(hg => (
                  <TableRow key={hg.id} className="bg-gray-300 hover:bg-gray-300">
                    {hg.headers.map((h, hIdx) => (
                      <TableHead
                        key={h.id}
                        style={{ width: h.getSize() }}
                        className={cn('relative px-4', hIdx === 0 && 'sticky left-0 z-10 bg-gray-300')}
                      >
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
                    {row.getVisibleCells().map((cell, cIdx) => (
                      <TableCell
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                        className={cn('p-4 align-middle', cIdx === 0 && 'sticky left-0 z-10 bg-card')}
                      >
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
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 w-full">
        <div className="flex-1">
        </div>
        <div className="flex flex-wrap justify-center items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>First</Button>
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
            <div className="text-sm text-muted-foreground whitespace-nowrap px-2">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </div>
            <Button variant="outline"  size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
            <Button variant="outline" size="sm" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>Last</Button>
        </div>
        <div className="flex flex-1 justify-end items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">Show</span>
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
            <span className="text-sm text-muted-foreground hidden sm:inline">products</span>
        </div>
      </div>
    </div>
  );
}

export default function Step2Review() {
  const { shopUrl } = useScrapeState();
  const { user } = useAuth();
  const scrapeMutation = useScrapeMutation();
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Use React Query to get products data
  const { data: scrapeData, isLoading: isQueryLoading } = useScrapeProducts(shopUrl, isLoading);

  const products = scrapeData?.products || [];
  const collections = scrapeData?.collections || [];
  const vendors = scrapeData?.vendors || [];
  const productTypes = scrapeData?.productTypes || [];

  const addLog = useCallback((log: string) => {
    setLogs(prev => [...prev, log]);
  }, []);

  const handleScrape = async () => {
    setIsLoading(true);
    setLogs([]);

    try {
      await scrapeMutation.mutateAsync(shopUrl);
    } catch (error) {
      addLog(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (shopUrl && !scrapeData && !isQueryLoading) {
      handleScrape();
    }
  }, [shopUrl, scrapeData, isQueryLoading]);

  if (isLoading || isQueryLoading) {
    return <LoadingView logs={logs} />;
  }

  if (products.length > 0) {
    return (
      <ProductTableView
        allProducts={products}
        collections={collections}
        shopUrl={shopUrl}
        collectionCache={{}}
        addCollectionToCache={() => {}}
      />
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Ready to Scrape</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Enter a Shopify store URL to begin scraping products.</p>
        <Button onClick={() => window.location.href = '/app/start'} className="mt-4">
          Go Back
        </Button>
      </CardContent>
    </Card>
  );
}
