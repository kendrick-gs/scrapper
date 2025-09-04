"use client";
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light'|'dark'|'system'>(() => {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem('app-theme') as any) || 'system';
  });
  useEffect(() => {
    const root = document.documentElement;
    const effective = theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark':'light') : theme;
    root.classList.remove('light','dark');
    root.classList.add(effective);
    localStorage.setItem('app-theme', theme);
  }, [theme]);
  return (
    <button
      type="button"
      onClick={() => setTheme(t => t === 'light' ? 'dark' : t === 'dark' ? 'system' : 'light')}
      className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-muted hover:bg-muted/80 text-muted-foreground"
      title={`Theme: ${theme}`}
    >
      {theme === 'dark' ? <Moon className="h-4 w-4" /> : theme === 'light' ? <Sun className="h-4 w-4" /> : <span className="text-[10px] font-medium">SYS</span>}
    </button>
  );
}
