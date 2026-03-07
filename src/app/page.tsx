import { CarWizard } from '@/components/car-wizard';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function Home() {
  const backgroundImage = PlaceHolderImages.find(img => img.id === 'wizard-background');

  return (
    <main
      className="flex-grow flex items-center justify-center p-4 md:p-6"
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage.imageUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Superposition pour améliorer la lisibilité du contenu */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
      
      {/* Contenu centré */}
      <div className="relative z-10 w-full">
        <CarWizard />
      </div>
    </main>
  );
}
