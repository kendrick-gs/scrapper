'use client';
// kendrick-gs/scrapper/scrapper-a31e4028cc7f75eeeb406d17e6548fcd50443ca8/components/AppShell.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Moon, Sun, SunMoon } from 'lucide-react';
import { CacheIndicator, CacheProvider } from '@/components/CacheIndicator';
import { PerformanceMonitor } from '@/components/PerformanceMonitor';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, error, refresh, login, register, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <CacheProvider>
      <main className="flex min-h-screen flex-col items-center p-2 sm:p-4 md:p-8 bg-white dark:bg-background">
        <div className="w-full max-w-[1440px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <nav className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm">
            <Link href="/app/start" className={pathname?.startsWith('/app/start') ? 'font-medium text-brand-green' : 'text-muted-foreground hover:text-foreground'}>Start</Link>
            {user && (
              <>
                <Link href="/app/console" className={pathname?.startsWith('/app/console') ? 'font-medium text-brand-green' : 'text-muted-foreground hover:text-foreground'}>Console</Link>
                <Link href="/app/stores" className={pathname?.startsWith('/app/stores') ? 'font-medium text-brand-green' : 'text-muted-foreground hover:text-foreground'}>Stores</Link>
                <Link href="/app/lists" className={pathname?.startsWith('/app/lists') ? 'font-medium text-brand-green' : 'text-muted-foreground hover:text-foreground'}>Lists</Link>
                <Link href="/app/presets" className={pathname?.startsWith('/app/presets') ? 'font-medium text-brand-green' : 'text-muted-foreground hover:text-foreground'}>Data Presets</Link>
              </>
            )}
          </nav>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
            <button
              aria-label="Toggle theme"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-transparent hover:bg-muted transition-colors self-end sm:self-auto"
              onClick={() => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))}
              title={mounted ? (theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode') : 'Toggle theme'}
            >
              {mounted ? (theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />) : <SunMoon className="h-4 w-4" />}
            </button>
            {!user ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <Input
                    type="email"
                    value={email}
                    placeholder="you@example.com"
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-9 w-full sm:w-64"
                  />
                  <Input
                    type="password"
                    value={password}
                    placeholder="Password"
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-9 w-full sm:w-64"
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button size="sm" disabled={loading} onClick={() => login(email, password)} className="flex-1 sm:flex-none">Login</Button>
                  <Button size="sm" variant="outline" disabled={loading} onClick={() => register(email, password)} className="flex-1 sm:flex-none">Register</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-sm w-full sm:w-auto">
                <CacheIndicator />
                <span className="text-muted-foreground">Signed in as</span>
                <span className="font-medium truncate">{user.email}</span>
                <Button size="sm" variant="outline" onClick={() => logout()}>Logout</Button>
              </div>
            )}
          </div>
        </div>
        {children}
        {error && <div className="text-red-500 text-sm mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-md">{error}</div>}
        <PerformanceMonitor />
      </main>
    </CacheProvider>
  );
}
