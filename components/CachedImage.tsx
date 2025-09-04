"use client";
import { useEffect, useState } from 'react';
import { useImageCacheStore } from '@/store/useImageCacheStore';
import { idbGetImage } from '@/lib/idbImageCache';

interface Props { src: string; alt?: string; className?: string; sizes?: string; fill?: boolean; }

export function CachedImage({ src, alt = '', className }: Props) {
  const { get, put } = useImageCacheStore();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const existing = get(src);
    if (existing) { setBlobUrl(existing); setLoaded(true); return; }
    // Try IndexedDB persistent layer first
    (async () => {
      try {
        const idbBlob = await idbGetImage(src);
        if (idbBlob && active) {
          const objectUrl = put(src, idbBlob);
          setBlobUrl(objectUrl);
          setLoaded(true);
          return; // already satisfied
        }
      } catch { /* ignore and fall through to fetch */ }
    })();
    (async () => {
      try {
        const res = await fetch(src, { cache: 'force-cache' });
        const blob = await res.blob();
        if (!active) return;
        const objectUrl = put(src, blob);
        // generate a tiny blurred preview
        try {
          const img = document.createElement('img');
            img.src = objectUrl;
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  const targetW = 16;
                  const scale = img.naturalWidth ? targetW / img.naturalWidth : 0.1;
                  canvas.width = targetW;
                  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
                  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                  const tiny = canvas.toDataURL('image/jpeg', 0.4);
                  if (active) setPreview(tiny);
                }
              } catch { /* ignore */ }
              if (active) setBlobUrl(objectUrl);
              requestAnimationFrame(() => { if (active) setLoaded(true); });
            };
        } catch { setBlobUrl(objectUrl); setLoaded(true); }
      } catch { /* ignore */ }
    })();
    return () => { active = false; };
  }, [src, get, put]);

  return (
    <div className={className + ' relative overflow-hidden'}>
      {preview && !loaded && (
        <img src={preview} aria-hidden className="absolute inset-0 w-full h-full object-cover blur-sm scale-110 opacity-80 transition" />
      )}
      { (blobUrl || src) && (
        <img
          src={blobUrl || src}
          alt={alt}
          className={`object-cover w-full h-full transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
        />
      )}
    </div>
  );
}
