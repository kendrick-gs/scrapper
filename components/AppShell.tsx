// kendrick-gs/scrapper/scrapper-a31e4028cc7f75eeeb406d17e6548fcd50443ca8/components/AppShell.tsx
import React from 'react';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-white dark:bg-background">
      {/* The children (your page content) will now control their own width */}
      {children}
    </main>
  );
}