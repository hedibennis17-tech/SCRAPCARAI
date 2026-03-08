import { CarWizard } from '@/components/car-wizard';
import { ThemeSwitcher } from '@/components/theme-switcher';

export default function Home() {
  return (
    <main className="saas-bg flex-grow flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      <div className="orb orb-red" />
      <div className="orb orb-dark" />
      <div className="orb orb-accent" />
      <div className="grid-overlay" />
      <ThemeSwitcher />
      <div className="relative z-10 w-full max-w-[960px]">
        <CarWizard />
      </div>
    </main>
  );
}
