"use client";
import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { updateCachedDataPresets } from '@/lib/idbCache';
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
  const [draft,setDraft]=useState<{vendors:string; productTypes:string; tags:string}>({ vendors:'', productTypes:'', tags:'' });

  const load= async()=>{
    setLoading(true); setError('');
    try { const r= await fetch('/api/user/prefs'); const d= await r.json(); if(!r.ok) throw new Error(d.error||'Failed'); setPresets({ vendors:d.prefs?.dataPresets?.vendors||[], productTypes:d.prefs?.dataPresets?.productTypes||[], tags:d.prefs?.dataPresets?.tags||[] }); } catch(e:any){ setError(e.message||'Failed to load'); } finally { setLoading(false);} };
  useEffect(()=>{ load(); },[]);

  const save = async(next: DataPresets)=>{ setSaving(true); try { setPresets(next); await fetch('/api/user/prefs',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ dataPresets: next }) }); updateCachedDataPresets(user?.email||'anon', next).catch(()=>{}); } finally { setSaving(false);} };

  const addItem = (bucket: keyof DataPresets)=>{ const raw = draft[bucket]; const parts = bucket==='tags'? raw.split(',').map(t=>t.trim()).filter(Boolean) : [raw.trim()].filter(Boolean); if(!parts.length) return; const cur = new Set(presets[bucket]); let changed=false; parts.forEach(p=>{ if(!cur.has(p)){ cur.add(p); changed=true; }}); if(changed){ save({ ...presets, [bucket]: Array.from(cur).sort((a,b)=>a.localeCompare(b)) }); } setDraft(d=> ({ ...d, [bucket]: '' })); };
  const removeItem = (bucket: keyof DataPresets, value: string)=>{ const next = presets[bucket].filter(v=>v!==value); save({ ...presets, [bucket]: next }); };

  const Section = ({ title, bucket }: { title:string; bucket: keyof DataPresets }) => {
    return (
      <Card className="flex flex-col">
        <CardHeader className="pb-3"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 pt-0">
          <div className="flex gap-2 items-center">
            <Input placeholder={`Add ${title.replace(/s$/,'')}${bucket==='tags'? ' (comma to add multiple)':''}`} value={draft[bucket]} onChange={e=> setDraft(prev=> ({ ...prev, [bucket]: e.target.value }))} onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addItem(bucket); } }} className="h-9" />
            <Button size="sm" disabled={!draft[bucket].trim()} onClick={()=>addItem(bucket)}>Add</Button>
          </div>
          {presets[bucket].length===0 && <p className="text-xs text-muted-foreground">No {title.toLowerCase()} yet.</p>}
          <div className="flex flex-wrap gap-2">
            {presets[bucket].map(v=> <Badge key={v} variant="secondary" className="flex items-center gap-1 pr-1">{v}<button onClick={()=>removeItem(bucket,v)} className="text-xs hover:bg-muted rounded px-1" aria-label={`Remove ${v}`}>×</button></Badge>)}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-5xl mx-auto w-full px-4 md:px-8 py-6 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Data Presets</h1>{saving && <span className="text-xs text-muted-foreground">Saving…</span>}</div>
      {error && <div className="text-sm text-destructive">{error}</div>}
      {loading? <div className="text-sm text-muted-foreground">Loading…</div>: (
        <div className="grid gap-6 md:grid-cols-3">
          <Section title="Vendors" bucket="vendors" />
          <Section title="Product Types" bucket="productTypes" />
          <Section title="Tags" bucket="tags" />
        </div>
      )}
      <p className="text-xs text-muted-foreground">These presets are offered in list edit mode and when adding products to a list. Adding a new value in those contexts will auto-append it here.</p>
    </div>
  );
}
