import { AppShell } from '@/components/AppShell';
import { ConfirmProvider } from '@/components/confirm-provider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConfirmProvider>
      <AppShell>{children}</AppShell>
    </ConfirmProvider>
  );
}

