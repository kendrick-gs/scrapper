'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ListItemProduct {
  id?: number | string;
  handle: string;
  title: string;
  vendor?: string;
  product_type?: string;
  variants?: any[];
  [k: string]: any;
}
interface UserListResponse { id: string; name: string; createdAt: string; items: ListItemProduct[] }

export default function ListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '';
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<UserListResponse | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/lists/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load list');
      if (!data.list) { setError('List not found or unauthorized'); setList(null); }
      else setList(data.list);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable react-hooks/exhaustive-deps */ }, [id]);

  const handleExport = async () => {
    if (!list) return;
    try {
      const response = await fetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ products: list.items }) });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${list.name || 'list'}-export.csv`; document.body.appendChild(a); a.click(); a.remove();
    } catch (e: any) {
      alert(e.message || 'Export failed');
    }
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push('/app/lists')}>← Back</Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-4">
            <span>{loading ? 'Loading…' : list ? list.name : 'List'}</span>
            {list && <div className="flex items-center gap-2 text-sm text-muted-foreground"><span>{list.items.length} items</span><Button size="sm" onClick={handleExport}>Export CSV</Button></div>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
          {!loading && list && list.items.length === 0 && <div className="text-sm text-muted-foreground">This list has no items yet.</div>}
          {loading && <div className="text-sm text-muted-foreground">Fetching list…</div>}
          {!loading && list && list.items.length > 0 && (
            <div className="overflow-auto border rounded">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="p-2">Title</th>
                    <th className="p-2">Handle</th>
                    <th className="p-2">Vendor</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Variants</th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((p, i) => (
                    <tr key={(p.id || p.handle || i) + ''} className="border-t hover:bg-muted/40">
                      <td className="p-2">{p.title}</td>
                      <td className="p-2 text-xs text-muted-foreground">{p.handle}</td>
                      <td className="p-2">{p.vendor || <span className="text-muted-foreground">—</span>}</td>
                      <td className="p-2">{p.product_type || <span className="text-muted-foreground">—</span>}</td>
                      <td className="p-2">{p.variants ? p.variants.length : 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
