import { CarWizard } from '@/components/car-wizard';

export default function Home() {
  return (
    <main className="saas-bg flex-grow flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Orbes lumineux d'ambiance */}
      <div className="orb orb-red" />
      <div className="orb orb-dark" />
      <div className="orb orb-accent" />

      {/* Grille de fond */}
      <div className="grid-overlay" />

      {/* Contenu centré — max 960px */}
      <div className="relative z-10 w-full max-w-[960px]">
        <CarWizard />
      </div>
    </main>
  );
}
