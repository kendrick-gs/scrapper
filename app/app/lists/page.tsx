'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type ListMeta = { id: string; name: string; createdAt: string };

export default function ListsPage() {
  const [lists, setLists] = useState<ListMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
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

  return (
    <div className="w-full max-w-[900px] mx-auto px-4">
      <Card>
        <CardHeader>
          <CardTitle>Lists</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex w-full items-center gap-2 mb-4">
            <input
              className="h-9 px-3 border rounded-md flex-1"
              placeholder="New list name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button onClick={create} disabled={loading || !name.trim()}>Create</Button>
          </div>
          {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Created</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lists.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="py-2 pr-4">{l.name}</td>
                    <td className="py-2 pr-4">{new Date(l.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-4"><a className="text-primary underline" href={`/app/lists/${l.id}`}>Open</a></td>
                  </tr>
                ))}
                {lists.length === 0 && (
                  <tr><td className="py-4 text-sm text-muted-foreground" colSpan={3}>No lists yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

