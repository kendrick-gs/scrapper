'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { ArrowUpRight, Eye, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
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
import { columns as baseColumns, ProductRowData, isVariant } from '@/components/steps/columns';

type MergedProduct = any & { __storeUrl?: string; __storeHost?: string };
const EMPTY = '__empty__';

export default function ListViewPage() {
  const params = useParams<{ id: string }>();
  const listId = params?.id as string;
  const user = useAuthStore(s => s.user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [listName, setListName] = useState('');
  const [allProducts, setAllProducts] = useState<MergedProduct[]>([]);

  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [globalFilter, setGlobalFilter] = useState('');

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [edits, setEdits] = useState<Record<string, any>>({});
  const [presets, setPresets] = useState<{ vendors: string[]; productTypes: string[]; tags: string[] }>({ vendors: [], productTypes: [], tags: [] });

  useEffect(() => {
    const load = async () => {
      if (!listId) return;
      setLoading(true); setError('');
      try {
        const res = await fetch(`/api/lists/${listId}`);
        const data = await res.json();
        const items: MergedProduct[] = (data.list?.items || []).map((p: any) => ({ ...p }));
        setListName(data.list?.name || 'List');
        setAllProducts(items);
      } catch (e: any) {
        setError(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [listId, user?.email]);

  useEffect(() => {
    const loadPresets = async () => {
      const r = await fetch('/api/presets');
      const d = await r.json();
      setPresets(d.presets || { vendors: [], productTypes: [], tags: [] });
    };
    loadPresets();
  }, [user?.email]);

  const tableData = useMemo(() => {
    const merged = allProducts.map((p: any) => ({ ...p, ...(edits[p.id] || {}) }));
    let products = [...merged];
    if (storeFilter !== 'all') products = products.filter(p => (p.__storeHost || p.__storeUrl || '').includes(storeFilter));
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
  }, [allProducts, edits, storeFilter, vendorFilter, typeFilter, globalFilter]);

  // Persist edits live (debounced) by key host:handle
  const saveEdit = useCallback((id: any, data: any, base: any) => {
    setEdits(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...data } }));
    const host = base?.__storeHost || (base?.__storeUrl ? (() => { try { return new URL(base.__storeUrl).hostname; } catch { return base.__storeUrl; } })() : '');
    const key = `${host || ''}:${base.handle}`;
    (saveEdit as any)._queue = (saveEdit as any)._queue || [];
    (saveEdit as any)._timer && clearTimeout((saveEdit as any)._timer);
    (saveEdit as any)._queue.push({ key, data });
    (saveEdit as any)._timer = setTimeout(async () => {
      const updates = (saveEdit as any)._queue;
      (saveEdit as any)._queue = [];
      await fetch(`/api/lists/${listId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates }) });
    }, 400);
  }, [listId]);


  const availableStores = useMemo(() => {
    const hosts = new Set<string>();
    for (const p of allProducts) {
      const host = p.__storeHost || (p.__storeUrl ? (() => { try { return new URL(p.__storeUrl!).hostname; } catch { return p.__storeUrl!; } })() : '');
      if (host) hosts.add(host);
    }
    return Array.from(hosts).sort();
  }, [allProducts]);

  const availableVendors = useMemo(() => {
    return presets.vendors.map(name => ({ name, count: 0 }));
  }, [presets.vendors]);

  const availableProductTypes = useMemo(() => {
    return presets.productTypes;
  }, [presets.productTypes]);

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
      const url = `${(product.__storeUrl || '').replace(/\/$/, '')}/products/${product.handle}`;
      return (
        <div className="flex justify-end sticky right-0 bg-background pr-2">
          <a href={url} target="_blank" rel="noopener noreferrer" title="Open product">
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      );
    }
  }] as any), []);

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

  const consoleColumns = useMemo(() => {
    // Start from base columns but remove Updated At for lists view
    const base = baseColumns.filter((c: any) => c.accessorKey !== 'updated_at');
    return base.map((col: any) => {
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
                {editMode && !isVariant(row.original) ? (
                  <Input
                    className="h-8"
                    value={handle || ''}
                    onChange={(e) => saveEdit(row.original.id, { handle: e.target.value }, row.original)}
                  />
                ) : (
                  <span className="line-clamp-2 font-medium">{handle}</span>
                )}
              </div>
            );
          }
        } as any;
      }
      if (editMode && !col.id && (col.accessorKey === 'title')) {
        const key = col.accessorKey;
        return {
          ...col,
          cell: ({ row }: any) => {
            if (isVariant(row.original)) return <span className="text-muted-foreground" />;
            const val = row.original[key] ?? '';
            return (
              <Input
                className="h-8"
                value={val}
                onChange={(e) => saveEdit(row.original.id, { [key]: e.target.value }, row.original)}
              />
            );
          }
        } as any;
      }
      if (editMode && col.accessorKey === 'vendor') {
        return {
          ...col,
          cell: ({ row }: any) => {
            if (isVariant(row.original)) return <span className="text-muted-foreground" />;
            const current = (row.original.vendor ?? '').trim() || EMPTY;
            return (
              <Select
                value={current}
                onValueChange={(value) => saveEdit(row.original.id, { vendor: value === EMPTY ? '' : value }, row.original)}
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key={EMPTY} value={EMPTY}>No Vendor</SelectItem>
                  {availableVendors.map(v => (
                    <SelectItem key={`vendor-${v.name}`} value={v.name}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }
        } as any;
      }
      if (editMode && col.accessorKey === 'product_type') {
        return {
          ...col,
          cell: ({ row }: any) => {
            if (isVariant(row.original)) return <span className="text-muted-foreground" />;
            const current = (row.original.product_type ?? '').trim() || EMPTY;
            return (
              <Select
                value={current}
                onValueChange={(value) => saveEdit(row.original.id, { product_type: value === EMPTY ? '' : value }, row.original)}
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key={EMPTY} value={EMPTY}>No Product Type</SelectItem>
                  {availableProductTypes.map(t => (
                    <SelectItem key={`ptype-${t}`} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }
        } as any;
      }
      if (editMode && (col.id === 'price' || col.accessorKey === 'price')) {
        return {
          ...col,
          cell: ({ row }: any) => {
            if (isVariant(row.original)) return <span />;
            const price = row.original?.variants?.[0]?.price || row.original.price || '';
            return (
              <Input
                className="h-8"
                type="number"
                value={price}
                onChange={(e) => saveEdit(row.original.id, { variants: [{ ...(row.original.variants?.[0] || {}), price: e.target.value }] }, row.original)}
              />
            );
          }
        } as any;
      }
      if (editMode && col.accessorKey === 'tags') {
        return {
          ...col,
          cell: ({ row }: any) => {
            if (isVariant(row.original)) return <span />;
            const tags = Array.isArray(row.original.tags) ? row.original.tags.join(', ') : (row.original.tags || '');
            return (
              <textarea
                className="h-24 w-full border rounded-md px-2 py-1 text-sm"
                value={tags}
                onChange={(e) => saveEdit(row.original.id, { tags: e.target.value }, row.original)}
              />
            );
          }
        } as any;
      }
      if (editMode && col.accessorKey === 'body_html') {
        return {
          ...col,
          cell: ({ row }: any) => {
            if (isVariant(row.original)) return <span />;
            const body = row.original.body_html || '';
            return (
              <textarea
                className="h-24 w-full border rounded-md px-2 py-1 text-sm"
                value={body}
                onChange={(e) => saveEdit(row.original.id, { body_html: e.target.value }, row.original)}
              />
            );
          }
        } as any;
      }
      return col;
    });
  }, [editMode]);

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
  const totalBaseCount = allProducts.length;

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (storeFilter !== 'all') chips.push({ key: 'store', label: `Store: ${storeFilter}`, onClear: () => setStoreFilter('all') });
    if (vendorFilter !== 'all') chips.push({ key: 'vendor', label: `Vendor: ${vendorFilter === EMPTY ? 'No Vendor' : vendorFilter}`, onClear: () => setVendorFilter('all') });
    if (typeFilter !== 'all') chips.push({ key: 'type', label: `Type: ${typeFilter === EMPTY ? 'No Product Type' : typeFilter}`, onClear: () => setTypeFilter('all') });
    if (globalFilter) chips.push({ key: 'q', label: `Search: ${globalFilter}`, onClear: () => setGlobalFilter('') });
    return chips;
  }, [storeFilter, vendorFilter, typeFilter, globalFilter]);

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

  const removeSelected = useCallback(async () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const keys = Array.from(new Set(selectedRows.map(r => {
      const base: any = isVariant(r.original) ? (r.getParentRow()?.original) : r.original;
      const host = base?.__storeHost || (base?.__storeUrl ? (() => { try { return new URL(base.__storeUrl).hostname; } catch { return base.__storeUrl; } })() : '');
      return `${host || ''}:${base.handle}`;
    })));
    if (keys.length === 0) return;
    const res = await fetch(`/api/lists/${listId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keys }) });
    const data = await res.json();
    if (res.ok) {
      setAllProducts((data.list?.items || []).map((p: any) => ({ ...p })));
      setRowSelection({});
    } else {
      alert(data.error || 'Failed to remove');
    }
  }, [listId, table]);

  return (
    <div className="w-full max-w-[1440px] mx-auto px-0 space-y-3 md:space-y-4">
      <div className="flex items-center justify-between gap-3 md:gap-4">
        <div>
          <h2 className="text-2xl font-bold">List: {listName}</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground hidden md:block">
            Showing <strong>{selectedRowCount}</strong> of <strong>{totalBaseCount}</strong> products
          </div>
          <Button variant={editMode ? 'outline' : 'default'} onClick={() => setEditMode((v) => !v)}>{editMode ? 'Done' : 'Edit Mode'}</Button>
          <Button onClick={handleExport}>Export Products (CSV)</Button>
        </div>
      </div>

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
        {activeFilterChips.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {activeFilterChips.map(chip => (
              <Badge key={chip.key} variant="secondary" className="flex items-center gap-2">
                {chip.label}
                <button onClick={chip.onClear} aria-label={`Clear ${chip.key}`}>×</button>
              </Badge>
            ))}
            <Button variant="link" onClick={() => { setStoreFilter('all'); setVendorFilter('all'); setTypeFilter('all'); setGlobalFilter(''); setExpanded({}); }}>Clear All</Button>
            {sorting.length > 0 && (<Button variant="link" onClick={() => setSorting([])}>Reset Sort</Button>)}
          </div>
        )}
      </div>

      {/* Mobile: product count under filters, above table */}
      <div className="md:hidden px-4 text-sm text-muted-foreground text-center">
        Showing <strong>{selectedRowCount}</strong> of <strong>{totalBaseCount}</strong> products
      </div>

      {/* Desktop filters */}
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

        <div style={{ width: '200px' }}>
          <Select value={vendorFilter} onValueChange={setVendorFilter}>
            <SelectTrigger className={cn('h-10 w-full', vendorFilter !== 'all' && 'filter-select border-2 border-brand-green')}>
              <SelectValue placeholder="All Vendors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {availableVendors.map(v => (<SelectItem key={v.name} value={v.name}>{v.name === EMPTY ? 'No Vendor' : v.name} ({v.count})</SelectItem>))}
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
              {availableProductTypes.map(t => (<SelectItem key={t} value={t}>{t === EMPTY ? 'No Product Type' : t}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {activeFilterChips.length > 0 && (
        <div className="hidden md:flex items-center gap-2 flex-wrap">
          {activeFilterChips.map(chip => (
            <Badge key={chip.key} variant="secondary" className="flex items-center gap-2">
              {chip.label}
              <button onClick={chip.onClear} aria-label={`Clear ${chip.key}`}>×</button>
            </Badge>
          ))}
          <Button variant="link" onClick={() => { setStoreFilter('all'); setVendorFilter('all'); setTypeFilter('all'); setGlobalFilter(''); setExpanded({}); }}>Clear All</Button>
        </div>
      )}

      {/* Full-bleed wrapper so the table expands to the viewport width */}
      <div className="full-bleed px-4 md:px-8">
      <Card className="py-0 border-2 rounded-2xl overflow-hidden">
        <CardContent className="p-0 px-0">
          {/* Toolbar */}
          <div className="w-full px-3 py-3 bg-white dark:bg-background flex flex-wrap items-center gap-x-2 gap-y-3 rounded-t-2xl">
            {/* Row 2 default, but allows wrap on mobile */}
            <div className="relative w-full sm:w-[320px] order-2">
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
            <div className="order-2 w-full sm:w-auto flex items-center gap-2">
              <Button size="sm" onClick={removeSelected} disabled={selectedCount === 0}>Remove From List</Button>
              {sorting.length > 0 && (
                <Button variant="link" onClick={() => setSorting([])}>Reset Sort</Button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-auto">
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
                {table.getRowModel().rows.map(row => (
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
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Footer pagination */}
      <div className="flex items-center gap-2 py-4 w-full">
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
    </div>
  );
}
