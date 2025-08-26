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
  
  const filteredRows = table.getFilteredRowModel().rows;
  
  const availableVendors = useMemo(() => {
    const vendorCounts: { [key: string]: number } = {};
    filteredRows.forEach(row => {
      if (row.depth === 0) {
        const vendor = (row.original as ShopifyProduct).vendor;
        vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1;
      }
    });
    return Object.keys(vendorCounts).map(name => ({ name, count: vendorCounts[name] })).sort((a,b) => a.name.localeCompare(b.name));
  }, [filteredRows]);

  const availableProductTypes = useMemo(() => {
    const types = new Set<string>();
    filteredRows.forEach(row => {
      if (row.depth === 0) {
        types.add((row.original as ShopifyProduct).product_type);
      }
    });
    return Array.from(types).sort();
  }, [filteredRows]);

  const handleCollectionSelect = async (collectionHandle: string) => {
    // ... (this function remains the same)
  };
  
  const selectedRowCount = table.getRowModel().rows.filter(row => row.depth === 0).length;
  const storeHostname = useMemo(() => { try { return new URL(shopUrl).hostname; } catch { return 'N/A'; } }, [shopUrl]);

  // ## ADDED: Condition to show the Reset Filters button ##
  const hasActiveFilters = columnFilters.length > 0 || globalFilter !== '';

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center">
        {/* ... (Header section remains the same) ... */}
      </div>
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-2">
            <Select onValueChange={handleCollectionSelect} value={selectedCollection?.handle || 'all'}>
              <SelectTrigger className="filter-select"><SelectValue placeholder="Filter by Collection" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Collections</SelectItem>
                {collections.map(col => <SelectItem key={col.id} value={col.handle}>{col.title} ({col.products_count})</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="h-6 w-px bg-gray-300" />
            <Select onValueChange={value => table.getColumn('vendor')?.setFilterValue(value === 'all' ? '' : value)} value={table.getColumn('vendor')?.getFilterValue() as string || 'all'}>
              <SelectTrigger className="filter-select"><SelectValue placeholder="Filter by Vendor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {availableVendors.map(vendor => <SelectItem key={vendor.name} value={vendor.name}>{vendor.name} ({vendor.count})</SelectItem>)}
              </SelectContent>
            </Select>
            <Select onValueChange={value => table.getColumn('product_type')?.setFilterValue(value === 'all' ? '' : value)} value={table.getColumn('product_type')?.getFilterValue() as string || 'all'}>
              <SelectTrigger className="filter-select"><SelectValue placeholder="Filter by Product Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Product Types</SelectItem>
                {availableProductTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
              </SelectContent>
            </Select>
            {/* ## UPDATED: Conditionally render the button ## */}
            {hasActiveFilters && (
              <Button variant="link" onClick={() => { table.resetColumnFilters(); setGlobalFilter(''); setSelectedCollection(null); setDisplayProducts(allProducts); }}>Reset Filters</Button>
            )}
            {table.getState().sorting.length > 0 && (
                <Button variant="link" onClick={() => table.resetSorting()}>Reset Sort</Button>
            )}
        </div>
        <Input placeholder="Search all products..." value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} className="max-w-sm" />
      </div>
      <div className="rounded-md border">
        {/* ... (Table container remains the same) ... */}
      </div>

      {/* ## UPDATED PAGINATION SECTION ## */}
      <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>First</Button>
                <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </div>

            <div className="flex items-center gap-2">
                <Select
                    value={`${table.getState().pagination.pageSize}`}
                    onValueChange={value => { table.setPageSize(Number(value)) }}
                >
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Page size" />
                    </SelectTrigger>
                    <SelectContent>
                        {[10, 25, 50, 100].map(size => (
                            <SelectItem key={size} value={`${size}`}>
                                Show {size}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button variant="outline"  size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
                <Button variant="outline" size="sm" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>Last</Button>
            </div>
      </div>
    </div>
  );
}

// Main component remains the same
export default function Step2Review() {
  // ...
}