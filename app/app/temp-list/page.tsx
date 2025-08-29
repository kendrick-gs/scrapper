'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export default function TempListPage() {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('tempResults');
      if (raw) {
        const d = JSON.parse(raw);
        setProducts(d.products || []);
      }
    } catch {}
  }, []);

  const handleExport = async () => {
    const res = await fetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ products }) });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'temp_list.csv'; document.body.appendChild(a); a.click(); a.remove();
    }
  };

  return (
    <div className="w-full max-w-[900px] mx-auto px-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Temporary List</h2>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">{products.length} products</div>
          <Button onClick={handleExport} disabled={products.length === 0}>Export CSV</Button>
        </div>
      </div>
      <div className="overflow-x-auto border rounded-md">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-2 px-3">Handle</th>
              <th className="py-2 px-3">Title</th>
              <th className="py-2 px-3">Vendor</th>
              <th className="py-2 px-3">Type</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={`${p.id}-${i}`} className="border-t">
                <td className="py-2 px-3 font-mono">{p.handle}</td>
                <td className="py-2 px-3">{p.title}</td>
                <td className="py-2 px-3">{p.vendor}</td>
                <td className="py-2 px-3">{p.product_type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

