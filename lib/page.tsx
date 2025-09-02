'use client';

import { useState } from 'react';
import { useScrapeState } from '@/hooks/useScrape';
import Step1InputForm from '@/components/steps/step1';
import Step2Review from '@/components/steps/step2';
import { AppShell } from '@/components/AppShell';

export default function HomePage() {
  const [step, setStep] = useState(1);

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
