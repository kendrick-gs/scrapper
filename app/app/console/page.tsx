'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { ArrowUpRight, Eye, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  flexRender,
  SortingState,
  ColumnSizingState,
  ExpandedState,
} from '@tanstack/react-table';
import { columns as baseColumns, ProductRowData, isVariant } from '@/components/steps/columns';
import { LoadingOverlay, LoadingSpinner, LoadingTableRow, EmptyState } from '@/components/LoadingStates';

type StoreMeta = { shopUrl: string; lastUpdated?: string; productCount?: number; collectionCount?: number };
type MergedProduct = any & { __storeUrl: string; __storeHost: string };

const EMPTY = '__empty__';

export default function ConsolePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [stores, setStores] = useState<StoreMeta[]>([]);
  const [allProducts, setAllProducts] = useState<MergedProduct[]>([]);
  const [allCollections, setAllCollections] = useState<any[]>([]);
  const [overrideProducts, setOverrideProducts] = useState<MergedProduct[] | null>(null);
  const [isCollectionLoading, setCollectionLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loadedProducts, setLoadedProducts] = useState(0);

  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [collectionFilter, setCollectionFilter] = useState<string>('all');
  const [globalFilter, setGlobalFilter] = useState('');

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [addingList, setAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [lists, setLists] = useState<{ id: string; name: string }[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [alsoSavePresets, setAlsoSavePresets] = useState(true);
  const [listDialogOpen, setListDialogOpen] = useState(false);

  // Load initial data with pagination
  const loadData = useCallback(async (page = 1, append = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);

    setError('');
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '100',
        store: storeFilter
      });

      const res = await fetch(`/api/console-data?${params}`);
      if (!res.ok) throw new Error('Failed to load data');

      const data = await res.json();

      setStores(data.stores || []);
      setAllCollections(data.collections || []);
      setTotalProducts(data.totalProducts || 0);
      setHasMore(data.hasMore || false);
      setLoadedProducts(data.loadedProducts || 0);

      if (append) {
        setAllProducts(prev => [...prev, ...(data.products || [])]);
      } else {
        setAllProducts(data.products || []);
      }

      setCurrentPage(page);
    } catch (e: any) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [storeFilter]);

  // Load more products
  const loadMore = useCallback(() => {
    if (hasMore && !loadingMore) {
      loadData(currentPage + 1, true);
    }
  }, [hasMore, loadingMore, currentPage, loadData]);

  // Initial load
  useEffect(() => {
    loadData(1, false);
  }, [loadData]);

  // Reload when store filter changes
  useEffect(() => {
    if (storeFilter !== 'all') {
      loadData(1, false);
    }
  }, [storeFilter, loadData]);

  useEffect(() => {
    const fetchLists = async () => {
      try {
        const r = await fetch('/api/lists');
        const d = await r.json();
        setLists(d.lists || []);
      } catch (error) {
        console.error('Failed to fetch lists:', error);
      }
    };
    if (user?.email) {
      fetchLists();
    }
  }, [user?.email]);

  const tableData = useMemo(() => {
    let products = [...(overrideProducts || allProducts)];
    if (storeFilter !== 'all') products = products.filter(p => p.__storeHost === storeFilter);
    if (vendorFilter !== 'all') products = products.filter(p => (((p.vendor ?? '').trim() || EMPTY)) === vendorFilter);
    if (typeFilter !== 'all') products = products.filter(p => (((p.product_type ?? '').trim() || EMPTY)) === typeFilter);
    if (globalFilter) {
      const f = globalFilter.toLowerCase();
      products = products.filter(product => {
        const productFieldsMatch =
          product.title?.toLowerCase().includes(f) ||
          product.handle?.toLowerCase().includes(f) ||
          (product.vendor ?? '').toLowerCase().includes(f) ||
          (product.product_type ?? '').toLowerCase().includes(f);
        const variantFieldsMatch = product.variants?.some((variant: any) =>
          variant.title.toLowerCase().includes(f) ||
          (variant.sku && variant.sku.toLowerCase().includes(f))
        );
        return productFieldsMatch || variantFieldsMatch;
      });
    }
    return products as any[];
  }, [allProducts, overrideProducts, storeFilter, vendorFilter, typeFilter, globalFilter]);

  const availableStores = useMemo(() => {
    const hosts = new Set<string>();
    for (const s of stores) { try { hosts.add(new URL(s.shopUrl).hostname); } catch { hosts.add(s.shopUrl); } }
    return Array.from(hosts).sort();
  }, [stores]);

  const availableVendors = useMemo(() => {
    const vendorCounts: { [key: string]: number } = {};
    tableData.forEach((prod: any) => {
      const key = (prod.vendor ?? '').trim() || EMPTY;
      vendorCounts[key] = (vendorCounts[key] || 0) + 1;
    });
    return Object.keys(vendorCounts).map(name => ({ name, count: vendorCounts[name] })).sort((a,b) => a.name.localeCompare(b.name));
  }, [tableData]);

  const availableProductTypes = useMemo(() => {
    const types = new Set<string>();
    tableData.forEach((p: any) => { types.add(((p.product_type ?? '').trim() || EMPTY)); });
    return Array.from(types).sort();
  }, [tableData]);

  // collections list is not used for fetching in Console, just filtering by product fields (noop here).
  const availableCollections = useMemo(() => {
    if (storeFilter === 'all') return [] as { handle: string; title: string; count: number }[];
    const cols = allCollections.filter((c: any) => c.__storeHost === storeFilter);
    return cols.map((c: any) => ({ handle: c.handle, title: c.title, count: c.products_count })).sort((a:any,b:any) => a.title.localeCompare(b.title));
  }, [allCollections, storeFilter]);

  useEffect(() => {
    // Reset collection filter when store changes
    setCollectionFilter('all');
    setOverrideProducts(null);
  }, [storeFilter]);

  const handleCollectionSelect = useCallback(async (handle: string) => {
    setCollectionFilter(handle);
    setOverrideProducts(null);
    if (handle === 'all' || storeFilter === 'all') return;
    const store = stores.find(s => {
      try { return new URL(s.shopUrl).hostname === storeFilter; } catch { return s.shopUrl === storeFilter; }
    });
    if (!store) return;
    setCollectionLoading(true);
    try {
      const res = await fetch('/api/collection-products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopUrl: store.shopUrl, collectionHandle: handle }) });
      const data = await res.json();
      if (res.ok && Array.isArray(data.products)) {
        const annotated = data.products.map((p: any) => ({ ...p, __storeUrl: store.shopUrl, __storeHost: storeFilter }));
        setOverrideProducts(annotated);
      }
    } finally {
      setCollectionLoading(false);
    }
  }, [storeFilter, stores]);

  const selectColumn = useMemo(() => ([{
    id: 'select',
    header: ({ table }: any) => (
      <input type="checkbox" checked={table.getIsAllPageRowsSelected()} onChange={table.getToggleAllPageRowsSelectedHandler()} aria-label="Select All" />
    ),
    cell: ({ row }: any) => (
      <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} aria-label="Select Row" />
    ),
    size: 36,
    minSize: 36,
    maxSize: 36,
    enableResizing: false,
  }] as any), []);

  const actionColumn = useMemo(() => ([{
    id: 'view',
    header: () => (
      <div className="text-right text-gray-900">
        <Eye className="h-4 w-4 inline text-gray-900" aria-label="View" />
      </div>
    ),
    size: 48,
    minSize: 48,
    maxSize: 56,
    enableResizing: false,
    cell: ({ row }: any) => {
      const product = isVariant(row.original) ? (row.getParentRow()?.original) : row.original;
      const url = `${product.__storeUrl?.replace(/\/$/, '')}/products/${product.handle}`;
      return (
        <div className="flex justify-end sticky right-0 bg-background pr-2">
          <a href={url} target="_blank" rel="noopener noreferrer" title="Open product">
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      );
    }
  }] as any), []);

  // Override the handle cell to show empty on variant rows (nested)
  const consoleColumns = useMemo(() => {
    return baseColumns.map((col: any) => {
      if (col.accessorKey === 'handle') {
        return {
          ...col,
          cell: ({ row }: any) => {
            const isParent = row.getCanExpand();
            const handle = isVariant(row.original) ? '' : row.original.handle;
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
          }
        } as any;
      }
      return col;
    });
  }, []);

  // Format host to main domain (strip protocol and leading www)
  const formatHost = useCallback((value: string | undefined) => {
    if (!value) return '';
    let host = value;
    try { host = new URL(value).hostname; } catch { /* value might already be a host */ }
    return host.replace(/^www\./, '');
  }, []);

  // Optional Store column (shown before Handle) when NOT filtering per store
  const showStoreColumn = storeFilter === 'all';
  const storeColumn = useMemo(() => ([{
    id: 'store',
    header: () => (<span className="text-gray-900">Store</span>),
    size: 180,
    cell: ({ row }: any) => {
      const p = isVariant(row.original) ? (row.getParentRow()?.original) : row.original;
      const host = p?.__storeHost || p?.__storeUrl || '';
      return <span className="text-gray-900">{formatHost(host)}</span>;
    }
  }] as any), [formatHost]);

  const table = useReactTable({
    data: tableData,
    columns: [...selectColumn, ...(showStoreColumn ? storeColumn : []), ...consoleColumns, ...actionColumn],
    state: { sorting, columnSizing, expanded, rowSelection },
    onExpandedChange: setExpanded,
    onColumnSizingChange: setColumnSizing,
    onRowSelectionChange: setRowSelection,
    columnResizeMode: 'onChange',
    getRowId: (row: any) => isVariant(row) ? `variant-${row.id}` : `product-${row.id}`,
    getSubRows: (originalRow: ProductRowData) => {
      if (!isVariant(originalRow) && originalRow.variants?.length > 1 && originalRow.variants[0].title !== 'Default Title') {
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
    enableRowSelection: true,
  });

  const selectedRowCount = tableData.length;
  const totalBaseCount = useMemo(() => {
    if (storeFilter === 'all') return allProducts.length;
    return allProducts.filter(p => p.__storeHost === storeFilter).length;
  }, [allProducts, storeFilter]);
  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (storeFilter !== 'all') chips.push({ key: 'store', label: `Store: ${storeFilter}`, onClear: () => setStoreFilter('all') });
    if (collectionFilter !== 'all') chips.push({ key: 'collection', label: 'Collection: selected', onClear: () => setCollectionFilter('all') });
    if (vendorFilter !== 'all') chips.push({ key: 'vendor', label: `Vendor: ${vendorFilter === EMPTY ? 'No Vendor' : vendorFilter}`, onClear: () => setVendorFilter('all') });
    if (typeFilter !== 'all') chips.push({ key: 'type', label: `Type: ${typeFilter === EMPTY ? 'No Product Type' : typeFilter}`, onClear: () => setTypeFilter('all') });
    if (globalFilter) chips.push({ key: 'q', label: `Search: ${globalFilter}`, onClear: () => setGlobalFilter('') });
    return chips;
  }, [storeFilter, collectionFilter, vendorFilter, typeFilter, globalFilter]);

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


  const selectedCount = table.getSelectedRowModel().rows.length;
  const allListedCount = table.getPrePaginationRowModel().rows.length;
  const allListedSelected = selectedCount === allListedCount && allListedCount > 0;

  return (
    <div className="w-full max-w-[1440px] mx-auto px-0 space-y-3 md:space-y-4">
      {/* Loading overlay */}
      {(loading || loadingMore) && (
        <LoadingOverlay
          title={loading ? 'Loading Products...' : 'Loading More Products...'}
          description={loading ? 'Fetching data from stores' : `Loading page ${currentPage + 1}`}
          progress={totalProducts > 0 ? {
            current: loadedProducts,
            total: totalProducts
          } : undefined}
        />
      )}

      {/* Refresh button */}
      <div className="flex items-center justify-between gap-3 md:gap-4">
        <div>
          <h2 className="text-2xl font-bold">Console</h2>
          {totalProducts > 0 && (
            <p className="text-sm text-muted-foreground">
              {totalProducts.toLocaleString()} total products • {loadedProducts.toLocaleString()} loaded
              {hasMore && <span className="text-brand-green"> • More available</span>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(1, false)}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {hasMore && !loadingMore && (
            <Button
              variant="outline"
              onClick={loadMore}
              className="flex items-center gap-2"
            >
              Load More
            </Button>
          )}
          <div className="text-sm text-muted-foreground hidden md:block">
            Showing <strong>{selectedRowCount}</strong> of <strong>{totalBaseCount}</strong> products
          </div>
          <Button onClick={handleExport} disabled={loading || tableData.length === 0}>
            Export Products (CSV)
          </Button>
        </div>
      </div>

      {/* Desktop controls moved inside the table header */}

      {/* Mobile filters always visible */}
      <div className="md:hidden space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="h-10 w-full"><SelectValue placeholder="All Stores" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {availableStores.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={collectionFilter} onValueChange={handleCollectionSelect} disabled={storeFilter === 'all'}>
              <SelectTrigger className="h-10 w-full"><SelectValue placeholder="All Collections" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Collections</SelectItem>
                {availableCollections.map(c => (<SelectItem key={c.handle} value={c.handle}>{c.title} ({c.count})</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="h-10 w-full"><SelectValue placeholder="All Vendors" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {availableVendors.map(v => (<SelectItem key={v.name} value={v.name}>{v.name === EMPTY ? 'No Vendor' : v.name} ({v.count})</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-10 w-full"><SelectValue placeholder="All Product Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Product Types</SelectItem>
                {availableProductTypes.map(t => (<SelectItem key={t} value={t}>{t === EMPTY ? 'No Product Type' : t}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          {/* Search input removed here; toolbar search handles it */}
          {activeFilterChips.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {activeFilterChips.map(chip => (
              <Badge key={chip.key} variant="secondary" className="flex items-center gap-2">
                {chip.label}
                <button onClick={chip.onClear} aria-label={`Clear ${chip.key}`}>×</button>
              </Badge>
            ))}
              <Button variant="link" onClick={() => { setStoreFilter('all'); setVendorFilter('all'); setTypeFilter('all'); setCollectionFilter('all'); setGlobalFilter(''); setExpanded({}); }}>Clear All</Button>
              {table.getState().sorting.length > 0 && (<Button variant="link" onClick={() => table.resetSorting()}>Reset Sort</Button>)}
            </div>
          )}
      </div>

      {/* Mobile: product count under filters, above table */}
      <div className="md:hidden px-4 text-sm text-muted-foreground text-center">
        Showing <strong>{selectedRowCount}</strong> of <strong>{totalBaseCount}</strong> products
      </div>

      {/* Desktop filter toolbar above the table */}
      <div className="hidden md:flex items-center gap-3 flex-wrap">
        <div style={{ width: '240px' }}>
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className={cn('h-10 w-full', storeFilter !== 'all' && 'filter-select border-2 border-brand-green')}>
              <SelectValue placeholder="All Stores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {availableStores.map(h => (<SelectItem key={h} value={h}>{h}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        <div className="h-10 w-2 flex-shrink-0 bg-brand-green-light rounded-full" />
        <div style={{ width: '240px' }}>
          <Select value={collectionFilter} onValueChange={handleCollectionSelect} disabled={storeFilter === 'all'}>
            <SelectTrigger className={cn('h-10 w-full', collectionFilter !== 'all' && 'filter-select border-2 border-brand-green')}>
              <SelectValue placeholder="All Collections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Collections</SelectItem>
              {availableCollections.map(c => (
                <SelectItem key={c.handle} value={c.handle}>{c.title} ({c.count})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="h-10 w-2 flex-shrink-0 bg-brand-green-light rounded-full" />

        <div style={{ width: '200px' }}>
          <Select value={vendorFilter} onValueChange={setVendorFilter}>
            <SelectTrigger className={cn('h-10 w-full', vendorFilter !== 'all' && 'filter-select border-2 border-brand-green')}>
              <SelectValue placeholder="All Vendors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {availableVendors.map(v => (
                <SelectItem key={v.name} value={v.name}>{v.name === EMPTY ? 'No Vendor' : v.name} ({v.count})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div style={{ width: '200px' }}>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className={cn('h-10 w-full', typeFilter !== 'all' && 'filter-select border-2 border-brand-green')}>
              <SelectValue placeholder="All Product Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Product Types</SelectItem>
              {availableProductTypes.map(t => (
                <SelectItem key={t} value={t}>{t === EMPTY ? 'No Product Type' : t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

      </div>

      {/* Desktop: show active filter chips under the filters (same style as mobile), no Clear All button */}
      {activeFilterChips.length > 0 && (
        <div className="hidden md:flex items-center gap-2 flex-wrap">
          {activeFilterChips.map(chip => (
            <Badge key={chip.key} variant="secondary" className="flex items-center gap-2">
              {chip.label}
              <button onClick={chip.onClear} aria-label={`Clear ${chip.key}`}>×</button>
            </Badge>
          ))}
          <Button
            variant="link"
            onClick={() => {
              setStoreFilter('all');
              setVendorFilter('all');
              setTypeFilter('all');
              setCollectionFilter('all');
              setGlobalFilter('');
              setExpanded({});
            }}
          >
            Clear All
          </Button>
        </div>
      )}

      {/* Full-bleed wrapper so the table expands to the viewport width */}
      <div className="full-bleed px-4 md:px-8">
      <Card className="py-0 border-2 rounded-2xl overflow-hidden">
        <CardContent className="p-0 px-0">
          {/* Toolbar inside the table frame but visually separate from header */}
          <div className="w-full px-3 py-3 bg-white dark:bg-background flex flex-wrap items-center gap-x-2 gap-y-3 rounded-t-2xl">
            <div className="relative w-full sm:w-[320px] order-2">
              <input
                className={cn('h-8 px-3 border rounded-md w-full text-sm placeholder:text-muted-foreground', globalFilter && 'border-2 border-brand-green')}
                placeholder="Search products..."
                value={globalFilter}
                onChange={e => setGlobalFilter(e.target.value)}
                disabled={loading}
              />
              {globalFilter && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setGlobalFilter('')}
                  disabled={loading}
                >
                  ×
                </Button>
              )}
            </div>

            {/* Row 3 (mobile): List actions */}
            <div className="order-2 w-full sm:w-auto flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setListDialogOpen(true)}
                disabled={selectedCount === 0 || loading}
              >
                Add To List ({selectedCount})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRowSelection({})}
                disabled={selectedCount === 0 || loading}
              >
                Clear
              </Button>
              <Button
                size="sm"
                variant={allListedSelected ? 'outline' : 'default'}
                disabled={allListedSelected || loading}
                onClick={() => {
                  const map: Record<string, boolean> = {};
                  table.getPrePaginationRowModel().rows.forEach(r => { map[r.id] = true; });
                  setRowSelection(map);
                }}
              >
                Select All Products
              </Button>
              {table.getState().sorting.length > 0 && (
                <Button
                  variant="link"
                  onClick={() => table.resetSorting()}
                  disabled={loading}
                >
                  Reset Sort
                </Button>
              )}
            </div>

            {/* Pagination moved to footer below table */}

            {/* List Selection Dialog */}
            <Dialog open={listDialogOpen} onOpenChange={setListDialogOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Selected Products To List</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Choose a list</div>
                    <Select value={selectedListId} onValueChange={setSelectedListId}>
                      <SelectTrigger className={cn('h-10 w-full', selectedListId && 'filter-select')}>
                        <SelectValue placeholder="Select a list" />
                      </SelectTrigger>
                      <SelectContent>
                        {lists.map(l => (<SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>))}
                        <SelectItem value="__new__">+ Create New…</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                  <input id="alsoPresets" type="checkbox" checked={alsoSavePresets} onChange={e=>setAlsoSavePresets(e.target.checked)} />
                  <label htmlFor="alsoPresets" className="text-sm text-muted-foreground">Also add Vendors, Product Types, and Tags to Data Presets</label>
                </div>
                {selectedListId === '__new__' && (
                    <Input className="h-10 w-full text-sm placeholder:text-muted-foreground" placeholder="New list name" value={newListName} onChange={e=>setNewListName(e.target.value)} />
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setListDialogOpen(false)}>Cancel</Button>
                    <Button size="sm" disabled={selectedCount === 0 || (!selectedListId || (selectedListId === '__new__' && !newListName.trim()))} onClick={async () => {
                  let targetListId = selectedListId;
                  if (targetListId === '__new__') {
                    if (!newListName.trim()) return;
                    const r = await fetch('/api/lists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newListName }) });
                    const d = await r.json();
                    targetListId = d.list?.id;
                    setLists(prev => [...prev, d.list]);
                    setSelectedListId(targetListId);
                    setNewListName('');
                  }
                  if (!targetListId) return;
                              const selectedRows = table.getSelectedRowModel().rows;
                              const productsToAdd = Array.from(new Map(selectedRows.map(r => {
                                const base = isVariant(r.original) ? (r.getParentRow()?.original) : r.original;
                                if (!base || !('handle' in base)) return null; // Skip invalid entries
                                const ensuredHost = base?.__storeHost || (base?.__storeUrl ? formatHost(base.__storeUrl) : (storeFilter !== 'all' ? storeFilter : ''));
                                const ensuredUrl = base?.__storeUrl || '';
                                const p = { ...base, __storeHost: ensuredHost, __storeUrl: ensuredUrl };
                                return [`${p.__storeHost || ''}:${p.handle}`, p] as const;
                              }).filter((entry): entry is NonNullable<typeof entry> => entry !== null)).values());
                              await fetch(`/api/lists/${targetListId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ products: productsToAdd }) });
              if (alsoSavePresets) {
                const vendors = Array.from(new Set(productsToAdd.map((p:any)=> (p.vendor ?? '').trim()).filter(Boolean)));
                const productTypes = Array.from(new Set(productsToAdd.map((p:any)=> (p.product_type ?? '').trim()).filter(Boolean)));
                const tags = Array.from(new Set(productsToAdd.flatMap((p:any)=> Array.isArray(p.tags) ? p.tags : (typeof p.tags==='string' ? p.tags.split(',').map((t:string)=>t.trim()) : [])).filter(Boolean)));
                await fetch('/api/presets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendors, productTypes, tags }) });
              }
                  setRowSelection({});
                   setListDialogOpen(false);
                }}>Add To List</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="overflow-auto">
            {/* Collection loading indicator */}
            {isCollectionLoading && (
              <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                  <LoadingSpinner size="sm" />
                  <span>Loading collection products...</span>
                </div>
              </div>
            )}

            <Table style={{ width: table.getCenterTotalSize() }}>
              <TableHeader>
                {table.getHeaderGroups().map(hg => (
                  <TableRow key={hg.id} className="bg-gray-300 hover:bg-gray-300">
                    {hg.headers.map(h => (
                      <TableHead key={h.id} style={{ width: h.getSize() }} className={cn('relative px-4',
                        h.column.id === 'view' && 'sticky right-0 bg-gray-300 z-10',
                        h.column.id === 'select' && 'sticky left-0 bg-gray-300 z-10'
                      )}>
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {!(h.column.id === 'select' || h.column.id === 'view') && (
                          <div
                            onMouseDown={h.getResizeHandler()}
                            onTouchStart={h.getResizeHandler()}
                            className={cn('resizer', h.column.getIsResizing() && 'isResizing')}
                          />
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loading ? (
                  <LoadingTableRow colSpan={table.getAllColumns().length} text="Loading products..." />
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={table.getAllColumns().length} className="h-32">
                      <EmptyState
                        title="No products found"
                        description={
                          storeFilter !== 'all'
                            ? 'Try selecting a different store or clearing filters.'
                            : 'No products available. Try refreshing or check your store connections.'
                        }
                        action={
                          storeFilter !== 'all'
                            ? {
                                label: 'Clear All Filters',
                                onClick: () => {
                                  setStoreFilter('all');
                                  setVendorFilter('all');
                                  setTypeFilter('all');
                                  setCollectionFilter('all');
                                  setGlobalFilter('');
                                }
                              }
                            : undefined
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'} className="dark:bg-background">
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id} style={{ width: cell.column.getSize() }} className={cn('p-4 align-middle',
                          cell.column.id === 'view' && 'sticky right-0 bg-card z-10',
                          cell.column.id === 'select' && 'sticky left-0 bg-card z-10'
                        )}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Table footer pagination (desktop & mobile) */}
      <div className="flex items-center gap-2 py-4 w-full">
        {/* Center: nav + page number */}
        <div className="flex-none flex items-center gap-2 justify-center mx-auto">
          <Button variant="outline" size="icon" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} aria-label="First page">
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span>
          <Button variant="outline" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} aria-label="Last page">
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Right: page size dropdown */}
        <div className="flex-1 flex items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground">Show</span>
          <Select value={`${table.getState().pagination.pageSize}`} onValueChange={value => table.setPageSize(Number(value))}>
            <SelectTrigger className="w-[80px] h-9"><SelectValue placeholder="Page size" /></SelectTrigger>
            <SelectContent>
              {[10,25,50,100].map(size => (<SelectItem key={size} value={`${size}`}>{size}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && <div className="mt-4 text-sm text-muted-foreground">Loading...</div>}
      {error && <div className="mt-4 text-sm text-red-500">{error}</div>}
    </div>
  );
}
