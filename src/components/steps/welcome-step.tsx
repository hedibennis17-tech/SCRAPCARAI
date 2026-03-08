
'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, UserCog } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '../ui/logo';

type WelcomeStepProps = {
  onNext: (lang: 'en' | 'fr') => void;
};

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center justify-start h-full pt-6 pb-4 px-6 text-center bg-card relative overflow-y-auto">
       <Link href="/admin" className="absolute top-4 right-4">
        <Button variant="ghost" size="icon" aria-label="Admin Login">
          <UserCog className="h-5 w-5" />
        </Button>
      </Link>

      {/* Logo — taille réduite sur mobile */}
      <div className="w-36 h-36 sm:w-48 sm:h-48 flex-shrink-0 mt-2">
        <img src="/logo.gif" alt="SCRAP CAR AI" className="w-full h-full object-contain" />
      </div>

      <div className="space-y-3 mt-4">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Welcome to CarScrap Wizard AI</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Obtenez une évaluation instantanée pour votre véhicule grâce à notre IA performante. Répondez à quelques questions simples.
        </p>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <Button size="lg" className="w-full sm:w-auto" onClick={() => onNext('en')}>
          Start Assessment
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        <Button size="lg" className="w-full sm:w-auto" onClick={() => onNext('fr')} variant="outline">
          Démarrer l'évaluation
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
