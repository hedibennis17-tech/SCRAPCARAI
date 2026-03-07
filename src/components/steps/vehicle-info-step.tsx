
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { vehicleInfoSchema, type VehicleInfoData } from '@/lib/schemas';
import type { Assessment } from '@/types';
import { ArrowLeft, ArrowRight, Camera, Loader2 } from 'lucide-react';
import { marquesVehicules } from '@/lib/vehicles';
import { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '../ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { extractVinFromImage } from '@/ai/flows/extract-vin-flow';
import { useToast } from '@/hooks/use-toast';

type VehicleInfoStepProps = {
  onNext: (data: VehicleInfoData) => void;
  onBack: () => void;
  data: Assessment;
  lang: 'en' | 'fr';
};

const drivelineTypes = [
    "FWD (Front-Wheel Drive)",
    "RWD (Rear-Wheel Drive)",
    "AWD (All-Wheel Drive)",
    "4WD (Four-Wheel Drive)",
    "4x4 (Part-Time Four-Wheel Drive)",
    "Full-Time 4WD",
    "Part-Time 4WD",
    "Selectable AWD",
    "On-Demand AWD",
    "eAWD (Electric All-Wheel Drive)",
    "Hybrid AWD",
    "Plug-in Hybrid AWD",
    "RWD-based AWD",
    "FWD-based AWD"
];

const vehicleTypes = [
    "Berline / Sedan",
    "Hatchback",
    "Coupé",
    "Cabriolet / Convertible",
    "Break / Wagon",
    "Liftback / Fastback",
    "SUV (Sport Utility Vehicle)",
    "Crossover (CUV)",
    "Pick-up Truck",
    "Camionnette",
    "Minivan",
    "Van pleine grandeur",
    "Compacte",
    "Sous-compacte",
    "Microcar / City Car",
    "Roadster",
    "Muscle Car",
    "Voiture de sport / Sport Car",
    "Supercar",
    "Hybride",
    "Hybride rechargeable (PHEV)",
    "Électrique (EV)",
    "Hybride léger (MHEV)",
    "Berline de luxe",
    "SUV de luxe",
    "Crossover de luxe",
    "Camion léger (Light-Duty Truck)",
    "Camion moyen (Medium-Duty Truck)",
    "Camion lourd (Heavy-Duty Truck)",
    "Fourgonnette commerciale",
    "Utilitaire / Work Truck",
    "Coupé 4 portes / Gran Coupé",
    "Targa",
    "T-TOP",
    "Tout-terrain / Off-Road",
    "Véhicule militaire",
    "Véhicule commercial",
    "Véhicule de flotte",
    "Taxi / Police / Service",
    "Camping-car / RV (Recreational Vehicle)"
  ];

const content = {
    en: {
        makeLabel: "Make",
        makePlaceholder: "Select a make",
        modelLabel: "Model",
        modelPlaceholder: "Select a model",
        yearLabel: "Year",
        yearPlaceholder: "e.g., 2015",
        vinLabel: "VIN (Vehicle Identification Number)",
        vinDescription: "Optional, but helps for an accurate valuation.",
        vinPlaceholder: "Enter 17-character VIN",
        scanVinButton: "Scan VIN",
        scanVinDialogTitle: "Scan VIN from Camera",
        scanVinDialogDescription: "Position your vehicle's VIN in front of the camera and take a picture.",
        takePictureButton: "Take Picture",
        cancelButton: "Cancel",
        processingVin: "Processing...",
        vinScanSuccess: "VIN extracted successfully!",
        vinScanError: "Could not extract VIN. Please enter it manually.",
        mileageLabel: "Mileage (km)",
        mileagePlaceholder: "e.g., 150000",
        transmissionLabel: "Transmission",
        transmissionPlaceholder: "Select transmission type",
        drivelineLabel: "Driveline",
        drivelinePlaceholder: "Select driveline type",
        vehicleTypeLabel: "Vehicle Type",
        vehicleTypePlaceholder: "Select vehicle type",
        backButton: "Back",
        nextButton: "Next",
    },
    fr: {
        makeLabel: "Marque",
        makePlaceholder: "Sélectionnez une marque",
        modelLabel: "Modèle",
        modelPlaceholder: "Sélectionnez un modèle",
        yearLabel: "Année",
        yearPlaceholder: "ex: 2015",
        vinLabel: "NIV (Numéro d'identification du véhicule)",
        vinDescription: "Optionnel, mais aide à une évaluation précise.",
        vinPlaceholder: "Entrez le NIV de 17 caractères",
        scanVinButton: "Scanner le NIV",
        scanVinDialogTitle: "Scanner le NIV avec la caméra",
        scanVinDialogDescription: "Positionnez le NIV de votre véhicule devant la caméra et prenez une photo.",
        takePictureButton: "Prendre une photo",
        cancelButton: "Annuler",
        processingVin: "Traitement...",
        vinScanSuccess: "NIV extrait avec succès !",
        vinScanError: "Impossible d'extraire le NIV. Veuillez l'entrer manuellement.",
        mileageLabel: "Kilométrage (km)",
        mileagePlaceholder: "ex: 150000",
        transmissionLabel: "Transmission",
        transmissionPlaceholder: "Sélectionnez le type de transmission",
        drivelineLabel: "Traction",
        drivelinePlaceholder: "Sélectionnez le type de traction",
        vehicleTypeLabel: "Type de véhicule",
        vehicleTypePlaceholder: "Sélectionnez le type de véhicule",
        backButton: "Retour",
        nextButton: "Suivant",
    }
}

export default function VehicleInfoStep({ onNext, onBack, data, lang }: VehicleInfoStepProps) {
  const c = content[lang];
  const { toast } = useToast();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const form = useForm<VehicleInfoData>({
    resolver: zodResolver(vehicleInfoSchema(lang)),
    defaultValues: {
      make: data.vehicle?.make || '',
      model: data.vehicle?.model || '',
      year: data.vehicle?.year,
      vin: data.vehicle?.vin || '',
      mileage: data.vehicle?.mileage,
      transmission: data.vehicle?.transmission,
      driveline: data.vehicle?.driveline,
      vehicleType: data.vehicle?.vehicleType,
    },
    mode: 'onChange',
  });

  const selectedMake = form.watch('make');
  const [models, setModels] = useState<string[]>([]);

  useEffect(() => {
    if (selectedMake) {
      const brand = marquesVehicules.find(b => b.marque === selectedMake);
      setModels(brand ? brand.modeles : []);
    } else {
      setModels([]);
    }
  }, [selectedMake]);

  const handleMakeChange = (make: string) => {
    form.setValue('make', make, { shouldValidate: true });
    form.setValue('model', '', { shouldValidate: true }); 
  };

  const handleUsePicture = async () => {
    if (videoRef.current && canvasRef.current) {
        setIsProcessing(true);
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg');

        try {
            const result = await extractVinFromImage({ imageDataUri: dataUri });
            if (result.vin && result.vin.length === 17) {
                form.setValue('vin', result.vin, { shouldValidate: true });
                toast({ title: 'Succès', description: c.vinScanSuccess });
                setIsCameraOpen(false);
            } else {
                toast({ variant: 'destructive', title: 'Erreur', description: c.vinScanError });
            }
        } catch (error) {
            console.error('VIN extraction failed:', error);
            toast({ variant: 'destructive', title: 'Erreur', description: c.vinScanError });
        } finally {
            setIsProcessing(false);
            stopCamera();
        }
    }
  };

  const startCamera = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    } catch (err) {
        console.error("Error accessing camera:", err);
        toast({ variant: 'destructive', title: 'Erreur Caméra', description: 'Impossible d\'accéder à la caméra.' });
        setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (isCameraOpen) {
        startCamera();
    } else {
        stopCamera();
    }
    return stopCamera;
  }, [isCameraOpen]);

  const onSubmit = (values: VehicleInfoData) => {
    onNext(values);
  };
  
  return (
    <>
      <div className="h-full flex flex-col p-6 overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex-grow flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="make"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{c.makeLabel}</FormLabel>
                    <Select onValueChange={handleMakeChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={c.makePlaceholder} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <ScrollArea className="h-72">
                          {marquesVehicules.map(brand => (
                            <SelectItem key={brand.marque} value={brand.marque}>{brand.marque}</SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{c.modelLabel}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedMake}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={c.modelPlaceholder} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <ScrollArea className="h-72">
                          {models.map(model => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{c.yearLabel}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder={c.yearPlaceholder} {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mileage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{c.mileageLabel}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder={c.mileagePlaceholder} {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="vin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{c.vinLabel}</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input placeholder={c.vinPlaceholder} {...field} />
                    </FormControl>
                    <Button type="button" variant="outline" onClick={() => setIsCameraOpen(true)}>
                      <Camera className="mr-2 h-4 w-4" />
                      {c.scanVinButton}
                    </Button>
                  </div>
                  <FormDescription>{c.vinDescription}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="transmission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{c.transmissionLabel}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={c.transmissionPlaceholder} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Automatic">Automatique</SelectItem>
                        <SelectItem value="Manual">Manuelle</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="driveline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{c.drivelineLabel}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={c.drivelinePlaceholder} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <ScrollArea className="h-72">
                          {drivelineTypes.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
                control={form.control}
                name="vehicleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{c.vehicleTypeLabel}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={c.vehicleTypePlaceholder} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                         <ScrollArea className="h-72">
                            {vehicleTypes.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            
            <div className="flex justify-between items-center pt-6 mt-auto">
              <Button type="button" variant="outline" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {c.backButton}
              </Button>
              <Button type="submit">
                {c.nextButton}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>{c.scanVinDialogTitle}</DialogTitle>
            <DialogDescription>{c.scanVinDialogDescription}</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <video ref={videoRef} className="w-full h-auto rounded-md" autoPlay playsInline />
            <canvas ref={canvasRef} className="hidden" />
            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-md">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
                <p className="text-white mt-2">{c.processingVin}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCameraOpen(false)} disabled={isProcessing}>
              {c.cancelButton}
            </Button>
            <Button onClick={handleUsePicture} disabled={isProcessing}>
              <Camera className="mr-2 h-4 w-4" />
              {c.takePictureButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
