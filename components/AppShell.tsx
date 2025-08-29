'use client';
// kendrick-gs/scrapper/scrapper-a31e4028cc7f75eeeb406d17e6548fcd50443ca8/components/AppShell.tsx
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Moon, Sun, SunMoon } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, error, refresh, login, register, logout } = useAuthStore();
  const [email, setEmail] = useState('');
  // Initialize to a stable value to avoid hydration mismatch; detect real theme after mount
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    setMounted(true);
    // Detect saved or system theme only on client after mount
    try {
      const saved = localStorage.getItem('theme');
      let next: 'light' | 'dark' = 'light';
      if (saved === 'dark' || saved === 'light') next = saved;
      else if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) next = 'dark';
      setTheme(next);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  const pathname = usePathname();

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-white dark:bg-background">
      <div className="w-full max-w-[1440px] flex items-center justify-between mb-4">
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/app/start" className={pathname?.startsWith('/app/start') ? 'font-medium' : 'text-muted-foreground'}>Start</Link>
          {user && (
            <>
              <Link href="/app/console" className={pathname?.startsWith('/app/console') ? 'font-medium' : 'text-muted-foreground'}>Console</Link>
              <Link href="/app/stores" className={pathname?.startsWith('/app/stores') ? 'font-medium' : 'text-muted-foreground'}>Stores</Link>
              <Link href="/app/lists" className={pathname?.startsWith('/app/lists') ? 'font-medium' : 'text-muted-foreground'}>Lists</Link>
              <Link href="/app/presets" className={pathname?.startsWith('/app/presets') ? 'font-medium' : 'text-muted-foreground'}>Data Presets</Link>
            </>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <button
            aria-label="Toggle theme"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-transparent hover:bg-muted transition-colors"
            onClick={() => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))}
            title={mounted ? (theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode') : 'Toggle theme'}
          >
            {mounted ? (theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />) : <SunMoon className="h-4 w-4" />}
          </button>
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
      </div>
      {children}
      {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
    </main>
  );
}
