"use client";
import { useEffect, useRef, useState } from 'react';

export interface StreamMessage<T = any> { message?: string; data?: T; error?: string; finished?: boolean; }

// Generic SSE (or fetch stream) consumer hook.
export function useEventStream<T = any>(url: string | null, opts: { autoStart?: boolean; body?: any; depends?: any[] } = {}) {
  const { autoStart = true, body, depends = [] } = opts;
  const [logs, setLogs] = useState<string[]>([]);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string>('');
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const start = () => {
    if (!url) return;
    setLogs([]); setError(''); setFinished(false); setLoading(true); setData(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    fetch(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined, headers: { 'Content-Type': 'application/json' }, signal: controller.signal })
      .then(async res => {
        if (!res.body) throw new Error('No stream body');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop() || '';
            for (const part of parts) {
              if (!part.startsWith('data:')) continue;
              const json = part.replace(/^data:\s*/, '');
              try {
                const obj: StreamMessage<T> = JSON.parse(json);
                if (obj.message) setLogs(prev => [...prev, obj.message as string]);
                if (obj.error) { setError(obj.error); setFinished(true); }
                if (obj.data) setData(obj.data);
                if (obj.finished) { setFinished(true); }
              } catch { /* ignore */ }
            }
        }
      })
      .catch(e => { if (e.name !== 'AbortError') setError(e.message); })
      .finally(() => setLoading(false));
  };

  const abort = () => { controllerRef.current?.abort(); setLoading(false); };

  useEffect(() => {
    if (autoStart && url) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...depends]);

  return { logs, data, error, finished, loading, start, abort };
}
