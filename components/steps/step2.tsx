// kendrick-gs/scrapper/scrapper-a31e4028cc7f75eeeb406d17e6548fcd50443ca8/components/steps/step2.tsx
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
  ColumnSizingState, // <-- Import for resizing state
} from '@tanstack/react-table';
import { useScrapeStore } from '@/store/useScrapeStore';
import { columns, ProductRowData, isVariant } from './columns'; // <-- Corrected imports
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

// ... (LoadingView component remains the same)
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
  
  // State for column resizing
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});

  useEffect(() => { setDisplayProducts(allProducts); }, [allProducts]);

  const table = useReactTable({
    data: displayProducts,
    columns,
    state: { sorting, columnFilters, globalFilter, columnSizing }, // <-- Add columnSizing to state
    onColumnSizingChange: setColumnSizing, // <-- Add handler
    columnResizeMode: 'onChange', // <-- Enable resize mode
        getSubRows: (originalRow: ProductRowData) => { // <-- Change 'row' to 'originalRow'
      // We directly use originalRow, no .original needed here
      if (!isVariant(originalRow) && originalRow.variants && originalRow.variants.length > 0) {
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
      if (!isVariant(row.original)) {
        types.add(row.original.product_type);
      }
    });
    return Array.from(types).sort();
  }, [filteredRows]);

  const handleCollectionSelect = async (collectionHandle: string) => {
    // ... (this function remains the same)
  };
  
  const selectedRowCount = table.getFilteredRowModel().rows.length;
  const storeHostname = useMemo(() => { try { return new URL(shopUrl).hostname; } catch { return 'N/A'; } }, [shopUrl]);

  const handleExport = async () => {
    try {
        const res = await fetch('/api/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ products: displayProducts }),
        });

        if (!res.ok) throw new Error('Failed to export data.');

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'shopify_import.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error(error);
        alert('Could not export products.');
    }
  };

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
          <Button onClick={handleExport}>Export as CSV</Button>
        </div>
      </div>
      {/* ... (Filter controls section remains the same) ... */}
      <div className="rounded-md border">
        <div className="w-full relative overflow-x-auto">
          {isTableLoading && ( <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10"><p className="text-lg">Loading Collection...</p></div> )}
          <Table style={{ width: table.getCenterTotalSize() }}> {/* Use total size for table width */}
            <TableHeader>
              {table.getHeaderGroups().map(hg => (
                <TableRow key={hg.id}>
                  {hg.headers.map(h => (
                    <TableHead key={h.id} style={{ width: h.getSize() }} className="relative">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {/* Add the resizer element */}
                      <div
                        onMouseDown={h.getResizeHandler()}
                        onTouchStart={h.getResizeHandler()}
                        className={cn(
                          'resizer',
                          h.column.getIsResizing() && 'isResizing'
                        )}
                      />
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} style={{ width: cell.column.getSize() }} className="py-2 px-4 h-20">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      {/* ... (Pagination section remains the same) ... */}
    </div>
  );
}

// ... (Step2Review component remains the same)
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