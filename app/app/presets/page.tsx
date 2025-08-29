'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type Presets = { vendors: string[]; productTypes: string[]; tags: string[] };

export default function PresetsPage() {
  const [presets, setPresets] = useState<Presets>({ vendors: [], productTypes: [], tags: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [newVendor, setNewVendor] = useState('');
  const [newType, setNewType] = useState('');
  const [newTag, setNewTag] = useState('');

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const r = await fetch('/api/presets');
      const d = await r.json();
      setPresets(d.presets || { vendors: [], productTypes: [], tags: [] });
    } catch (e: any) {
      setErr(e.message || 'Failed to load');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const add = async (kind: keyof Presets, value: string) => {
    if (!value.trim()) return;
    await fetch('/api/presets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [kind]: [value.trim()] }) });
    await load();
  };
  const remove = async (kind: keyof Presets, value: string) => {
    await fetch('/api/presets', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, value }) });
    await load();
  };

  return (
    <div className="w-full max-w-[900px] mx-auto px-4 space-y-6">
      <Card>
        <CardHeader><CardTitle>Data Presets</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {err && <div className="text-red-500 text-sm">{err}</div>}

          {/* Vendors */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-medium">Vendors</h3>
              <div className="text-xs text-muted-foreground">Preset options for Vendor field</div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Input className="h-9" placeholder="Add vendor" value={newVendor} onChange={e=>setNewVendor(e.target.value)} />
              <Button onClick={() => { add('vendors', newVendor); setNewVendor(''); }} disabled={!newVendor.trim()}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {presets.vendors.map(v => (
                <Badge key={v} variant="secondary" className="flex items-center gap-2">
                  {v || 'No Vendor'}
                  <button onClick={() => remove('vendors', v)} aria-label={`Remove ${v}`}>×</button>
                </Badge>
              ))}
              {presets.vendors.length === 0 && <div className="text-sm text-muted-foreground">No vendors yet.</div>}
            </div>
          </section>

          {/* Product Types */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-medium">Product Types</h3>
              <div className="text-xs text-muted-foreground">Preset options for Product Type field</div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Input className="h-9" placeholder="Add product type" value={newType} onChange={e=>setNewType(e.target.value)} />
              <Button onClick={() => { add('productTypes', newType); setNewType(''); }} disabled={!newType.trim()}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {presets.productTypes.map(t => (
                <Badge key={t} variant="secondary" className="flex items-center gap-2">
                  {t || 'No Product Type'}
                  <button onClick={() => remove('productTypes', t)} aria-label={`Remove ${t}`}>×</button>
                </Badge>
              ))}
              {presets.productTypes.length === 0 && <div className="text-sm text-muted-foreground">No product types yet.</div>}
            </div>
          </section>

          {/* Tags */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-medium">Tags</h3>
              <div className="text-xs text-muted-foreground">Suggested tags while editing</div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Input className="h-9" placeholder="Add tag" value={newTag} onChange={e=>setNewTag(e.target.value)} />
              <Button onClick={() => { add('tags', newTag); setNewTag(''); }} disabled={!newTag.trim()}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {presets.tags.map(t => (
                <Badge key={t} variant="secondary" className="flex items-center gap-2">
                  {t}
                  <button onClick={() => remove('tags', t)} aria-label={`Remove ${t}`}>×</button>
                </Badge>
              ))}
              {presets.tags.length === 0 && <div className="text-sm text-muted-foreground">No tags yet.</div>}
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
