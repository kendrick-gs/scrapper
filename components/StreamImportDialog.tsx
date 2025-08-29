'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

export function StreamImportDialog({
  shopUrl,
  open,
  title = 'Importing Store...',
  force = false,
  onFinished,
  onOpenChange,
}: {
  shopUrl: string;
  open: boolean;
  title?: string;
  force?: boolean;
  onFinished?: () => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLogs([]);

    const streamScrape = async () => {
      try {
        const response = await fetch('/api/scrape-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopUrl, force }),
        });

        if (!response.body) throw new Error('Response body is null');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const jsonString = line.substring(5);
              try {
                const data = JSON.parse(jsonString);
                if (data.finished) {
                  try { localStorage.setItem('tempResults', JSON.stringify(data.data)); } catch {}
                  if (!cancelled) {
                    onFinished?.();
                    onOpenChange?.(false);
                  }
                  return;
                } else if (data.message) {
                  setLogs(prev => [...prev, data.message]);
                } else if (data.error) {
                  setLogs(prev => [...prev, `ERROR: ${data.error}`]);
                }
              } catch {
                // ignore malformed chunk
              }
            }
          }
        }
      } catch (e: any) {
        setLogs(prev => [...prev, `A critical error occurred: ${e?.message || 'Unknown error'}`]);
      }
    };

    streamScrape();
    return () => { cancelled = true; };
  }, [open, shopUrl, onFinished, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <Progress value={logs.length * 2} className="w-full mb-4" />
        <div className="w-full h-64 bg-gray-900 text-white font-mono text-sm p-4 overflow-y-auto rounded-md">
          {logs.map((log, index) => (<p key={index} className="whitespace-pre-wrap">{`> ${log}`}</p>))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
