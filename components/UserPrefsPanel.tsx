"use client";
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { useUserPrefsStore } from '@/store/useUserPrefsStore';

export function UserPrefsPanel() {
  const { pageSize, density, theme, setDensity, setPageSize, setTheme } = useUserPrefsStore();
  const [open, setOpen] = useState(false);
  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    const actual = theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
    root.classList.remove('light','dark');
    root.classList.add(actual);
  }, [theme]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Preferences</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>User Preferences</DialogTitle></DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="space-y-1">
            <label className="font-medium">Default Page Size</label>
            <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
              <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Page size" /></SelectTrigger>
              <SelectContent>{[10,25,50,100].map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="font-medium">Density</label>
            <Select value={density} onValueChange={v => setDensity(v as any)}>
              <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="font-medium">Theme</label>
            <Select value={theme} onValueChange={v => setTheme(v as any)}>
              <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
