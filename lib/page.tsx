'use client';

import { useScrapeStore } from '@/store/useScrapeStore';
import Step1InputForm from '@/components/steps/step1';
import Step2Review from '@/components/steps/step2';
import { AppShell } from '@/components/AppShell';

export default function HomePage() {
  const step = useScrapeStore((state) => state.step);

  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1InputForm />;
      case 2:
        return <Step2Review />;
      default:
        return <Step1InputForm />;
    }
  };

  return (
    <AppShell>
      {renderStep()}
    </AppShell>
  );
}
