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
  const [isPreviewPhase, setIsPreviewPhase] = useState(true);

  useEffect(() => {
    let active = true;
  const existing = get(src);
  if (existing) { setBlobUrl(existing); setLoaded(true); setIsPreviewPhase(false); return; }
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
        // Phase 1: fetch as a small image for preview (use image resizing via query params if CDN supports width param; else fetch full and downscale stream early)
        let fullResponse: Response | null = null;
        try {
          const previewUrl = src.includes('?') ? src + '&width=64' : src + '?width=64';
          const smallRes = await fetch(previewUrl, { cache: 'force-cache' });
          if (smallRes.ok) {
            const smallBlob = await smallRes.blob();
            if (active) {
              try {
                const imgBitmap = await createImageBitmap(smallBlob).catch(()=>null);
                if (imgBitmap) {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    const targetW = 24;
                    const scale = targetW / imgBitmap.width;
                    canvas.width = targetW;
                    canvas.height = Math.max(1, Math.round(imgBitmap.height * scale));
                    ctx.drawImage(imgBitmap, 0, 0, canvas.width, canvas.height);
                    const tiny = canvas.toDataURL('image/jpeg', 0.5);
                    setPreview(tiny);
                  }
                }
              } catch { /* ignore */ }
            }
          }
        } catch { /* ignore preview fetch */ }

        fullResponse = await fetch(src, { cache: 'force-cache' });
        const blob = await fullResponse.blob();
        if (!active) return;
        const objectUrl = put(src, blob);
        setBlobUrl(objectUrl);
        requestAnimationFrame(() => { if (active) { setLoaded(true); setIsPreviewPhase(false); } });
      } catch { /* ignore */ }
    })();
    return () => { active = false; };
  }, [src, get, put]);

  return (
    <div className={className + ' relative overflow-hidden'}>
      {preview && isPreviewPhase && (
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
