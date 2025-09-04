"use client";

import { useEffect } from 'react';

import StartPageContent from '@/components/pages/Start';
import { useState } from 'react';

export default function StartPage() {
	const [updateReady, setUpdateReady] = useState(false);
	const [updateVersion, setUpdateVersion] = useState<string | null>(null);
	const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
	useEffect(() => {
		setDismissedVersion(localStorage.getItem('sm_dismissed_update_version'));
		if ('serviceWorker' in navigator) {
			const registerSW = async () => {
				try {
					const reg = await navigator.serviceWorker.register('/sw.js');
					const bc = ('BroadcastChannel' in window) ? new BroadcastChannel('sw-updates') : null;
					bc?.addEventListener('message', (ev: MessageEvent) => {
						if (ev.data?.type === 'SW_ACTIVATED') {
							console.log('Service worker activated', ev.data.version);
						}
					});
					if (reg.waiting) {
						setUpdateReady(true);
						fetch('/sw.js').then(r => r.text()).then(txt => {
							const m = txt.match(/const VERSION = '([^']+)'/);
							if (m) setUpdateVersion(m[1]);
						}).catch(() => {});
					}
					reg.addEventListener('updatefound', () => {
						const installing = reg.installing;
						if (!installing) return;
						installing.addEventListener('statechange', () => {
							if (installing.state === 'installed' && navigator.serviceWorker.controller) {
								setUpdateReady(true);
								fetch('/sw.js').then(r => r.text()).then(txt => {
									const m = txt.match(/const VERSION = '([^']+)'/);
									if (m) setUpdateVersion(m[1]);
								}).catch(() => {});
							}
						});
					});
					navigator.serviceWorker.addEventListener('controllerchange', () => {
						window.location.reload();
					});
					setInterval(() => reg.update().catch(() => {}), 60_000);
				} catch (e) {
					console.warn('SW registration failed', e);
				}
			};
			registerSW();
		}
	}, []);
	const shouldShow = updateReady && (!updateVersion || updateVersion !== dismissedVersion);
	return <>
		<StartPageContent />
		{shouldShow && (
			<div style={{ position:'fixed', bottom:16, right:16, zIndex:1000 }} className="rounded-md bg-slate-900 text-white px-4 py-3 shadow-lg flex items-center gap-3 text-sm">
				<span>{updateVersion ? `Update ${updateVersion} available` : 'Update available'}</span>
				<button
					className="bg-white text-black px-2 py-1 rounded font-medium"
					onClick={() => {
						navigator.serviceWorker.getRegistration().then(reg => {
							reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
						});
					}}
				>Refresh</button>
				<button
					className="bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded"
					onClick={() => {
						if (updateVersion) {
							localStorage.setItem('sm_dismissed_update_version', updateVersion);
							setDismissedVersion(updateVersion);
						}
					}}
				>Dismiss</button>
			</div>
		)}
	</>;
}

