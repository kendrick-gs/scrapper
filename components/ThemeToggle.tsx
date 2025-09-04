"use client";
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light'|'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem('app-theme');
    return stored === 'dark' ? 'dark' : 'light';
  });
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light','dark');
    root.classList.add(theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);
  return (
    <button
      type="button"
      onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
      className="group h-8 w-8 inline-flex items-center justify-center rounded-md border border-border bg-secondary/70 dark:bg-secondary/30 hover:bg-secondary/90 dark:hover:bg-secondary/50 transition-colors text-muted-foreground shadow-sm"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
