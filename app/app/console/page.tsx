'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { ArrowUpRight, Eye } from 'lucide-react';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { columns as baseColumns, ProductRowData, isVariant } from '@/components/pages/columns';

type StoreMeta = { shopUrl: string; lastUpdated?: string; productCount?: number; collectionCount?: number };
type MergedProduct = any & { __storeUrl: string; __storeHost: string };

const EMPTY = '__empty__';

export default function ConsolePage() {
  const user = useAuthStore(s => s.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stores, setStores] = useState<StoreMeta[]>([]);
  const [allProducts, setAllProducts] = useState<MergedProduct[]>([]);
  const [allCollections, setAllCollections] = useState<any[]>([]);
  const [overrideProducts, setOverrideProducts] = useState<MergedProduct[] | null>(null);
  const [isCollectionLoading, setCollectionLoading] = useState(false);

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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [listDialogOpen, setListDialogOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setError('');
      try {
        const res = await fetch('/api/console-data', { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to load console data');
        const data = await res.json();
        if (!active) return;
        setStores(data.stores || []);
        setAllProducts(data.products || []);
        setAllCollections(data.collections || []);
      } catch (e: any) {
        if (e.name !== 'AbortError') setError(e.message || 'Failed to load');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; controller.abort(); };
  }, [user?.email]);

  useEffect(() => {
    const fetchLists = async () => {
      const r = await fetch('/api/lists');
      const d = await r.json();
      setLists(d.lists || []);
    };
    fetchLists();
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
    size: 32,
  }] as any), []);

  const actionColumn = useMemo(() => ([{
    id: 'view',
    header: () => (
      <div className="text-right">
        <Eye className="h-4 w-4 inline" aria-label="View" />
      </div>
    ),
    size: 60,
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

  const table = useReactTable({
    data: tableData,
    columns: [...selectColumn, ...consoleColumns, ...actionColumn],
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

  const renderTableBody = () => {
    if (loading) {
      return (
        <tbody>
          {Array.from({ length: 10 }).map((_, i) => (
            <tr key={i} className="animate-pulse">
              <td colSpan={table.getAllColumns().length} className="p-4">
                <div className="h-4 w-1/3 bg-muted rounded mb-2" />
                <div className="h-4 w-2/3 bg-muted rounded" />
              </td>
            </tr>
          ))}
        </tbody>
      );
    }
    if (error) {
      return <tbody><tr><td colSpan={table.getAllColumns().length} className="p-6 text-sm text-red-500">{error} <button className="underline" onClick={() => {
        setLoading(true); setError('');
        // re-trigger effect by updating a dummy state
        const evt = new Event('reload'); window.dispatchEvent(evt);
      }}>Retry</button></td></tr></tbody>;
    }
    if (!loading && table.getRowModel().rows.length === 0) {
      return <tbody><tr><td colSpan={table.getAllColumns().length} className="p-6 text-sm text-muted-foreground">No products match current filters.</td></tr></tbody>;
    }
    return <TableBody>{table.getRowModel().rows.map(row => (
      <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'} className="dark:bg-background">
        {row.getVisibleCells().map(cell => (
          <TableCell key={cell.id} style={{ width: cell.column.getSize() }} className={cn('p-4 align-middle',
            cell.column.id === 'view' && 'sticky right-0 bg-background z-10',
            cell.column.id === 'select' && 'sticky left-0 bg-background z-10'
          )}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    ))}</TableBody>;
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-0 space-y-3 md:space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
        <div>
          <h2 className="text-2xl font-bold">Console</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground hidden md:block">
            Showing <strong>{selectedRowCount}</strong> of <strong>{totalBaseCount}</strong> products
          </div>
          <Button variant="outline" size="sm" className="md:hidden" onClick={() => setFiltersOpen(v => !v)}>
            {filtersOpen ? 'Hide Filters' : 'Show Filters'}
          </Button>
          <Button onClick={handleExport}>Export Products (CSV)</Button>
        </div>
      </div>

      {/* Desktop controls moved inside the table header */}

      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleContent className="md:hidden space-y-3">
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
          <div className="relative">
            <input className={cn('h-10 px-3 border rounded-md w-full text-sm placeholder:text-muted-foreground', globalFilter && 'border-2 border-brand-green')} placeholder="Search products..." value={globalFilter} onChange={e => setGlobalFilter(e.target.value)} />
            {globalFilter && (<Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setGlobalFilter('')}>×</Button>)}
          </div>
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
        </CollapsibleContent>
      </Collapsible>

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

        {(storeFilter !== 'all' || vendorFilter !== 'all' || typeFilter !== 'all' || collectionFilter !== 'all' || globalFilter) && (
          <Button variant="link" onClick={() => { setStoreFilter('all'); setVendorFilter('all'); setTypeFilter('all'); setCollectionFilter('all'); setGlobalFilter(''); setExpanded({}); }}>Clear Filters</Button>
        )}
      </div>

      <Card className="py-0">
        <CardContent className="p-0 px-0">
          {/* Toolbar inside the table frame but visually separate from header */}
          <div className="w-full px-3 py-2 bg-white dark:bg-background flex items-center gap-2">
            <div className="relative" style={{ width: 320 }}>
              <input
                className={cn('h-8 px-3 border rounded-md w-full text-sm placeholder:text-muted-foreground', globalFilter && 'border-2 border-brand-green')}
                placeholder="Search products..."
                value={globalFilter}
                onChange={e => setGlobalFilter(e.target.value)}
              />
              {globalFilter && (
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setGlobalFilter('')}>×</Button>
              )}
            </div>
            <Button size="sm" onClick={() => setListDialogOpen(true)} disabled={selectedCount === 0}>Add To List ({selectedCount})</Button>
            <Button size="sm" variant="outline" onClick={() => setRowSelection({})} disabled={selectedCount === 0}>Clear</Button>
            <Button size="sm" variant={allListedSelected ? 'outline' : 'default'} disabled={allListedSelected} onClick={() => {
              const map: Record<string, boolean> = {};
              table.getPrePaginationRowModel().rows.forEach(r => { map[r.id] = true; });
              setRowSelection(map);
            }}>Select All Products</Button>
            {table.getState().sorting.length > 0 && (
              <Button variant="link" onClick={() => table.resetSorting()}>Reset Sort</Button>
            )}

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
                    const p: any = isVariant(r.original) ? (r.getParentRow()?.original) : r.original;
                    if (!p) return [Math.random().toString(36), {}];
                    return [`${p.__storeHost || ''}:${p.handle}`, p];
                  })).values());
                  await fetch(`/api/lists/${targetListId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ products: productsToAdd }) });
                  setRowSelection({});
                   setListDialogOpen(false);
                }}>Add To List</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="overflow-auto">
            <Table style={{ width: table.getCenterTotalSize() }}>
              <TableHeader>
                {table.getHeaderGroups().map(hg => (
                  <TableRow key={hg.id} className="bg-gray-300 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-700">
                    {hg.headers.map(h => (
                      <TableHead key={h.id} style={{ width: h.getSize() }} className={cn('relative px-4',
                        h.column.id === 'view' && 'sticky right-0 bg-gray-300 dark:bg-gray-700 z-10',
                        h.column.id === 'select' && 'sticky left-0 bg-gray-300 dark:bg-gray-700 z-10'
                      )}>
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
              {renderTableBody()}
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4 py-4 w-full">
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
            <SelectTrigger className="w-[80px] h-9"><SelectValue placeholder="Page size" /></SelectTrigger>
            <SelectContent>
              {[10,25,50,100].map(size => (<SelectItem key={size} value={`${size}`}>{size}</SelectItem>))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">products</span>
        </div>
      </div>

  {/* Additional global loading & error states already handled inside table */}
    </div>
  );
}
