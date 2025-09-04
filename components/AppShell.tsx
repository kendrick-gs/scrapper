'use client';
// kendrick-gs/scrapper/scrapper-a31e4028cc7f75eeeb406d17e6548fcd50443ca8/components/AppShell.tsx
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { CacheIndicator } from '@/components/CacheIndicator';
import { ThemeToggle } from '@/components/ThemeToggle';
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

  const navLink = (href: string, label: string) => {
    const active = pathname?.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        className={
          active
            ? 'text-brand-green font-medium relative after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:bg-brand-green'
            : 'text-muted-foreground hover:text-foreground transition-colors'
        }
      >{label}</Link>
    );
  };

  return (
    <main className="flex min-h-screen flex-col bg-white dark:bg-background">
      <header className="w-full border-b bg-white/80 dark:bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto w-full max-w-[1440px] px-4 h-14 flex items-center gap-6">
          <div className="flex items-center gap-6 text-sm">
            {navLink('/app/start','Start')}
            {user && (
              <>
                {navLink('/app/console','Console')}
                {navLink('/app/stores','Stores')}
                {navLink('/app/lists','Lists')}
              </>
            )}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <CacheIndicator />
            {!user ? (
              <div className="flex items-center gap-2">
                <Input
                  type="email"
                  value={email}
                  placeholder="you@example.com"
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-8 w-56"
                />
                <Button size="sm" disabled={loading} onClick={() => login(email)}>Login</Button>
                <Button size="sm" variant="outline" disabled={loading} onClick={() => register(email)}>Register</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium truncate max-w-[160px]" title={user.email}>{user.email}</span>
                <Button size="sm" variant="outline" onClick={() => logout()}>Logout</Button>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="flex-1 px-4 md:px-8 py-6 flex flex-col items-center">{children}</div>
      {error && <div className="text-red-500 text-sm mt-2 px-4">{error}</div>}
    </main>
  );
}
