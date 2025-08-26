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
  Row,
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
import { ShopifyProduct } from '@/lib/types';
import { cn } from '@/lib/utils';

function LoadingView() {
  const { logs } = useScrapeStore();
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

function ProductTableView() {
  const { products: allProducts, collections, shopUrl, collectionCache, addCollectionToCache } = useScrapeStore();
  const [displayProducts, setDisplayProducts] = useState<ShopifyProduct[]>(allProducts);
  const [isTableLoading, setTableLoading] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<{ handle: string, title: string } | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  useEffect(() => { setDisplayProducts(allProducts); }, [allProducts]);

  const table = useReactTable({
    data: displayProducts,
    columns,
    state: { sorting, columnFilters, globalFilter },
    // FIX: Correctly check types before accessing properties
    getSubRows: (row: Row<ProductRowData>) => {
      if (!isVariant(row.original) && row.original.variants && row.original.variants.length > 1) {
        return row.original.variants;
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
  
  const filteredRows = table.getFilteredRowModel().rows;
  const availableVendors = useMemo(() => {
    const vendorCounts: { [key: string]: number } = {};
    filteredRows.forEach(row => {
      // FIX: Use type guard to safely access properties
      if (!isVariant(row.original)) {
        const vendor = row.original.vendor;
        vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1;
      }
    });
    return Object.keys(vendorCounts).map(name => ({ name, count: vendorCounts[name] })).sort((a,b) => a.name.localeCompare(b.name));
  }, [filteredRows]);

  const availableProductTypes = useMemo(() => {
    const types = new Set<string>();
    filteredRows.forEach(row => {
      // FIX: Use type guard to safely access properties
      if (!isVariant(row.original)) {
        types.add(row.original.product_type);
      }
    });
    return Array.from(types).sort();
  }, [filteredRows]);

  const handleCollectionSelect = async (collectionHandle: string) => {
    setColumnFilters([]);
    const collection = collections.find(c => c.handle === collectionHandle);
    setSelectedCollection(collection ? { handle: collection.handle, title: collection.title } : null);
    if (collectionHandle === 'all') { setDisplayProducts(allProducts); return; }
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
  
  const selectedRowCount = table.getFilteredRowModel().rows.length;
  const storeHostname = useMemo(() => { try { return new URL(shopUrl).hostname; } catch { return 'N/A'; } }, [shopUrl]);

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Product View - <span className="text-gray-500">{storeHostname}</span></h2>
        <div className="flex items-center gap-4">
          <p>
            {selectedCollection 
              ? <>Showing <strong>{selectedRowCount}</strong> products in "<strong>{selectedCollection.title}</strong>" of <strong>{allProducts.length}</strong> total</>
              : <>Showing <strong>{selectedRowCount}</strong> of <strong>{allProducts.length}</strong> products</>
            }
          </p>
          <Button>Import Products (CSV)</Button>
        </div>
      </div>
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-2">
            <Select onValueChange={handleCollectionSelect} value={selectedCollection?.handle || 'all'}>
              <SelectTrigger className={cn("w-[180px]", selectedCollection && "border-2 border-primary")}><SelectValue placeholder="Filter by Collection" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Collections</SelectItem>
                {collections.map(col => <SelectItem key={col.id} value={col.handle}>{col.title} ({col.products_count})</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="h-6 w-px bg-gray-300" />
            <Select onValueChange={value => table.getColumn('vendor')?.setFilterValue(value === 'all' ? '' : value)} value={table.getColumn('vendor')?.getFilterValue() as string || 'all'}>
              {/* FIX: Use !! to satisfy TypeScript type checking */}
              <SelectTrigger className={cn("w-[180px]", !!table.getColumn('vendor')?.getFilterValue() && "border-2 border-primary")}><SelectValue placeholder="Filter by Vendor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {availableVendors.map(vendor => <SelectItem key={vendor.name} value={vendor.name}>{vendor.name} ({vendor.count})</SelectItem>)}
              </SelectContent>
            </Select>
            <Select onValueChange={value => table.getColumn('product_type')?.setFilterValue(value === 'all' ? '' : value)} value={table.getColumn('product_type')?.getFilterValue() as string || 'all'}>
              {/* FIX: Use !! to satisfy TypeScript type checking */}
              <SelectTrigger className={cn("w-[180px]", !!table.getColumn('product_type')?.getFilterValue() && "border-2 border-primary")}><SelectValue placeholder="Filter by Product Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Product Types</SelectItem>
                {availableProductTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="link" onClick={() => { table.resetColumnFilters(); setGlobalFilter(''); setSelectedCollection(null); setDisplayProducts(allProducts); }}>Reset Filters</Button>
            {table.getState().sorting.length > 0 && (
                <Button variant="link" onClick={() => table.resetSorting()}>Reset Sort</Button>
            )}
        </div>
        <Input placeholder="Search all products..." value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} className="max-w-sm" />
      </div>
      <div className="rounded-md border overflow-x-auto">
        <div className="bg-white relative min-w-[1500px]">
          {isTableLoading && ( <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10"><p className="text-lg">Loading Collection...</p></div> )}
          <Table className="table-fixed w-full">
            <TableHeader>{table.getHeaderGroups().map(hg => (<TableRow key={hg.id}>{hg.headers.map(h => (<TableHead key={h.id} style={{ width: `${h.getSize()}px` }}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>))}</TableRow>))}</TableHeader>
            <TableBody>{table.getRowModel().rows.map(row => (<TableRow key={row.id}>{row.getVisibleCells().map(cell => (<TableCell key={cell.id} style={{ width: `${cell.column.getSize()}px` }} className="py-2 px-4 h-20">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>))}</TableRow>))}</TableBody>
          </Table>
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 py-4">
            <Button variant="outline" size="sm" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>First</Button>
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
            <div className="text-sm text-muted-foreground">Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</div>
            <Button variant="outline"  size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
            <Button variant="outline" size="sm" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>Last</Button>
      </div>
    </div>
  );
}

// Main component that decides whether to show loading or the table
export default function Step2Review() {
  const { shopUrl, addLog, setResults, isLoading } = useScrapeStore();
  useEffect(() => {
    if (!isLoading) return;
    let eventSource: EventSource;
    const stream = async () => {
      const res = await fetch('/api/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopUrl }) });
      const { sessionId } = await res.json();
      if (!sessionId) { addLog("Error: Could not start scraping session."); return; }
      eventSource = new EventSource(`/api/stream?sessionId=${sessionId}`);
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.finished) { setResults(data.data); eventSource.close(); } else { addLog(data.message); }
      };
      eventSource.onerror = () => { addLog("Error with SSE connection."); eventSource.close(); };
    };
    stream();
    return () => { eventSource?.close(); };
  }, [isLoading, shopUrl, addLog, setResults]);
  return isLoading ? <LoadingView /> : <ProductTableView />;
}