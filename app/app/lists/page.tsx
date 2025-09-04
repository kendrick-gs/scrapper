'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type ListMeta = { id: string; name: string; createdAt: string };

export default function ListsPage() {
  const [lists, setLists] = useState<ListMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string>('');
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');

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
    <div className="w-full max-w-[1100px] mx-auto px-4">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Lists</CardTitle>
          <p className="text-xs text-muted-foreground">Independent product datasets for enrichment and export.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex w-full items-center gap-2">
            <Input
              className="flex-1"
              placeholder="New list name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button onClick={create} disabled={loading || !name.trim()}>Create</Button>
          </div>
          {error && <div className="text-red-500 text-xs">{error}</div>}
          <div className="overflow-hidden border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 px-3 font-medium">Name</th>
                  <th className="py-2 px-3 font-medium">Created</th>
                  <th className="py-2 px-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lists.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="py-2 px-3 max-w-[320px]">
                      {editingId === l.id ? (
                        <Input autoFocus value={editingName} onChange={e => setEditingName(e.target.value)} className="h-8 text-xs" />
                      ) : (
                        <span className="font-medium">{l.name}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-xs whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => window.location.href = `/app/lists/${l.id}`}>Open</Button>
                        {editingId === l.id ? (
                          <Button size="sm" onClick={() => saveEdit(l.id)} disabled={!editingName.trim()}>Save</Button>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => { setEditingId(l.id); setEditingName(l.name); }}>Edit</Button>
                        )}
                        {editingId === l.id && (
                          <Button size="sm" variant="ghost" onClick={() => { setEditingId(''); setEditingName(''); }}>Cancel</Button>
                        )}
                        <Button size="sm" variant="destructive" onClick={() => remove(l.id)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {lists.length === 0 && (
                  <tr><td className="py-6 text-center text-xs text-muted-foreground" colSpan={3}>No lists yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

