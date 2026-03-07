
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
    <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-card relative">
       <Link href="/admin" className="absolute top-4 right-4">
        <Button variant="ghost" size="icon" aria-label="Admin Login">
          <UserCog className="h-5 w-5" />
        </Button>
      </Link>
      
      <Logo size="large"/>

      <div className="space-y-4 mt-6">
        <h1 className="text-3xl font-bold font-headline">Welcome to CarScrap Wizard AI</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Obtenez une évaluation instantanée pour votre véhicule grâce à notre IA performante. Répondez à quelques questions simples.
        </p>
      </div>

      <div className="mt-10 flex flex-col sm:flex-row gap-4">
        <Button size="lg" onClick={() => onNext('en')}>
          Start Assessment
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        <Button size="lg" onClick={() => onNext('fr')} variant="outline">
          Démarrer l'évaluation
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
       <p className="text-xs text-muted-foreground mt-8">
        The standard evaluation takes about 1 minute. / L'évaluation prend environ 1 minute.
      </p>
    </div>
  );
}
