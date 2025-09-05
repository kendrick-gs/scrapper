'use client';

import { useEffect, useMemo, useState, useCallback, useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { getConsoleCache, setConsoleCache, buildProductIndex } from '@/lib/idbCache';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { ArrowUpRight, Eye, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  flexRender,
  SortingState,
  ColumnSizingState,
  ExpandedState,
} from '@tanstack/react-table';
import { columns as baseColumns, ProductRowData, isVariant } from '@/components/pages/columns';
import { analyzeProducts } from '@/lib/productAnalyzer';

type StoreMeta = { shopUrl: string; lastUpdated?: string; productCount?: number; collectionCount?: number };
type MergedProduct = any & { __storeUrl: string; __storeHost: string };

const EMPTY = '__empty__';

export default function ConsolePage() {
  const searchParams = useSearchParams();
  const initialStoreParam = typeof window !== 'undefined' ? (searchParams?.get('store') || 'all') : 'all';
  const user = useAuthStore(s => s.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stores, setStores] = useState<StoreMeta[]>([]);
  const [allProducts, setAllProducts] = useState<MergedProduct[]>([]);
  const [hasVariantOptions, setHasVariantOptions] = useState(false);
  const [allCollections, setAllCollections] = useState<any[]>([]);
  const [overrideProducts, setOverrideProducts] = useState<MergedProduct[] | null>(null);
  const [isCollectionLoading, setCollectionLoading] = useState(false);

  const [storeFilter, setStoreFilter] = useState<string>(initialStoreParam);
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [collectionFilter, setCollectionFilter] = useState<string>('all');
  const [globalFilter, setGlobalFilter] = useState('');

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<any>({ option: false });
  const [showOptions, setShowOptions] = useState(false);
  const [addingList, setAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [lists, setLists] = useState<{ id: string; name: string }[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  // Track mount to guard against library-triggered state updates before initial commit
  const mountedRef = useRef(false);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    (async () => {
      setLoading(true); setError('');
      // 1. Hydrate from cache immediately if present
      const userKey = user?.email || 'anon';
      const cached = await getConsoleCache(userKey);
      if (cached && active) {
        setStores(cached.stores || []);
        setAllProducts(cached.products || []);
        setAllCollections(cached.collections || []);
        setLoading(false); // show cached instantly
      }
      // 2. Fetch latest
      try {
        const res = await fetch('/api/console-data', { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to load console data');
        const data = await res.json();
        if (!active) return;
        // 3. Diff products (shallow by id + updated_at if present)
  const newProducts = analyzeProducts(data.products || []);
  const optionPresence = newProducts.some(p => p.variants?.some((v: any) => (v.__options && v.__options.length > 0)));
  setHasVariantOptions(optionPresence);
        if (!cached) {
          setAllProducts(newProducts);
        } else {
          // Fast lookup from cached index
          const indexMap: Record<string, { updated_at?: string; hash?: string; ref: any }> = {};
          cached.productIndex?.forEach(entry => {
            const prod = (cached.products || []).find(p => p.id === entry.id);
            if (prod) indexMap[entry.id] = { updated_at: entry.updated_at, hash: entry.hash, ref: prod };
          });
          const merged = newProducts.map((p: any) => {
            const prevMeta = indexMap[p.id];
            if (!prevMeta) return p;
            if (p.updated_at && prevMeta.updated_at && p.updated_at === prevMeta.updated_at) return prevMeta.ref;
            if (!p.updated_at && prevMeta.hash) {
              // compute current quick hash
              // inline lightweight hash same as buildProductIndex logic
              const str = JSON.stringify({ id: p.id, title: p.title, updated_at: p.updated_at, v: p.variants?.length });
              let h = 0, i = 0; while (i < str.length) { h = (h << 5) - h + str.charCodeAt(i++) | 0; }
              const cur = h.toString(36);
              if (cur === prevMeta.hash) return prevMeta.ref;
            }
            return p;
          });
          setAllProducts(merged);
        }
        setStores(data.stores || []);
        setAllCollections(data.collections || []);
        // 4. Persist with index & user scoping
        const payload = {
          products: newProducts,
          productIndex: buildProductIndex(newProducts),
          stores: data.stores || [],
            collections: data.collections || [],
          updatedAt: Date.now(),
          user: userKey,
          schemaVersion: 2,
        };
        setConsoleCache(payload).catch(()=>{});
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          if (!cached) setError(e.message || 'Failed to load');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; controller.abort(); };
  }, [user?.email]);

  // Deep link validation moved below after availableStores computed

  useEffect(() => {
    const fetchLists = async () => {
      const r = await fetch('/api/lists');
      const d = await r.json();
      setLists(d.lists || []);
    };
    fetchLists();
  }, [user?.email]);

  // All filtered (top-level) products prior to product-level pagination
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

  // Product-level pagination state (only counts top-level products, not variants)
  const [productPageSize, setProductPageSize] = useState<number>(25);
  const [productPageIndex, setProductPageIndex] = useState<number>(0);

  // Clamp page index if filters change total count
  useEffect(() => {
    const pageCount = Math.max(1, Math.ceil(tableData.length / productPageSize));
    setProductPageIndex(idx => Math.min(idx, pageCount - 1));
  }, [tableData.length, productPageSize]);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(tableData.length / productPageSize)), [tableData.length, productPageSize]);
  const pageProducts = useMemo(() => {
    const start = productPageIndex * productPageSize;
    const end = start + productPageSize;
    return tableData.slice(start, end);
  }, [tableData, productPageIndex, productPageSize]);

  const availableStores = useMemo(() => {
    const hosts = new Set<string>();
    for (const s of stores) { try { hosts.add(new URL(s.shopUrl).hostname); } catch { hosts.add(s.shopUrl); } }
    return Array.from(hosts).sort();
  }, [stores]);

  // Validate deep link store param after stores loaded & hosts computed
  useEffect(() => {
    if (!stores.length) return;
    if (storeFilter === 'all') return;
    if (!availableStores.includes(storeFilter)) {
      setStoreFilter('all');
    }
  }, [stores, availableStores, storeFilter]);

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
    enableResizing: false,
    header: ({ table }: any) => (
      <input type="checkbox" checked={table.getIsAllPageRowsSelected()} onChange={table.getToggleAllPageRowsSelectedHandler()} aria-label="Select All" />
    ),
    cell: ({ row }: any) => (
      <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} aria-label="Select Row" />
    ),
    size: 40,
    minSize: 40,
    maxSize: 40,
  }] as any), []);

  const actionColumn = useMemo(() => ([{
    id: 'view',
    enableResizing: false,
    header: () => (
      <div className="text-right">
        <Eye className="h-4 w-4 inline" aria-label="View" />
      </div>
    ),
    size: 70,
    minSize: 70,
    maxSize: 70,
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
    const cols = hasVariantOptions ? baseColumns : baseColumns.filter((c: any) => c.id !== 'option');
    return cols.map((col: any) => {
      if (col.accessorKey === 'handle') {
        return {
          ...col,
            header: (ctx: any) => {
              const Original = (col as any).header;
              return (
                <div className="flex items-center gap-1 w-full pr-1">
                  <div className="flex-1 min-w-0">
                    {typeof Original === 'function' ? Original(ctx) : Original}
                  </div>
                  {!showOptions && hasVariantOptions && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowOptions(true); }}
                      aria-label="Show options column"
                      className="flex-none text-[10px] font-semibold text-muted-foreground hover:text-foreground px-1.5 py-1 rounded border border-border/50 hover:border-border transition-colors bg-background"
                    >
                      {'>>'}
                    </button>
                  )}
                </div>
              );
            },
          cell: ({ row }: any) => {
            const isParent = row.getCanExpand();
            const product = isVariant(row.original) ? (row.getParentRow()?.original) : row.original;
            const handle = isVariant(row.original) ? '' : product?.handle;
            // Variant badge (>=1 meaningful variants excluding Default Title)
            let badge: React.ReactNode = null;
            if (!isVariant(row.original) && product) {
              const variants = product.variants || [];
              const meaningful = variants.filter((v: any) => v.title !== 'Default Title');
              const variantCount = meaningful.length; // show even if 1
              if (variantCount > 0) {
                badge = (
                  <span className="ml-2 inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 h-5 text-[11px] font-medium tracking-tight shadow-sm backdrop-blur-sm">
                    {variantCount}<span className="ml-1 hidden sm:inline">vars</span>
                  </span>
                );
              }
            }
            return (
              <div style={{ paddingLeft: `${row.depth * 1.5}rem` }} className="flex items-center gap-1 w-full">
                {isParent ? (
                  <button onClick={row.getToggleExpandedHandler()} aria-label={row.getIsExpanded() ? 'Collapse row' : 'Expand row'} className="mr-1 cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground">
                    {row.getIsExpanded() ? '▼' : '►'}
                  </button>
                ) : <span className="mr-1 w-4 inline-block" />}
                <span className="line-clamp-2 font-medium">{handle}</span>
                {badge}
              </div>
            );
          }
        } as any;
      }
      if (col.id === 'option') {
        return {
          ...col,
            header: (ctx: any) => {
              const Original = (col as any).header;
              return (
                <div className="flex items-center gap-1 w-full pr-1">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowOptions(false); }}
                    aria-label="Hide options column"
                    className="flex-none text-[10px] font-semibold text-muted-foreground hover:text-foreground px-1.5 py-1 rounded border border-border/50 hover:border-border transition-colors bg-background"
                  >
                    {'<<'}
                  </button>
                  <div className="flex-1 min-w-0">
                    {typeof Original === 'function' ? Original(ctx) : Original}
                  </div>
                </div>
              );
            }
        } as any;
      }
      return col;
    });
  }, [hasVariantOptions, showOptions]);

  // Sync column visibility with showOptions toggle
  useEffect(() => {
    setColumnVisibility((prev: any) => ({ ...prev, option: showOptions }));
  }, [showOptions]);

  const table = useReactTable({
    // Only current page's products; expansion will add variant sub-rows without affecting product page size
    data: pageProducts,
    columns: [...selectColumn, ...consoleColumns, ...actionColumn],
    state: { sorting, columnSizing, expanded, rowSelection, columnVisibility },
    onExpandedChange: setExpanded,
    onColumnSizingChange: setColumnSizing,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
  // We pre-paginate data ourselves (product-level). Disable internal page index auto resets to avoid React 19 pre-mount warning.
  autoResetPageIndex: false,
  // Provide a no-op pagination change handler (table may try to emit one during initial hydration).
  onPaginationChange: () => { /* ignored: pagination handled externally */ },
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
  getSortedRowModel: getSortedRowModel(),
  getExpandedRowModel: getExpandedRowModel(),
    enableRowSelection: true,
  });

  // Number of products displayed on current page (top-level only)
  const visibleProductCount = pageProducts.length;
  // Counts for filtered (pre-pagination) dataset
  const filteredProductCount = tableData.length;
  // (Removed variant count display per request)

  // Auto-scroll: ensure newly revealed variant rows of the last expanded product are visible.
  useEffect(() => {
    const container = tableScrollRef.current; if (!container) return;
    const expandedState: any = table.getState().expanded;
    const expandedProductIds = Object.keys(expandedState).filter(id => expandedState[id] && id.startsWith('product-'));
    if (expandedProductIds.length === 0) return;
    const lastExpandedProductId = expandedProductIds[expandedProductIds.length - 1];
    // Defer to next frame so sub rows are in the DOM
    const raf = requestAnimationFrame(() => {
      // Try to find the deepest last variant row for that product; fallback to parent row
      const allRows = Array.from(container.querySelectorAll('[data-rowid]')) as HTMLElement[];
      const parentIndex = allRows.findIndex(r => r.dataset.rowid === lastExpandedProductId);
      if (parentIndex === -1) return;
      // Collect subsequent variant rows that belong to this parent (their id starts with variant- and stop when next product row encountered)
      const variantRows: HTMLElement[] = [];
      for (let i = parentIndex + 1; i < allRows.length; i++) {
        const r = allRows[i];
        const id = r.dataset.rowid || '';
        if (id.startsWith('product-')) break; // next product reached, stop
        if (id.startsWith('variant-')) variantRows.push(r);
      }
      const targetEl = variantRows.length > 0 ? variantRows[variantRows.length - 1] : allRows[parentIndex];
      if (!targetEl) return;
      const targetBottom = targetEl.getBoundingClientRect().bottom;
      const containerBottom = container.getBoundingClientRect().bottom;
      if (targetBottom > containerBottom - 12) {
        // Scroll just enough so the target is near the bottom with a little padding
        const delta = targetBottom - containerBottom + 48; // 48px padding
        container.scrollBy({ top: delta, behavior: 'smooth' });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [table.getState().expanded, table]);

  // Stretch last resizable column after render when there's extra horizontal space
  useLayoutEffect(() => {
    const el = tableScrollRef.current; if (!el) return;
    const doStretch = () => {
      const container = el.clientWidth; const total = table.getTotalSize();
      if (container - total > 6) {
        const resizable = [...table.getAllLeafColumns()].reverse().find(c => c.getCanResize());
        if (resizable) {
          const extra = container - total;
          table.setColumnSizing(prev => ({ ...prev, [resizable.id]: (prev[resizable.id] || resizable.getSize()) + extra }));
        }
      }
    };
    doStretch();
    window.addEventListener('resize', doStretch);
    return () => window.removeEventListener('resize', doStretch);
  }, [table, columnSizing]);

  // Auto-size Tags column to longest visible pill (up to a max) while allowing manual resizing afterwards
  useLayoutEffect(() => {
    const tagsCol = table.getAllLeafColumns().find(c => c.id === 'tags');
    if (!tagsCol) return;
    // Don't override if user already resized (explicit size stored)
    if (columnSizing['tags']) return;
    const container = tableScrollRef.current; if (!container) return;
    const pills = Array.from(container.querySelectorAll('td[data-col="tags"] .badge')) as HTMLElement[];
    if (pills.length === 0) return;
    const longest = Math.min(260, Math.max(...pills.map(p => p.getBoundingClientRect().width)) + 32); // padding + resizer allowance
    if (longest > 0) {
      table.setColumnSizing(prev => ({ ...prev, tags: Math.max(90, longest) }));
    }
  }, [tableData, columnSizing, table]);
  const totalBaseCount = useMemo(() => {
    if (storeFilter === 'all') return allProducts.length;
    return allProducts.filter(p => p.__storeHost === storeFilter).length;
  }, [allProducts, storeFilter]);
  const activeFilterChips = useMemo(() => {
    // Helper counters (counts operate on allProducts, optionally scoped by other higher-order filters when intuitive):
    const storeCount = (host: string) => allProducts.filter(p => p.__storeHost === host).length;
    const vendorCount = (vendor: string) => allProducts.filter(p => (storeFilter==='all' || p.__storeHost===storeFilter) && ((p.vendor ?? '').trim() || EMPTY) === vendor).length;
    const typeCount = (ptype: string) => allProducts.filter(p => (storeFilter==='all' || p.__storeHost===storeFilter) && ((p.product_type ?? '').trim() || EMPTY) === ptype).length;
    const collectionCount = (handle: string) => {
      if (handle === 'all') return 0;
      if (overrideProducts && collectionFilter === handle) return overrideProducts.length; // when loaded
      // Fallback: unknown until loaded
      return 0;
    };
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (storeFilter !== 'all') chips.push({ key: 'store', label: `Store: ${storeFilter} (${storeCount(storeFilter)})`, onClear: () => setStoreFilter('all') });
    if (collectionFilter !== 'all') chips.push({ key: 'collection', label: `Collection: ${collectionFilter} (${collectionCount(collectionFilter)})`, onClear: () => setCollectionFilter('all') });
    if (vendorFilter !== 'all') chips.push({ key: 'vendor', label: `Vendor: ${vendorFilter === EMPTY ? 'No Vendor' : vendorFilter} (${vendorCount(vendorFilter)})`, onClear: () => setVendorFilter('all') });
    if (typeFilter !== 'all') chips.push({ key: 'type', label: `Type: ${typeFilter === EMPTY ? 'No Product Type' : typeFilter} (${typeCount(typeFilter)})`, onClear: () => setTypeFilter('all') });
    if (globalFilter) chips.push({ key: 'q', label: `Search: ${globalFilter} (${tableData.length})`, onClear: () => setGlobalFilter('') });
    return chips;
  }, [storeFilter, collectionFilter, vendorFilter, typeFilter, globalFilter, allProducts, overrideProducts, tableData.length]);

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
  // All top-level filtered products, not just current page
  const allTopLevelFiltered = useMemo(()=> tableData.filter(p => !isVariant(p)), [tableData]);
  const allListedCount = allTopLevelFiltered.length;
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
      <TableRow key={row.id} data-rowid={row.id} data-state={row.getIsSelected() && 'selected'} className="dark:bg-background">
        {row.getVisibleCells().map(cell => (
          <TableCell key={cell.id} className={cn('p-4 align-middle',
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
    <div className="w-full mx-auto px-0 space-y-3 md:space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Console</h2>
        <div className="flex items-center gap-3 md:gap-4">
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
        {/* Desktop active filter pills */}
        {activeFilterChips.length > 0 && (
          <div className="hidden md:flex items-center gap-2 flex-wrap -mt-2 mb-1">
            {activeFilterChips.map(chip => (
              <Badge key={chip.key} variant="secondary" className="flex items-center gap-2 pr-1">
                {chip.label}
                <button className="text-xs rounded-sm hover:bg-muted px-1" onClick={chip.onClear} aria-label={`Clear ${chip.key}`}>×</button>
              </Badge>
            ))}
            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { setStoreFilter('all'); setVendorFilter('all'); setTypeFilter('all'); setCollectionFilter('all'); setGlobalFilter(''); setExpanded({}); }}>Clear All</Button>
          </div>
        )}

  {/* Full-bleed table area */}
  <div className="full-bleed">
  <Card className="py-0 rounded-none border-0 shadow-none bg-transparent">
        <CardContent className="p-0">
          <div className="px-4 md:px-8">
          <div className="rounded-lg border bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
          {/* Toolbar inside the bordered & rounded wrapper */}
          <div className="w-full px-4 py-3 flex flex-wrap items-center gap-3 text-sm">
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
              // Select all filtered top-level products (tableData) regardless of pagination
              const topLevel = table.getCoreRowModel().rows.filter(r => !isVariant(r.original));
              topLevel.forEach(r => { map[r.id] = true; });
              setRowSelection(map);
            }}>Select All Products</Button>
            {table.getState().sorting.length > 0 && (
              <Button variant="link" onClick={() => table.resetSorting()}>Reset Sort</Button>
            )}
            <div className="ml-auto flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground font-medium" title={`Filtered products: ${filteredProductCount}`}> 
                <span><span className="text-foreground font-semibold tabular-nums">{filteredProductCount}</span> of Total <span className="text-foreground font-semibold tabular-nums">{allProducts.length}</span> Products</span>
              </div>
            </div>

            {/* List Selection Dialog */}
            <Dialog open={listDialogOpen} onOpenChange={setListDialogOpen}>
              <DialogContent className="max-w-lg">
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
          {/* Scroll area */}
          <div className="overflow-auto" ref={tableScrollRef}>
            {/* Removed table-fixed to allow dynamic inline widths from column sizing */}
            <Table className="w-full" style={{ width: table.getTotalSize() }}>
              <TableHeader>
                {table.getHeaderGroups().map(hg => (
                  <TableRow key={hg.id} className="bg-gray-200 dark:bg-gray-800/70 hover:bg-gray-200 dark:hover:bg-gray-800">
                    {hg.headers.map(h => {
                      const size = h.getSize();
                      return (
                        <TableHead
                          key={h.id}
                          style={{ width: size, minWidth: size, maxWidth: size }}
                          className={cn('relative px-4 border-r last:border-r-0 first:rounded-tl-lg last:rounded-tr-lg border-l [&:first-child]:border-l-0',
                            h.column.id === 'view' && 'sticky right-0 bg-gray-200 dark:bg-gray-800 z-10',
                            h.column.id === 'select' && 'sticky left-0 bg-gray-200 dark:bg-gray-800 z-10'
                          )}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {h.column.getCanResize() ? (
                            <div
                              onMouseDown={h.getResizeHandler()}
                              onTouchStart={h.getResizeHandler()}
                              className={cn('resizer', h.column.getIsResizing() && 'isResizing')}
                            />
                          ) : h.column.id === 'body_html' ? (
                            <div
                              aria-hidden
                              className="resizer pointer-events-none cursor-default opacity-70 bg-gray-300 dark:bg-gray-600"
                              style={{ cursor: 'default' }}
                            />
                          ) : null}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={table.getAllColumns().length} className="p-6 text-sm text-muted-foreground">
                      Loading products…
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <TableRow key={row.id} data-rowid={row.id} data-state={row.getIsSelected() && 'selected'} className="dark:bg-background border-b last:border-b-0">
                      {row.getVisibleCells().map(cell => {
                        const cSize = cell.column.getSize();
                        return (
                          <TableCell
                            key={cell.id}
                            style={{ width: cSize, minWidth: cSize, maxWidth: cSize }}
                            data-col={cell.column.id}
                            className={cn('p-4 align-middle border-r last:border-r-0 border-l [&:first-child]:border-l-0',
                              cell.column.id === 'view' && 'sticky right-0 bg-background z-10',
                              cell.column.id === 'select' && 'sticky left-0 bg-background z-10'
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
    </div>{/* end bordered wrapper */}
    </div>
        </CardContent>
      </Card>
      </div>

      <div className="flex items-center justify-between gap-4 py-4 w-full">
        <div className="flex-1" />
        <div className="flex flex-shrink-0 justify-center items-center gap-2">
          <Button variant="outline" size="icon" aria-label="First page" onClick={() => setProductPageIndex(0)} disabled={productPageIndex === 0}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Previous page" onClick={() => setProductPageIndex(i => Math.max(0, i - 1))} disabled={productPageIndex === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-2 text-sm text-muted-foreground whitespace-nowrap select-none">
            Page <span className="font-medium">{productPageIndex + 1}</span> / {pageCount}
          </div>
          <Button variant="outline" size="icon" aria-label="Next page" onClick={() => setProductPageIndex(i => Math.min(pageCount - 1, i + 1))} disabled={productPageIndex >= pageCount - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
            <Button variant="outline" size="icon" aria-label="Last page" onClick={() => setProductPageIndex(pageCount - 1)} disabled={productPageIndex >= pageCount - 1}>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-1 justify-end items-center gap-2">
          <span className="text-sm text-muted-foreground">Show</span>
          <Select value={`${productPageSize}`} onValueChange={value => { setProductPageSize(Number(value)); setProductPageIndex(0); }}>
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
