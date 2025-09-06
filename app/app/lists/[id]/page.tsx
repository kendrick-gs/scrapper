"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useConfirm } from '@/components/confirm-provider';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { cn } from '@/lib/utils';
import { columns as baseColumns, ProductRowData, isVariant } from '@/components/pages/columns';
import { ArrowUpRight, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, GripVertical } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useReactTable, getCoreRowModel, getExpandedRowModel, getSortedRowModel, flexRender, SortingState, ColumnSizingState, ExpandedState } from '@tanstack/react-table';

interface ListItemProduct { id?: string|number; handle: string; title: string; vendor?: string; product_type?: string; variants?: any[]; body_html?: string; seo_title?: string; seo_description?: string; [k:string]: any }
interface UserListResponse { id: string; name: string; createdAt: string; items: ListItemProduct[] }

const EMPTY='__empty__';

export default function ListDetailPage(){
  const confirmModal = useConfirm();
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string)||'';
  const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const [list,setList]=useState<UserListResponse|null>(null);
  const [editMode,setEditMode]=useState(false); const [pending,setPending]=useState(false);
  const [bodyEditorOpen,setBodyEditorOpen]=useState(false); const [bodyDraft,setBodyDraft]=useState(''); const [currentBodyHandle,setCurrentBodyHandle]=useState('');
  const [localItems,setLocalItems]=useState<ListItemProduct[]>([]);
  const dirtyMap = useMemo(()=>new Map<string,string>(),[]);
  const [showOptions,setShowOptions]=useState(false);
  const tableScrollRef = useRef<HTMLDivElement|null>(null);

  // Filters (multi-select like Console page)
  const [storeFilters,setStoreFilters]=useState<string[]>([]);
  const [vendorFilters,setVendorFilters]=useState<string[]>([]);
  const [typeFilters,setTypeFilters]=useState<string[]>([]);
  const [globalFilter,setGlobalFilter]=useState('');

  // TanStack table state
  const [sorting,setSorting]=useState<SortingState>([]);
  const [columnSizing,setColumnSizing]=useState<ColumnSizingState>({});
  const [expanded,setExpanded]=useState<ExpandedState>({});
  const [rowSelection,setRowSelection]=useState({});
  const [columnVisibility,setColumnVisibility]=useState<any>({ option:false });
  const [columnOrder,setColumnOrder]=useState<string[]>([]);
  const COLUMN_ORDER_KEY = 'list_column_order_v1';
  const COLUMN_SIZING_KEY = 'list_column_sizing_v1';
  const { user } = useAuthStore();
  const saveServerColumnOrder = async (order:string[])=>{ try { if(!user) return; await fetch('/api/user/prefs', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ columnOrder: order }) }); } catch {/* ignore */} };
  const saveServerColumnSizing = async (sizes:Record<string,number>)=>{ try { if(!user) return; await fetch('/api/user/prefs', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ listColumnSizing: sizes }) }); } catch {/* ignore */} };

  const load=async()=>{ if(!id) return; setLoading(true); setError(''); try{ const r=await fetch(`/api/lists/${id}`); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Failed to load list'); if(!d.list){ setError('List not found'); setList(null);} else { setList(d.list); setLocalItems(d.list.items||[]);} } catch(e:any){ setError(e.message||'Failed to load'); } finally{ setLoading(false);} };
  useEffect(()=>{ load(); },[id]);

  // Filtered dataset (product-level only)
  const allProducts = useMemo(()=> localItems, [localItems]);
  const filteredProducts = useMemo(()=>{
    let items=[...allProducts];
    if(storeFilters.length) items=items.filter(p=> storeFilters.includes((p.__storeHost||'')));
    if(vendorFilters.length) items=items.filter(p=> vendorFilters.includes(((p.vendor??'').trim()||EMPTY)));
    if(typeFilters.length) items=items.filter(p=> typeFilters.includes(((p.product_type??'').trim()||EMPTY)));
    if(globalFilter){ const f=globalFilter.toLowerCase(); items=items.filter(p=> p.title?.toLowerCase().includes(f)||p.handle?.toLowerCase().includes(f)|| (p.vendor??'').toLowerCase().includes(f)|| (p.product_type??'').toLowerCase().includes(f) || p.variants?.some((v:any)=> v.title?.toLowerCase().includes(f) || (v.sku&&v.sku.toLowerCase().includes(f)))); }
    return items;
  },[allProducts,storeFilters,vendorFilters,typeFilters,globalFilter]);

  // Pagination (product-level)
  const [pageSize,setPageSize]=useState(25); const [pageIndex,setPageIndex]=useState(0);
  useEffect(()=>{ const pageCount=Math.max(1,Math.ceil(filteredProducts.length/pageSize)); setPageIndex(i=> Math.min(i,pageCount-1)); },[filteredProducts.length,pageSize]);
  const pageProducts = useMemo(()=>{ const start=pageIndex*pageSize; return filteredProducts.slice(start,start+pageSize); },[filteredProducts,pageIndex,pageSize]);

  // Column building (extend base columns + extra editable columns)
  const extendedColumns = useMemo(()=>{
    // start from base (option visibility handled by showOptions)
    const source = baseColumns as any[];
    const cols = source.map(col=>{
      // Override handle column to inject show/hide options controls
      if(col.accessorKey==='handle'){
        return { ...col, header:(ctx:any)=>{ const Original=(col as any).header; return (<div className="flex items-center gap-1 w-full pr-1"> <div className="flex-1">{typeof Original==='function'?Original(ctx):Original}</div>{!showOptions && (<button type="button" onClick={(e)=>{e.stopPropagation(); setShowOptions(true);} } className="flex-none text-[10px] font-semibold text-muted-foreground hover:text-foreground px-1.5 py-1 rounded border border-border/50 hover:border-border transition-colors bg-background">{'>>'}</button> )}</div>); }, cell: ({row}:any)=>{ const isParent=row.getCanExpand(); const product=isVariant(row.original)? (row.getParentRow()?.original): row.original; const handle=isVariant(row.original)?'':product?.handle; return (<div style={{paddingLeft:`${row.depth*1.5}rem`}} className="flex items-center gap-1">{isParent? <button onClick={row.getToggleExpandedHandler()} className="mr-1 cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground">{row.getIsExpanded()? '▼':'►'}</button>: <span className="mr-1 w-4 inline-block" /> }<span className="line-clamp-2 font-medium">{handle}</span></div>); } };
      }
      // Collapse option column
      if(col.id==='option'){
        return { ...col, header:(ctx:any)=>{ const Original=(col as any).header; return (<div className="flex items-center gap-1 w-full pr-1"><button type="button" onClick={(e)=>{e.stopPropagation(); setShowOptions(false);} } className="flex-none text-[10px] font-semibold text-muted-foreground hover:text-foreground px-1.5 py-1 rounded border border-border/50 hover:border-border transition-colors bg-background">{'<<'}</button><div className="flex-1">{typeof Original==='function'?Original(ctx):Original}</div></div>); } };
      }
      // Replace existing body_html column so we don't add an extra custom one later.
      if(col.accessorKey==='body_html'){
        return {
          ...col,
          header: 'Body HTML',
          cell: ({row}: any) => {
            if(isVariant(row.original)) return null;
            const val = (row.original as any).body_html;
            if(!val) return <span className="text-muted-foreground">—</span>;
            return <Button size="sm" variant="outline" onClick={()=>openBodyEditor(row.original)}>{editMode? 'Edit':'View'}</Button>;
          }
        };
      }
      return col;
    });
    // Additional columns (after price / before body_html)
    const insertAfterId='price';
    const idx = cols.findIndex(c=> c.id==='price' || c.accessorKey==='price');
    const extra=[
      { id:'compare_at_price', header: 'Compare At', size:150, cell: ({row}:any)=>{ if(isVariant(row.original)) return null; const v=row.original.variants?.[0]; const val=v?.compare_at_price||''; return editMode? <Input defaultValue={val} onChange={e=>applyLocalChange(row.original.handle,{ compare_at_price:e.target.value })} className="h-8" /> : (val|| <span className="text-muted-foreground">—</span>); } },
      { id:'cost_per_item', header: 'Cost', size:120, cell: ({row}:any)=>{ if(isVariant(row.original)) return null; const v=row.original.variants?.[0]; const val=v?.cost_per_item||''; return editMode? <Input defaultValue={val} onChange={e=>applyLocalChange(row.original.handle,{ cost_per_item:e.target.value })} className="h-8" /> : (val|| <span className="text-muted-foreground">—</span>); } },
      { id:'seo_title', header: 'SEO Title', size:220, cell: ({row}:any)=>{ if(isVariant(row.original)) return null; const val=row.original.seo_title||''; return editMode? <Input defaultValue={val} maxLength={70} onChange={e=>applyLocalChange(row.original.handle,{ seo_title:e.target.value.slice(0,70) })} className="h-8" /> : (val|| <span className="text-muted-foreground">—</span>); } },
      { id:'seo_description', header: 'SEO Description', size:300, cell: ({row}:any)=>{ if(isVariant(row.original)) return null; const val=row.original.seo_description||''; return editMode? <Textarea defaultValue={val} rows={2} maxLength={160} onChange={(e:React.ChangeEvent<HTMLTextAreaElement>)=>applyLocalChange(row.original.handle,{ seo_description:e.target.value.slice(0,160) })} className="text-xs" /> : (<div className="line-clamp-2 min-h-[1.25rem]">{val || <span className="text-muted-foreground">—</span>}</div>); } }
    ];
    if(idx>=0){ cols.splice(idx+1,0,...extra); } else { cols.push(...extra); }
    // Add select column at start
    const selectCol:any = {
      id:'select', enableResizing:false, size:40, minSize:40, maxSize:40,
      header:({table}:any)=>(<input type="checkbox" checked={table.getIsAllPageRowsSelected()} onChange={table.getToggleAllPageRowsSelectedHandler()} aria-label="Select All" />),
      cell:({row}:any)=>(<input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} aria-label="Select Row" />)
    };
    // Preview column at end (store product link)
    const previewCol:any = {
      id:'view', enableResizing:false, size:70, minSize:70, maxSize:70,
      header:()=>(<div className="text-right"><ArrowUpRight className="h-4 w-4 inline" /></div>),
      cell:({row}:any)=>{ const product = isVariant(row.original)? (row.getParentRow()?.original): row.original; const url = `${(product.__storeUrl||'').replace(/\/$/,'')}/products/${product.handle}`; return (<div className="flex justify-end"><a href={url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground"><ArrowUpRight className="h-4 w-4"/></a></div>); }
    };
    return [selectCol, ...cols, previewCol];
  },[baseColumns,editMode,showOptions]);

  // Sync options visibility
  useEffect(()=>{ setColumnVisibility((prev:any)=>({...prev, option:showOptions})); },[showOptions]);

  const applyLocalChange=(handle:string, patch:Partial<ListItemProduct>)=>{ setLocalItems(items=> items.map(i=> i.handle===handle? {...i,...patch}:i)); dirtyMap.set(handle, JSON.stringify({ ...(dirtyMap.get(handle)? JSON.parse(dirtyMap.get(handle) as string):{}), ...patch })); };
  const openBodyEditor=(p:ListItemProduct)=>{ setCurrentBodyHandle(p.handle); setBodyDraft(p.body_html||''); setBodyEditorOpen(true); };
  const applyBodyHtml=()=>{ applyLocalChange(currentBodyHandle,{ body_html: bodyDraft }); setBodyEditorOpen(false); };
  const saveEdits=async()=>{ if(!list || dirtyMap.size===0) return; setPending(true); try{ const updates:any[]=[]; for(const [h,p] of dirtyMap.entries()){ updates.push({ handle:h, data: JSON.parse(p) }); } const r=await fetch(`/api/lists/${list.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ updates })}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Save failed'); setList(d.list); setLocalItems(d.list.items||[]); dirtyMap.clear(); setEditMode(false);} catch(e:any){ alert(e.message||'Save failed'); } finally{ setPending(false);} };

  // Build table
  // Initialize column order from localStorage or current columns
  useEffect(()=>{
    if(!extendedColumns) return;
    const allIds = (extendedColumns as any[]).map(c=> c.id || c.accessorKey).filter(Boolean);
    if(columnOrder.length===0){
      try { const saved = JSON.parse(localStorage.getItem(COLUMN_ORDER_KEY)||'[]'); if(Array.isArray(saved) && saved.length){
        const merged = [...saved.filter((id:string)=> allIds.includes(id)), ...allIds.filter(id=> !saved.includes(id))];
        setColumnOrder(merged);
        return;
      }} catch { /* ignore */ }
      setColumnOrder(allIds);
      return;
    }
    // Ensure any new columns appended
    const next = [...columnOrder.filter(id=> allIds.includes(id)), ...allIds.filter(id=> !columnOrder.includes(id))];
    if(next.length!==columnOrder.length) setColumnOrder(next);
  },[extendedColumns]);

  useEffect(()=>{ if(columnOrder){ localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(columnOrder)); saveServerColumnOrder(columnOrder);} },[columnOrder]);
  // Load sizing from server/localStorage once
  useEffect(()=>{
    (async()=>{
      try {
        const ls = localStorage.getItem(COLUMN_SIZING_KEY);
        if(ls){ const parsed = JSON.parse(ls); if(parsed && typeof parsed==='object') setColumnSizing(parsed); }
        const res = await fetch('/api/user/prefs');
        if(res.ok){ const d=await res.json(); if(d.prefs?.listColumnSizing){ setColumnSizing(d.prefs.listColumnSizing); localStorage.setItem(COLUMN_SIZING_KEY, JSON.stringify(d.prefs.listColumnSizing)); } }
      } catch {/* ignore */}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  // Persist sizing (debounced)
  const sizingDebounce = useRef<NodeJS.Timeout|null>(null);
  useEffect(()=>{
    if(sizingDebounce.current) clearTimeout(sizingDebounce.current);
    sizingDebounce.current = setTimeout(()=>{ localStorage.setItem(COLUMN_SIZING_KEY, JSON.stringify(columnSizing)); saveServerColumnSizing(columnSizing as any); },400);
  },[columnSizing]);

  const table = useReactTable({ data: pageProducts as ProductRowData[], columns: extendedColumns as any, state:{ sorting,columnSizing,expanded,rowSelection,columnVisibility, columnOrder }, onSortingChange:setSorting, onExpandedChange:setExpanded, onColumnSizingChange:setColumnSizing, onRowSelectionChange:setRowSelection, onColumnVisibilityChange:setColumnVisibility, onColumnOrderChange:setColumnOrder, getCoreRowModel:getCoreRowModel(), getSortedRowModel:getSortedRowModel(), getExpandedRowModel:getExpandedRowModel(), columnResizeMode:'onChange', getRowId:(row:any)=> isVariant(row)? `variant-${row.id}`: `product-${row.id}`, getSubRows:(original:ProductRowData)=>{ if(!isVariant(original) && original.variants?.length>1 && original.variants[0].title!=='Default Title'){ return original.variants; } return undefined; }, autoResetPageIndex:false, enableRowSelection:true });

  const dragState = useRef<{src:string|null}>({src:null});
  const handleDragStart = (id:string)=> (e:React.DragEvent)=> { dragState.current.src=id; e.dataTransfer.setData('text/col', id); e.dataTransfer.effectAllowed='move'; };
  const dragOverId = useRef<string|null>(null);
  const [, forceRender] = useState(0);
  const handleDragOver = (id:string)=> (e:React.DragEvent)=> { if(!dragState.current.src || dragState.current.src===id) return; e.preventDefault(); e.dataTransfer.dropEffect='move'; if(dragOverId.current!==id){ dragOverId.current=id; forceRender(x=>x+1);} };
  const handleDragLeave = (id:string)=> (e:React.DragEvent)=> { if(dragOverId.current===id){ dragOverId.current=null; forceRender(x=>x+1);} };
  const handleDrop = (id:string)=> (e:React.DragEvent)=> { e.preventDefault(); const src=dragState.current.src|| e.dataTransfer.getData('text/col'); dragState.current.src=null; if(!src|| src===id) return; dragOverId.current=null; setColumnOrder(prev=>{ if(!prev) return prev; const next = prev.filter(c=>c!==src); const idx = next.indexOf(id); if(idx===-1){ next.push(src); } else { next.splice(idx,0,src); } return [...next]; }); };
  const reorderable = (colId:string)=> !['select','view'].includes(colId);

  // Store lists for filters
  const availableStores = useMemo(()=>{ const s=new Set<string>(); allProducts.forEach(p=>{ if(p.__storeHost) s.add(p.__storeHost); }); return Array.from(s).sort(); },[allProducts]);
  const availableVendors = useMemo(()=>{ const map:Record<string,number>={}; allProducts.forEach(p=>{ const key=((p.vendor??'').trim()||EMPTY); map[key]=(map[key]||0)+1; }); return Object.keys(map).map(name=>({ name,count:map[name] })).sort((a,b)=>a.name.localeCompare(b.name)); },[allProducts]);
  const availableTypes = useMemo(()=>{ const set=new Set<string>(); allProducts.forEach(p=> set.add(((p.product_type??'').trim()||EMPTY))); return Array.from(set).sort(); },[allProducts]);
  const filterChips = useMemo(()=>{ const chips: {key:string; label:string; onClear:()=>void}[]=[]; storeFilters.forEach(sf=> chips.push({key:`store-${sf}`, label:`Store: ${sf}` , onClear:()=> setStoreFilters(prev=> prev.filter(v=>v!==sf))})); vendorFilters.forEach(vf=> chips.push({key:`vendor-${vf}`, label:`Vendor: ${vf===EMPTY?'No Vendor':vf}`, onClear:()=> setVendorFilters(prev=> prev.filter(v=>v!==vf))})); typeFilters.forEach(tf=> chips.push({key:`type-${tf}`, label:`Type: ${tf===EMPTY?'No Type':tf}`, onClear:()=> setTypeFilters(prev=> prev.filter(v=>v!==tf))})); if(globalFilter) chips.push({key:'q', label:`Search: ${globalFilter} (${filteredProducts.length})`, onClear:()=>setGlobalFilter('')}); return chips; },[storeFilters,vendorFilters,typeFilters,globalFilter,filteredProducts.length]);

  const handleExport=async()=>{ if(!list) return; try{ const r=await fetch('/api/export',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ products: filteredProducts }) }); if(!r.ok) throw new Error('Export failed'); const blob=await r.blob(); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`${list.name||'list'}-export.csv`; document.body.appendChild(a); a.click(); a.remove(); } catch(e:any){ alert(e.message||'Export failed'); } };

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const selectedCount = table.getSelectedRowModel().rows.length;

  return (<div className="w-full mx-auto px-0 space-y-3 md:space-y-4">
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4 px-4 md:px-8">
      <div className="flex items-center gap-3"><Button variant="ghost" size="sm" onClick={()=>router.push('/app/lists')}>← Back</Button><h2 className="text-2xl font-bold tracking-tight">{list? list.name:'List'}</h2></div>
      <div className="flex items-center gap-3 md:gap-4">
        {list && <Button size="sm" variant={editMode?'outline':'secondary'} disabled={pending} onClick={()=> editMode? (dirtyMap.size? saveEdits(): setEditMode(false)) : setEditMode(true)}>{pending? 'Saving…': editMode? (dirtyMap.size? 'Save Changes':'Done') : 'Edit Mode'}</Button>}
        <Button onClick={handleExport}>Export CSV</Button>
      </div>
    </div>
    <div className="hidden md:flex items-center gap-3 flex-wrap px-4 md:px-8">
      <div style={{width:'240px'}}>
        <MultiSelect
          values={storeFilters}
          options={availableStores.map(s=> ({ value:s, label:s }))}
          placeholder="All Stores"
          onChange={vals=> setStoreFilters(vals)}
        />
      </div>
      <div style={{width:'220px'}}>
        <MultiSelect
          values={vendorFilters}
          options={availableVendors.map(v=> ({ value:v.name, label: v.name===EMPTY? 'No Vendor': `${v.name} (${v.count})` }))}
          placeholder="All Vendors"
          onChange={vals=> setVendorFilters(vals)}
        />
      </div>
      <div style={{width:'220px'}}>
        <MultiSelect
          values={typeFilters}
          options={availableTypes.map(t=> ({ value:t, label: t===EMPTY? 'No Product Type': t }))}
          placeholder="All Product Types"
          onChange={vals=> setTypeFilters(vals)}
        />
      </div>
      <div className="relative" style={{width:320}}>
        <input className={cn('h-10 px-3 border rounded-md w-full text-sm placeholder:text-muted-foreground', globalFilter && 'border-2 border-brand-green')} placeholder="Search products..." value={globalFilter} onChange={e=>setGlobalFilter(e.target.value)} />
        {globalFilter && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={()=>setGlobalFilter('')}>×</Button>}
      </div>
      {(storeFilters.length||vendorFilters.length||typeFilters.length||globalFilter) && <Button variant="link" onClick={()=>{ setStoreFilters([]); setVendorFilters([]); setTypeFilters([]); setGlobalFilter(''); setExpanded({}); }}>Clear Filters</Button>}
    </div>
    {filterChips.length>0 && <div className="hidden md:flex items-center gap-2 flex-wrap px-4 md:px-8 -mt-2 mb-1">{filterChips.map(chip=> <Badge key={chip.key} variant="secondary" className="flex items-center gap-1 pr-1">{chip.label}<button className="text-xs rounded-sm hover:bg-muted px-1" onClick={chip.onClear}>×</button></Badge>)}<Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={()=>{ setStoreFilters([]); setVendorFilters([]); setTypeFilters([]); setGlobalFilter(''); setExpanded({}); }}>Clear All</Button></div>}

    <div className="full-bleed">
      <Card className="py-0 rounded-none border-0 shadow-none bg-transparent"><CardContent className="p-0"><div className="px-4 md:px-8"><div className="rounded-lg border bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
        <div className="w-full px-4 py-3 flex flex-wrap items-center gap-3 text-sm">
          <div className="relative" style={{width:320}}>
            <input className={cn('h-8 px-3 border rounded-md w-full text-sm placeholder:text-muted-foreground', globalFilter && 'border-2 border-brand-green')} placeholder="Search products..." value={globalFilter} onChange={e=>setGlobalFilter(e.target.value)} />
            {globalFilter && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={()=>setGlobalFilter('')}>×</Button>}
          </div>
          {selectedCount>0 && <Button size="sm" variant="link" className="font-semibold" onClick={()=> setRowSelection({})}>Deselect</Button>}
          {selectedCount>0 && <Button size="sm" variant="destructive" onClick={async()=>{ if(!list) return; const ok = await confirmModal({ title: 'Remove Products', description: `Remove ${selectedCount} selected product${selectedCount>1?'s':''} from this list?`, confirmText: 'Remove', processingText: 'Removing…', variant: 'destructive', onConfirm: async ()=>{ const selected = table.getSelectedRowModel().rows.map(r=>{ const prod:any = isVariant(r.original)? (r.getParentRow()?.original): r.original; return prod.handle; }); const handles=[...new Set(selected)]; const res=await fetch(`/api/lists/${list.id}?handles=${encodeURIComponent(handles.join(','))}`, { method:'DELETE' }); const d=await res.json(); if(res.ok){ setList(d.list); setLocalItems(d.list.items||[]); setRowSelection({}); } else { throw new Error(d.error||'Remove failed'); } } }); if(!ok) return; }}>Remove From List</Button>}
          {table.getState().sorting.length>0 && <Button variant="link" className="font-semibold" onClick={()=>table.resetSorting()}>Reset Sort</Button>}
          <div className="ml-auto flex items-center gap-3 text-xs sm:text-sm text-muted-foreground font-medium" title={`Filtered products: ${filteredProducts.length}`}>
            <span>
              <span className="text-foreground font-semibold tabular-nums">{filteredProducts.length}</span>
              {` of Total `}
              <span className="text-foreground font-semibold tabular-nums">{allProducts.length}</span>
              {` Products`}
            </span>
            {selectedCount>0 && <span><span className="text-foreground font-semibold tabular-nums">{selectedCount}</span> selected</span>}
          </div>
        </div>
        <div className="overflow-auto" ref={tableScrollRef}>
          <Table className="w-full" style={{width: table.getTotalSize()}}>
            <TableHeader>{table.getHeaderGroups().map(hg=> <TableRow key={hg.id} className="bg-gray-200 dark:bg-gray-800/70">{hg.headers.map(h=>{ const size=h.getSize(); const colId = h.column.id; const idAttr = h.id; const draggable = reorderable(colId); return (<TableHead
                  key={idAttr}
                  style={{width:size,minWidth:size,maxWidth:size}}
                      className={cn('relative px-2 sm:px-4 border-r last:border-r-0 border-l [&:first-child]:border-l-0 group [&_button]:!text-foreground [&_button:hover]:!text-foreground [&_button]:!opacity-100', dragOverId.current===colId && 'before:absolute before:inset-y-0 before:-left-[2px] before:w-1 before:bg-brand-green before:rounded-full')}
                  onDragOver={draggable? handleDragOver(colId):undefined}
                  onDragLeave={draggable? handleDragLeave(colId):undefined}
                  onDrop={draggable? handleDrop(colId):undefined}
                >
                  <div className="flex items-center gap-2">
          {selectedCount>0 && <Button size="sm" variant="link" className="font-semibold" onClick={()=>{ setColumnSizing({}); localStorage.removeItem(COLUMN_SIZING_KEY); saveServerColumnSizing({}); }}>Reset Sizes</Button>}
                    {draggable && (
                      <span
                        className="flex items-center justify-center h-4 w-4 cursor-grab active:cursor-grabbing text-muted-foreground opacity-60 group-hover:opacity-100"
                        draggable
                        onDragStart={handleDragStart(colId)}
                        aria-label="Drag column"
                      >
                        <GripVertical className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <div className="flex-1 min-w-0 truncate select-none">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </div>
                  </div>
                  {h.column.getCanResize() && (
                    <div
                      onMouseDown={h.getResizeHandler()}
                      onTouchStart={h.getResizeHandler()}
                      className={cn('resizer', h.column.getIsResizing() && 'isResizing')}
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`Resize ${colId} column`}
                    />
                  )}
                </TableHead>); })}</TableRow>)}</TableHeader>
            <TableBody>{loading? (<TableRow><TableCell colSpan={table.getAllColumns().length} className="p-6 text-sm text-muted-foreground">Loading products…</TableCell></TableRow>): table.getRowModel().rows.map(row=> (<TableRow key={row.id} data-rowid={row.id} data-state={row.getIsSelected() && 'selected'} className="dark:bg-background border-b last:border-b-0">{row.getVisibleCells().map(cell=>{ const cSize=cell.column.getSize(); return (<TableCell key={cell.id} style={{width:cSize,minWidth:cSize,maxWidth:cSize}} className="p-4 align-middle border-r last:border-r-0 border-l [&:first-child]:border-l-0">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>); })}</TableRow>))}</TableBody>
          </Table>
        </div>
      </div></div></CardContent></Card>
    </div>
    <div className="flex items-center justify-between gap-4 py-4 w-full px-4 md:px-8">
      <div className="flex-1" />
      <div className="flex flex-shrink-0 justify-center items-center gap-2">
        <Button variant="outline" size="icon" onClick={()=>setPageIndex(0)} disabled={pageIndex===0}><ChevronsLeft className="h-4 w-4"/></Button>
        <Button variant="outline" size="icon" onClick={()=>setPageIndex(i=>Math.max(0,i-1))} disabled={pageIndex===0}><ChevronLeft className="h-4 w-4"/></Button>
        <div className="px-2 text-sm text-muted-foreground">Page <span className="font-medium">{pageIndex+1}</span> / {pageCount}</div>
        <Button variant="outline" size="icon" onClick={()=>setPageIndex(i=>Math.min(pageCount-1,i+1))} disabled={pageIndex>=pageCount-1}><ChevronRight className="h-4 w-4"/></Button>
        <Button variant="outline" size="icon" onClick={()=>setPageIndex(pageCount-1)} disabled={pageIndex>=pageCount-1}><ChevronsRight className="h-4 w-4"/></Button>
      </div>
      <div className="flex flex-1 justify-end items-center gap-2"><span className="text-sm text-muted-foreground">Show</span><Select value={`${pageSize}`} onValueChange={v=>{ setPageSize(Number(v)); setPageIndex(0); }}><SelectTrigger className="w-[80px] h-9"><SelectValue/></SelectTrigger><SelectContent>{[10,25,50,100].map(s=> <SelectItem key={s} value={`${s}`}>{s}</SelectItem>)}</SelectContent></Select><span className="text-sm text-muted-foreground">products</span></div>
    </div>
  <Dialog open={bodyEditorOpen} onOpenChange={setBodyEditorOpen}><DialogContent size="panel"><div className="px-5 pt-5 pb-4 border-b bg-gradient-to-b from-background to-background/70 sticky top-0 z-10"><DialogHeader className="px-0 py-0"><DialogTitle>Body HTML / Liquid - {currentBodyHandle}</DialogTitle></DialogHeader></div><div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-auto p-5 h-[70vh]"><div className="flex flex-col h-full"><textarea className="flex-1 w-full rounded border bg-background font-mono text-xs p-2" value={bodyDraft} onChange={e=>setBodyDraft(e.target.value)} /><div className="flex justify-end mt-2 gap-2"><Button variant="outline" size="sm" onClick={()=>setBodyEditorOpen(false)}>Cancel</Button><Button size="sm" onClick={applyBodyHtml}>Apply</Button></div></div><div className="overflow-auto prose dark:prose-invert border rounded p-3 bg-muted/30"><div dangerouslySetInnerHTML={{__html: bodyDraft}} /></div></div></DialogContent></Dialog>
  </div>);
}
