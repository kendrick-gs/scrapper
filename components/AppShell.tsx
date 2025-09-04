'use client';
// kendrick-gs/scrapper/scrapper-a31e4028cc7f75eeeb406d17e6548fcd50443ca8/components/AppShell.tsx
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { CacheIndicator } from '@/components/CacheIndicator';
import { UserPrefsPanel } from '@/components/UserPrefsPanel';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, error, refresh, login, register, logout } = useAuthStore();
  const [email, setEmail] = useState('');

  useEffect(() => {
    refresh();
  }, [refresh]);

  const pathname = usePathname();

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-white dark:bg-background">
      <div className="w-full max-w-[1440px] flex items-center justify-between mb-4 gap-4">
        <nav className="flex items-center gap-4 text-sm flex-wrap">
          <Link href="/app/start" className={pathname?.startsWith('/app/start') ? 'font-medium' : 'text-muted-foreground'}>Start</Link>
          {user && (
            <>
              <Link href="/app/console" className={pathname?.startsWith('/app/console') ? 'font-medium' : 'text-muted-foreground'}>Console</Link>
              <Link href="/app/stores" className={pathname?.startsWith('/app/stores') ? 'font-medium' : 'text-muted-foreground'}>Stores</Link>
              <Link href="/app/lists" className={pathname?.startsWith('/app/lists') ? 'font-medium' : 'text-muted-foreground'}>Lists</Link>
            </>
          )}
          <CacheIndicator />
          <UserPrefsPanel />
        </nav>
        {!user ? (
          <div className="flex items-center gap-2">
            <Input
              type="email"
              value={email}
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 w-64"
            />
            <Button size="sm" disabled={loading} onClick={() => login(email)}>Login</Button>
            <Button size="sm" variant="outline" disabled={loading} onClick={() => register(email)}>Register</Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Signed in as</span>
            <span className="font-medium">{user.email}</span>
            <Button size="sm" variant="outline" onClick={() => logout()}>Logout</Button>
          </div>
        )}
      </div>
      {children}
      {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
    </main>
  );
}
