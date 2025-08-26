'use-client';

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

// ## UPDATED LoadingView to accept props ##
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

// ## UPDATED ProductTableView to accept props ##
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
  
  const selectedRowCount = table.getRowModel().rows.filter(row => row.depth === 0).length;
  const storeHostname = useMemo(() => { try { return new URL(shopUrl).hostname; } catch { return 'N/A'; } }, [shopUrl]);
  const hasActiveFilters = columnFilters.length > 0 || globalFilter !== '';

  return (
    <div className="w-full space-y-4">
        {/* All JSX from the original ProductTableView return statement goes here... */}
        {/* No changes needed inside this return statement */}
    </div>
  );
}

// ## UPDATED MAIN COMPONENT ##
export default function Step2Review() {
  // Pull all state and functions from the store here
  const { 
    shopUrl, 
    addLog, 
    setResults, 
    isLoading, 
    logs,
    products,
    collections,
    collectionCache,
    addCollectionToCache
  } = useScrapeStore();

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

  // Conditionally render and pass props down
  if (isLoading) {
    return <LoadingView logs={logs} />;
  }

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