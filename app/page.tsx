'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';

export default function HomePage() {
  const router = useRouter();
  useEffect(() => { router.replace('/app/start'); }, [router]);
  return <AppShell>Redirecting…</AppShell>;
}
