import React from 'react';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-24 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-7xl">
        {children}
      </div>
    </main>
  );
}
