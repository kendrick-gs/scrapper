'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Edit3, Trash2, Save, X, FolderPlus } from 'lucide-react';

type ListMeta = { id: string; name: string; createdAt: string; items?: any[] };

export default function ListsPage() {
  const [lists, setLists] = useState<ListMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string>('');
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    if (!filter.trim()) return lists;
    const f = filter.toLowerCase();
    return lists.filter(l => l.name.toLowerCase().includes(f));
  }, [lists, filter]);

  const relativeTime = (iso: string) => {
    const d = new Date(iso).getTime();
    const diff = Date.now() - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/lists');
      const data = await res.json();
      setLists(data.lists || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load lists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/lists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      setName('');
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to create');
    } finally {
      setLoading(false);
    }
  };

  const saveEdit = async (id: string) => {
    if (!editingName.trim()) { setEditingId(''); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/lists/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editingName.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      setEditingId(''); setEditingName('');
      await load();
    } catch (e: any) { setError(e.message || 'Failed to update'); } finally { setLoading(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this list?')) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/lists/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove');
      await load();
    } catch (e: any) { setError(e.message || 'Failed to remove'); } finally { setLoading(false); }
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4">
      <Card>
        <CardHeader className="space-y-4 pb-2">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-[1.35rem] font-semibold tracking-tight flex items-center gap-2">
                Lists {lists.length > 0 && <Badge variant="secondary" className="bg-brand-green text-white hover:bg-brand-green-light ml-1">{lists.length}</Badge>}
              </CardTitle>
              <p className="text-xs text-muted-foreground max-w-prose">Independent product subsets for enrichment, analysis & export workflows.</p>
            </div>
            <div className="flex w-full md:w-[420px] gap-2">
              <Input
                className="flex-1 text-sm"
                placeholder="New list name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Button onClick={create} disabled={loading || !name.trim()} className="h-9 px-3 gap-1">
                <FolderPlus className="h-4 w-4" /> Create
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="relative">
              <Input placeholder="Filter lists..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8 h-9 text-sm" />
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
          {error && <div className="text-red-500 text-xs">{error}</div>}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="overflow-hidden border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 px-3 font-medium w-[46%]">Name</th>
                  <th className="py-2 px-3 font-medium w-[16%]">Created</th>
                  <th className="py-2 px-3 font-medium w-[14%]">Items</th>
                  <th className="py-2 px-3 font-medium w-[24%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && lists.length === 0 && Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-t animate-pulse">
                    <td className="py-3 px-3"><div className="h-4 w-60 bg-muted rounded" /></td>
                    <td className="py-3 px-3"><div className="h-4 w-24 bg-muted rounded" /></td>
                    <td className="py-3 px-3"><div className="h-4 w-16 bg-muted rounded" /></td>
                    <td className="py-3 px-3"><div className="h-4 w-40 bg-muted rounded" /></td>
                  </tr>
                ))}
                {filtered.map((l) => (
                  <tr key={l.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-3 max-w-[420px]">
                      {editingId === l.id ? (
                        <Input autoFocus value={editingName} onChange={e => setEditingName(e.target.value)} className="h-8 text-xs" />
                      ) : (
                        <div className="min-w-0">
                          <div className="font-medium truncate" title={l.name}>{l.name}</div>
                          <div className="text-[11px] text-muted-foreground">{relativeTime(l.createdAt)}</div>
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-xs whitespace-nowrap" title={new Date(l.createdAt).toLocaleString()}> {new Date(l.createdAt).toLocaleDateString()} </td>
                    <td className="py-2 px-3 text-xs">{(l.items?.length) ?? 0}</td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" className="h-8 px-3" onClick={() => window.location.href = `/app/lists/${l.id}`} title="Open list">
                          Open
                        </Button>
                        {editingId === l.id ? (
                          <Button size="sm" className="h-8 px-3 bg-brand-green text-white hover:bg-brand-green-light" onClick={() => saveEdit(l.id)} disabled={!editingName.trim()} title="Save name">
                            <Save className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" className="h-8 px-3" onClick={() => { setEditingId(l.id); setEditingName(l.name); }} title="Edit name">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        )}
                        {editingId === l.id && (
                          <Button size="sm" variant="ghost" className="h-8 px-3" onClick={() => { setEditingId(''); setEditingName(''); }} title="Cancel edit">
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="destructive" className="h-8 px-3" onClick={() => remove(l.id)} title="Delete list">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr><td className="py-6 text-center text-xs text-muted-foreground" colSpan={4}>No lists match filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

