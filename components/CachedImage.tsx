"use client";
import { useEffect, useState } from 'react';
import { useImageCacheStore } from '@/store/useImageCacheStore';

interface Props { src: string; alt?: string; className?: string; sizes?: string; fill?: boolean; }

export function CachedImage({ src, alt = '', className, sizes }: Props) {
  const { get, put } = useImageCacheStore();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const existing = get(src);
    if (existing) { setBlobUrl(existing); return; }
    (async () => {
      try {
        const res = await fetch(src, { cache: 'force-cache' });
        const blob = await res.blob();
        if (!active) return;
        const url = put(src, blob);
        setBlobUrl(url);
      } catch { /* ignore */ }
    })();
    return () => { active = false; };
  }, [src, get, put]);
  return <img src={blobUrl || src} alt={alt} className={className} />;
}
