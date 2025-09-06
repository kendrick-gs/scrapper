"use client";
import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { updateCachedDataPresets } from '@/lib/idbCache';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface DataPresets { vendors: string[]; productTypes: string[]; tags: string[] }

const empty: DataPresets = { vendors: [], productTypes: [], tags: [] };

export default function DataPresetsPage(){
  const user = useAuthStore(s=>s.user);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [presets,setPresets]=useState<DataPresets>(empty);
  const [query,setQuery]=useState('');
  const [activeTab,setActiveTab]=useState<keyof DataPresets>('vendors');
  const [page,setPage]=useState(0);
  const PAGE_SIZE=60;
  const [draft,setDraft]=useState<{vendors:string; productTypes:string; tags:string}>({ vendors:'', productTypes:'', tags:'' });

  const load= async()=>{
    setLoading(true); setError('');
    try { const r= await fetch('/api/user/prefs'); const d= await r.json(); if(!r.ok) throw new Error(d.error||'Failed'); setPresets({ vendors:d.prefs?.dataPresets?.vendors||[], productTypes:d.prefs?.dataPresets?.productTypes||[], tags:d.prefs?.dataPresets?.tags||[] }); } catch(e:any){ setError(e.message||'Failed to load'); } finally { setLoading(false);} };
  useEffect(()=>{ load(); },[]);

  const save = async(next: DataPresets)=>{ setSaving(true); try { setPresets(next); await fetch('/api/user/prefs',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ dataPresets: next }) }); updateCachedDataPresets(user?.email||'anon', next).catch(()=>{}); } finally { setSaving(false);} };

  const addItem = (bucket: keyof DataPresets)=>{ const raw = draft[bucket]; const parts = bucket==='tags'? raw.split(',').map(t=>t.trim()).filter(Boolean) : [raw.trim()].filter(Boolean); if(!parts.length) return; const cur = new Set(presets[bucket]); let changed=false; parts.forEach(p=>{ if(!cur.has(p)){ cur.add(p); changed=true; }}); if(changed){ save({ ...presets, [bucket]: Array.from(cur).sort((a,b)=>a.localeCompare(b)) }); } setDraft(d=> ({ ...d, [bucket]: '' })); };
  const removeItem = (bucket: keyof DataPresets, value: string)=>{ const next = presets[bucket].filter(v=>v!==value); save({ ...presets, [bucket]: next }); };
  const clearAll = (bucket: keyof DataPresets)=>{ if(!presets[bucket].length) return; if(!confirm(`Remove all ${bucket}?`)) return; save({ ...presets, [bucket]: [] }); };

  const filtered = useMemo(()=>{
    const q=query.trim().toLowerCase();
    return (presets[activeTab]||[]).filter(v=> !q || v.toLowerCase().includes(q));
  },[presets, activeTab, query]);
  const paged = useMemo(()=>{
    const start = page*PAGE_SIZE; return filtered.slice(start, start+PAGE_SIZE);
  },[filtered,page]);
  useEffect(()=>{ setPage(0); },[activeTab, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const TabButton = ({bucket,label}:{bucket:keyof DataPresets; label:string})=>{
    const count = presets[bucket].length;
    const active = activeTab===bucket;
    return <button onClick={()=>setActiveTab(bucket)} className={cn('px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 border transition-colors', active? 'bg-primary text-primary-foreground border-primary':'bg-background hover:bg-muted border-border')}>{label}<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground tabular-nums">{count}</span></button>;
  };

  const renderGrid = () => {
    if(!filtered.length) return <div className="text-xs text-muted-foreground py-6">No entries.</div>;
    return (
      <div className="grid gap-2" style={{ gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))' }}>
        {paged.map(v=> (
          <div key={v} className="group relative flex items-center justify-between gap-1 rounded-md border bg-card/60 px-2 py-1.5 text-xs hover:border-primary/60 transition-colors">
            <span className="truncate" title={v}>{v}</span>
            <button onClick={()=>removeItem(activeTab,v)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity" aria-label={`Remove ${v}`}>×</button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Data Presets</h1>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {saving && <span>Saving…</span>}
          <span>Total: V {presets.vendors.length} • T {presets.productTypes.length} • Tags {presets.tags.length}</span>
        </div>
      </div>
      {error && <div className="text-sm text-destructive">{error}</div>}
      {loading? <div className="text-sm text-muted-foreground">Loading…</div>: (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <TabButton bucket="vendors" label="Vendors" />
              <TabButton bucket="productTypes" label="Product Types" />
              <TabButton bucket="tags" label="Tags" />
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search current tab…" className="h-9 pr-8 w-64" />
                {query && <button className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground" onClick={()=>setQuery('')}>×</button>}
              </div>
              <div className="flex items-center gap-2">
                <Input placeholder={`Add ${activeTab==='tags'? 'tag(s)': activeTab.slice(0,-1)}` + (activeTab==='tags'? ' (comma separated)':'')} value={draft[activeTab]} onChange={e=> setDraft(prev=> ({ ...prev, [activeTab]: e.target.value }))} onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addItem(activeTab); } }} className="h-9 w-64" />
                <Button size="sm" disabled={!draft[activeTab].trim()} onClick={()=>addItem(activeTab)}>Add</Button>
                <Button size="sm" variant="outline" disabled={!filtered.length} onClick={()=>clearAll(activeTab)}>Clear All</Button>
              </div>
              <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                <span>{filtered.length} items{filtered.length!==presets[activeTab].length && ` (filtered from ${presets[activeTab].length})`}</span>
                {pageCount>1 && <span>Page {page+1} / {pageCount}</span>}
              </div>
            </div>
            <Card className="p-4 border-dashed">
              {renderGrid()}
              {pageCount>1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button size="sm" variant="outline" disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))}>Prev</Button>
                  <div className="text-xs tabular-nums">{page+1} / {pageCount}</div>
                  <Button size="sm" variant="outline" disabled={page>=pageCount-1} onClick={()=>setPage(p=>Math.min(pageCount-1,p+1))}>Next</Button>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
      <p className="text-xs text-muted-foreground">These presets appear in list edit mode & add-to-list dialog. Adding new values there syncs here automatically.</p>
    </div>
  );
}
