"use client";
import { useEffect, useState } from 'react';

export function ServiceWorkerManager(){
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  useEffect(()=>{ try { setDismissedVersion(localStorage.getItem('sm_dismissed_update_version')); } catch {}; },[]);
  useEffect(()=>{
    if(!('serviceWorker' in navigator)) return;
    let interval: any;
    (async()=>{
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        const fetchVer = ()=> fetch('/sw.js',{cache:'no-store'}).then(r=>r.text()).then(t=>{ const m=t.match(/const VERSION = '([^']+)'/); if(m) setUpdateVersion(m[1]); }).catch(()=>{});
        if(reg.waiting){ setWaiting(reg.waiting); fetchVer(); }
        reg.addEventListener('updatefound',()=>{ const sw=reg.installing; if(!sw) return; sw.addEventListener('statechange',()=>{ if(sw.state==='installed' && navigator.serviceWorker.controller){ setWaiting(reg.waiting||sw as any); fetchVer(); } }); });
        navigator.serviceWorker.addEventListener('controllerchange',()=>{ window.location.reload(); });
        interval=setInterval(()=>reg.update().catch(()=>{}),300000);
      } catch(e){ console.warn('SW registration failed',e); }
    })();
    return ()=>{ if(interval) clearInterval(interval); };
  },[]);
  const visible = !!waiting && (!updateVersion || updateVersion !== dismissedVersion);
  if(!visible) return null;
  return <div className="fixed bottom-4 right-4 z-[1000] rounded-md bg-slate-900 text-white px-4 py-3 shadow-lg flex items-center gap-3 text-sm">
    <span>{updateVersion?`Update ${updateVersion} ready`:'Update ready'}</span>
    <button className="bg-white text-black px-2 py-1 rounded font-medium hover:bg-slate-100" onClick={()=>waiting?.postMessage({type:'SKIP_WAITING'})}>Refresh</button>
    <button className="bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded" onClick={()=>{ if(updateVersion){ localStorage.setItem('sm_dismissed_update_version',updateVersion); setDismissedVersion(updateVersion);} }}>Dismiss</button>
  </div>;
}
