'use client';

import { useScrapeStore } from '@/store/useScrapeStore';
import StartPageContent from '@/components/pages/Start';
import ProductTable from '@/components/pages/ProductTable';
import { AppShell } from '@/components/AppShell';

export default function HomePage() {
  const step = useScrapeStore((state) => state.step);

  const renderStep = () => {
    switch (step) {
      case 1:
  return <StartPageContent />;
      case 2:
  return <ProductTable />;
      default:
  return <StartPageContent />;
    }
  };

  return (
    <AppShell>
      {renderStep()}
    </AppShell>
  );
}
