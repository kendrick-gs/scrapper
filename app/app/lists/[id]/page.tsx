'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TagsInput from '@/components/TagsInput';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { ArrowUpRight, Eye, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import ComboInput from '@/components/ComboInput';
import CodeEditor from '@/components/CodeEditor';
import BodyHtmlEditor from '@/components/BodyHtmlEditor';
import TagsModalEditor from '@/components/TagsModalEditor';

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
  const [savedColumnSizing, setSavedColumnSizing] = useState<ColumnSizingState | null>(null);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [edits, setEdits] = useState<Record<string, any>>({});
  const [presets, setPresets] = useState<{ vendors: string[]; productTypes: string[]; tags: string[] }>({ vendors: [], productTypes: [], tags: [] });
  const [bulkVendor, setBulkVendor] = useState('');
  const [bulkType, setBulkType] = useState('');
  const [bulkStatus, setBulkStatus] = useState<'draft'|'active'|''>('');

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

  const addPresetValue = useCallback(async (kind: 'vendors'|'productTypes'|'tags', val: string) => {
    const v = (val || '').trim();
    if (!v) return;
    const existing = (presets as any)[kind] as string[];
    if (existing.includes(v)) return;
    setPresets((p) => ({ ...p, [kind]: [...existing, v].sort() }));
    try {
      await fetch('/api/presets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [kind]: [v] }) });
    } catch {}
  }, [presets]);

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
    const mapped = base.map((col: any) => {
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
            const current = (row.original.vendor ?? '').trim();
            return (
              <ComboInput
                label="Vendor"
                value={current}
                presets={presets.vendors}
                placeholder="Select or add vendor"
                onChange={(val) => {
                  saveEdit(row.original.id, { vendor: val }, row.original);
                  if (val) addPresetValue('vendors', val);
                }}
              />
            );
          }
        } as any;
      }
      if (editMode && col.accessorKey === 'product_type') {
        return {
          ...col,
          cell: ({ row }: any) => {
            if (isVariant(row.original)) return <span className="text-muted-foreground" />;
            const current = (row.original.product_type ?? '').trim();
            return (
              <ComboInput
                label="Product Type"
                value={current}
                presets={presets.productTypes}
                placeholder="Select or add product type"
                onChange={(val) => {
                  saveEdit(row.original.id, { product_type: val }, row.original);
                  if (val) addPresetValue('productTypes', val);
                }}
              />
            );
          }
        } as any;
      }
      if (editMode && col.accessorKey === 'images') {
        return {
          ...col,
          cell: ({ row }: any) => {
            if (isVariant(row.original)) return <span />;
            const images = (row.original.images || []) as any[];
            const addImage = async (url: string) => {
              const src = (url || '').trim();
              if (!src) return;
              const next = [...images, { id: Date.now(), product_id: row.original.id, src, alt: '' }];
              saveEdit(row.original.id, { images: next }, row.original);
            };
            const removeImage = (id: number) => {
              const next = images.filter((img: any) => img.id !== id);
              saveEdit(row.original.id, { images: next }, row.original);
            };
            return (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 items-center">
                  {images.map((img: any) => (
                    <div key={img.id} className="relative h-12 w-12">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.src} alt={img.alt || 'Image'} className="h-12 w-12 rounded object-cover border" />
                      <Dialog>
                        <DialogTrigger asChild>
                          <button
                            className="absolute left-0 bottom-0 h-5 w-5 rounded bg-white/90 border flex items-center justify-center text-[10px]"
                            title="Preview"
                            aria-label="Preview image"
                          >
                            👁
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader><DialogTitle>Image Preview</DialogTitle></DialogHeader>
                          <div className="relative h-96">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.src} alt={img.alt || 'Image'} className="h-full w-full object-contain" />
                          </div>
                        </DialogContent>
                      </Dialog>
                      <button
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-background border text-xs"
                        aria-label="Remove image"
                        onClick={() => removeImage(img.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    className="h-8 flex-1"
                    placeholder="Paste image URL and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addImage((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                </div>
              </div>
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
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">$</span>
                <Input
                  className="h-8"
                  type="number"
                  value={price}
                  onChange={(e) => saveEdit(row.original.id, { variants: [{ ...(row.original.variants?.[0] || {}), price: e.target.value }] }, row.original)}
                />
              </div>
            );
          }
        } as any;
      }
      if (editMode && col.accessorKey === 'tags') {
        return {
          ...col,
          cell: ({ row }: any) => {
            if (isVariant(row.original)) return <span />;
            const current: string[] = Array.isArray(row.original.tags)
              ? (row.original.tags as string[])
              : (typeof row.original.tags === 'string'
                ? row.original.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
                : []);
            return (
              <TagsInput
                value={current}
                presets={presets.tags}
                mode="simple"
                onChange={(next) => saveEdit(row.original.id, { tags: next }, row.original)}
              />
            );
          }
        } as any;
      }
      if (col.accessorKey === 'body_html') {
        return {
          ...col,
          cell: ({ row }: any) => {
            if (isVariant(row.original)) return <span />;
            const body = row.original.body_html || '';
            if (!editMode) return (
              <Dialog>
                <DialogTrigger asChild><Button variant="outline" size="sm">View</Button></DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader><DialogTitle>{row.original.title}</DialogTitle></DialogHeader>
                  <div className="prose dark:prose-invert max-h-[70vh] overflow-y-auto" dangerouslySetInnerHTML={{ __html: body }} />
                </DialogContent>
              </Dialog>
            );
            return (
              <BodyHtmlEditor
                value={body}
                onSave={async (next) => saveEdit(row.original.id, { body_html: next }, row.original)}
              />
            );
          }
        } as any;
      }
      if (col.accessorKey === 'tags') {
        return {
          ...col,
          cell: ({ row }: any) => {
            if (isVariant(row.original)) return <span />;
            const current: string[] = Array.isArray(row.original.tags)
              ? (row.original.tags as string[])
              : (typeof row.original.tags === 'string'
                ? row.original.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
                : []);
            if (!editMode) {
              return <div className="flex flex-wrap gap-1 max-h-20 overflow-auto">{current.slice(0,8).map(t => <Badge key={t} variant="secondary" className="text-[10px] px-1 py-0.5">{t}</Badge>)}{current.length>8 && <span className="text-xs text-muted-foreground">+{current.length-8}</span>}</div>;
            }
            return (
              <div className="flex items-center gap-2">
                <TagsInput
                  value={current}
                  presets={presets.tags}
                  mode="chips"
                  onChange={(next) => saveEdit(row.original.id, { tags: next }, row.original)}
                />
                <TagsModalEditor
                  value={current}
                  presets={presets.tags}
                  onSave={(next) => saveEdit(row.original.id, { tags: next }, row.original)}
                />
              </div>
            );
          }
        } as any;
      }
      return col;
    });
    // Append additional columns always; edit when editMode else read-only
    mapped.push(
      {
        accessorKey: 'seo_title',
        header: () => <span className="text-gray-900">SEO Title</span>,
        size: 220,
        cell: ({ row }: any) => {
          if (isVariant(row.original)) return <span />;
          const val = (row.original as any).seo_title || '';
          const count = val.length;
          if (!editMode) return <span className="line-clamp-2" title={val}>{val}</span>;
          return (
            <div className="relative">
              <Input
                className="h-8 pr-12"
                maxLength={70}
                value={val}
                onChange={(e) => saveEdit(row.original.id, { seo_title: e.target.value }, row.original)}
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{count}/70</span>
            </div>
          );
        }
      } as any,
      {
        accessorKey: 'seo_description',
        header: () => <span className="text-gray-900">SEO Description</span>,
        size: 300,
        cell: ({ row }: any) => {
          if (isVariant(row.original)) return <span />;
          const val = (row.original as any).seo_description || '';
          const count = val.length;
          if (!editMode) return <span className="line-clamp-2" title={val}>{val}</span>;
          return (
            <div className="relative">
              <textarea
                className="h-24 w-full border rounded-md px-2 py-1 text-sm pr-12"
                maxLength={160}
                value={val}
                onChange={(e) => saveEdit(row.original.id, { seo_description: e.target.value }, row.original)}
              />
              <span className="pointer-events-none absolute right-2 top-2 text-xs text-muted-foreground">{count}/160</span>
            </div>
          );
        }
      } as any,
      {
        id: 'compare_at_price',
        header: () => <span className="text-gray-900">Compare At Price</span>,
        size: 140,
        cell: ({ row }: any) => {
          if (isVariant(row.original)) return <span />;
          const v0 = row.original.variants?.[0] || {};
          if (!editMode) return v0.compare_at_price ? <span>${v0.compare_at_price}</span> : <span />;
          return (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">$</span>
              <Input
                className="h-8"
                type="number"
                value={v0.compare_at_price || ''}
                onChange={(e) => saveEdit(row.original.id, { variants: [{ ...v0, compare_at_price: e.target.value }] }, row.original)}
              />
            </div>
          );
        }
      } as any,
      {
        id: 'cost',
        header: () => <span className="text-gray-900">Cost per item</span>,
        size: 140,
        cell: ({ row }: any) => {
          if (isVariant(row.original)) return <span />;
          const v0 = row.original.variants?.[0] || {};
          if (!editMode) return v0.cost ? <span>${v0.cost}</span> : <span />;
          return (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">$</span>
              <Input
                className="h-8"
                type="number"
                value={v0.cost || ''}
                onChange={(e) => saveEdit(row.original.id, { variants: [{ ...v0, cost: e.target.value }] }, row.original)}
              />
            </div>
          );
        }
      } as any,
      {
        accessorKey: 'status',
        header: () => <span className="text-gray-900">Status</span>,
        size: 120,
        cell: ({ row }: any) => {
          if (isVariant(row.original)) return <span />;
          const current = (row.original.status || 'draft') as 'active'|'draft'|'archived';
          if (!editMode) return <span className="capitalize">{current}</span>;
          return (
            <Select
              value={current}
              onValueChange={(value) => saveEdit(row.original.id, { status: value }, row.original)}
            >
              <SelectTrigger className="h-8 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
              </SelectContent>
            </Select>
          );
        }
      } as any,
    );
    return mapped;
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

  const applyBulk = useCallback(async () => {
    const rows = table.getSelectedRowModel().rows;
    const updates: { key: string; data: any }[] = [];
    for (const r of rows) {
      const base: any = isVariant(r.original) ? (r.getParentRow()?.original) : r.original;
      const host = base?.__storeHost || (base?.__storeUrl ? (() => { try { return new URL(base.__storeUrl).hostname; } catch { return base.__storeUrl; } })() : '');
      const key = `${host || ''}:${base.handle}`;
      const data: any = {};
      if (bulkVendor.trim()) data.vendor = bulkVendor.trim();
      if (bulkType.trim()) data.product_type = bulkType.trim();
      if (bulkStatus) data.status = bulkStatus;
      if (Object.keys(data).length > 0) updates.push({ key, data });
    }
    if (updates.length === 0) return;
    if (!confirm(`Apply updates to ${rows.length} product(s)?`)) return;
    const res = await fetch(`/api/lists/${listId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates }) });
    const data = await res.json();
    if (res.ok) {
      setAllProducts((data.list?.items || []).map((p: any) => ({ ...p })));
      setRowSelection({});
      setBulkVendor(''); setBulkType(''); setBulkStatus('');
      // add any new presets
      if (bulkVendor.trim()) addPresetValue('vendors', bulkVendor.trim());
      if (bulkType.trim()) addPresetValue('productTypes', bulkType.trim());
    } else {
      alert(data.error || 'Failed to apply bulk updates');
    }
  }, [table, bulkVendor, bulkType, bulkStatus, listId, addPresetValue]);

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
          <Button variant={editMode ? 'outline' : 'default'} onClick={() => {
            setEditMode(v => {
              if (!v) { // entering edit mode
                setSavedColumnSizing(columnSizing); // keep current
                // auto expand based on content length heuristics
                const next: ColumnSizingState = { ...columnSizing };
                const sample = tableData.slice(0, 200);
                function calc(key: string, base: number, max: number) {
                  let longest = 0;
                  for (const p of sample) {
                    const val = (p[key] || '').toString();
                    if (val.length > longest) longest = val.length;
                  }
                  const px = Math.min(max, Math.max(base, longest * 8 + 40));
                  next[key] = px;
                }
                // Body column intentionally excluded (only button) so it doesn't widen.
                ['handle','title','vendor','product_type','seo_title','seo_description'].forEach(k => calc(k, 160, 600));
                // Tags: compute width based on joined tags per product
                let tagsLongest = 0;
                for (const p of sample) {
                  let tagStr = '';
                  if (Array.isArray(p.tags)) tagStr = p.tags.join(', ');
                  else if (typeof p.tags === 'string') tagStr = p.tags;
                  if (tagStr.length > tagsLongest) tagsLongest = tagStr.length;
                }
                if (tagsLongest) {
                  next['tags'] = Math.min(500, Math.max(180, tagsLongest * 7 + 40));
                }
                setColumnSizing(next);
              } else {
                // leaving edit mode restore
                if (savedColumnSizing) setColumnSizing(savedColumnSizing);
              }
              return !v;
            });
          }}>{editMode ? 'Preview Mode' : 'Edit Mode'}</Button>
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

          {/* Bulk Edit toolbar */}
          {selectedCount > 1 && (
            <div className="w-full px-3 py-3 bg-amber-50 border-t border-b border-amber-200 flex flex-wrap items-center gap-3 sticky top-0 z-30 dark:[color-scheme:light] [&_.bulk-light]:text-slate-900">
              <div className="text-sm font-medium text-slate-900">Bulk Edit {selectedCount} selected</div>
              <div className="w-[200px] bulk-light">
                <ComboInput label="Vendor" value={bulkVendor} presets={presets.vendors} placeholder="Vendor" onChange={setBulkVendor} />
              </div>
              <div className="w-[220px] bulk-light">
                <ComboInput label="Product Type" value={bulkType} presets={presets.productTypes} placeholder="Product Type" onChange={setBulkType} />
              </div>
              <div className="w-[160px] bulk-light">
                <Select value={bulkStatus || 'draft'} onValueChange={(v) => setBulkStatus(v as any)}>
                  <SelectTrigger className="h-8 w-full bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" className="bg-black text-white hover:bg-black/90" onClick={applyBulk}>Apply</Button>
            </div>
          )}

          {/* Table */}
          <div className={cn("overflow-auto", editMode && 'edit-mode-table')}>
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
                  <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'} className={cn('dark:bg-background', editMode && 'edit-row')}> 
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
