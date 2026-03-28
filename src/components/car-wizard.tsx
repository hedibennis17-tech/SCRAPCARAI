
'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from '@/components/ui/logo';
import { Step, Stepper } from '@/components/ui/stepper';

import type { Assessment, ClientInfoData, VehicleInfoData, ConditionWizardData, TowingData, AppointmentData } from '@/types';
import { getAssignedYard } from '@/lib/yards';
import { useFirebase, setDocumentNonBlocking, initiateAnonymousSignIn } from '@/firebase';
import { doc, collection, serverTimestamp } from 'firebase/firestore';

import { WelcomeStep } from './steps/welcome-step';
import { ClientInfoStep } from './steps/client-info-step';
import VehicleInfoStep from './steps/vehicle-info-step';
import { ConditionWizardStep } from './steps/condition-wizard-step';
import { ValuationStep } from './steps/valuation-step';
import { SummaryStep } from './steps/summary-step';
import { TowingStep } from './steps/towing-step';
import { FinalStep } from './steps/final-step';
import { AppointmentStep } from './steps/appointment-step';
import { useToast } from '@/hooks/use-toast';

const steps_en = [
  { label: "Welcome", title: "Welcome", description: "Get a quick valuation for your vehicle with AI." },
  { label: "Vehicle Info", title: "Vehicle Information", description: "Please provide the details of your vehicle." },
  { label: "Condition", title: "Vehicle Condition", description: "Tell us about the mechanical and body condition of your car." },
  { label: "Valuation", title: "AI-Powered Valuation", description: "Here is our estimated offer for your vehicle." },
  { label: "Your Info", title: "Your Information", description: "Let's continue with some basic contact details." },
  { label: "Towing", title: "Towing Information", description: "Confirm pickup details." },
  { label: "Appointment", title: "Schedule Pickup", description: "Schedule a time and place for us to pick up your vehicle." },
  { label: "Summary", title: "Final Confirmation", description: "Please review all the information before confirming." },
  { label: "Validation", title: "Offer Accepted!", description: "Your vehicle assessment is complete." },
];

const steps_fr = [
    { label: "Bienvenue", title: "Bienvenue", description: "Obtenez une évaluation rapide de votre véhicule avec l'IA." },
    { label: "Véhicule", title: "Informations sur le véhicule", description: "Veuillez fournir les détails de votre véhicule." },
    { label: "État", title: "État du véhicule", description: "Dites-nous en plus sur l'état mécanique et esthétique." },
    { label: "Évaluation", title: "Évaluation par l'IA", description: "Voici notre offre estimée pour votre véhicule." },
    { label: "Vos infos", title: "Vos informations", description: "Continuons avec quelques détails de contact." },
    { label: "Remorquage", title: "Infos de remorquage", description: "Confirmez les détails de la cueillette." },
    { label: "Rendez-vous", title: "Planifier la cueillette", description: "Choisissez une heure et un lieu pour la cueillette." },
    { label: "Résumé", title: "Confirmation finale", description: "Veuillez réviser toutes les informations avant de confirmer." },
    { label: "Validation", title: "Offre acceptée !", description: "L'évaluation de votre véhicule est terminée." },
]

const generateSequenceNumber = () => {
    return Math.floor(Math.random() * 900) + 100;
}

const generateOrderNumber = (type: 'PO' | 'DO', yardId: string | undefined) => {
    const id = yardId || '47'; 
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const sequence = generateSequenceNumber();
    return `${type}-${id}-${year}-${month}-${sequence}`;
}

const isDataURI = (s: string) => typeof s === 'string' && s.startsWith('data:image');

// ── Upload a single data URI via the server-side proxy ───────────────────────
async function uploadSinglePhoto(photoDataUri: string, storagePath: string): Promise<string> {
    const base64Data = photoDataUri.split(',')[1];
    const mimeType = photoDataUri.split(';')[0].replace('data:', '') || 'image/jpeg';

    const res = await fetch('/api/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64: base64Data, path: storagePath, mimeType }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => 'unknown error');
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Upload failed');
    return json.url as string;
}

export function CarWizard() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Assessment>({});
  const [direction, setDirection] = useState(1);
  const [language, setLanguage] = useState<'en' | 'fr'>('en');
  const { toast } = useToast();
  const { firestore, auth, user, isUserLoading } = useFirebase();

  const steps = language === 'fr' ? steps_fr : steps_en;
  const TOTAL_STEPS = steps.length - 1;

  const handleNext = async (data: Partial<Assessment> = {}) => {
    setDirection(1);
    
    let updatedData: Assessment = { ...formData, ...data };

    if (updatedData.client?.city && !updatedData.yard) {
        const assignedYard = getAssignedYard(updatedData.client);
        updatedData.yard = assignedYard;
    }
    
    if (step === TOTAL_STEPS - 1) {
        const yardId = updatedData.yard?.yard_name.substring(0, 2).toUpperCase();
        const po = generateOrderNumber('PO', yardId);
        const doNum = generateOrderNumber('DO', yardId);
        const finalSummary = { purchaseOrder: po, deliveryOrder: doNum };
        updatedData.summary = finalSummary;
    }
    
    setFormData(updatedData);

    if (firestore && user) {
        const collectionPath = user.isAnonymous ? 'assessments' : `clients/${user.uid}/assessments`;
        const collectionRef = collection(firestore, collectionPath);
        
        let docId = updatedData.id;
        
        if (!docId) {
            const tempDocRef = doc(collectionRef);
            docId = tempDocRef.id;
            updatedData.id = docId;
            setFormData(prev => ({...prev, id: docId}));
        }

        // ── Upload photos via server-side proxy ──────────────────────────────
        // Always use assessments/ path (storage rules: write: if true)
        if (updatedData.condition?.photos && updatedData.condition.photos.length > 0) {
            const timestamp = Date.now();
            const photosToUpload = updatedData.condition.photos
                .map((photo, originalIndex) => ({ photo, originalIndex }))
                .filter(({ photo }) => isDataURI(photo));

            if (photosToUpload.length > 0) {
                const uploadResults: Array<{ originalIndex: number; url: string | null }> = 
                    await Promise.all(
                        photosToUpload.map(async ({ photo, originalIndex }, uploadIndex) => {
                            const photoId = `photo_${timestamp}_${uploadIndex}`;
                            const storagePath = `assessments/${docId}/${photoId}.jpg`;
                            try {
                                const url = await uploadSinglePhoto(photo, storagePath);
                                console.log(`[CarWizard] ✅ Photo ${uploadIndex + 1} uploaded → ${url.slice(0, 60)}…`);
                                return { originalIndex, url };
                            } catch (err: any) {
                                console.error(`[CarWizard] ❌ Photo ${uploadIndex + 1} upload failed:`, err.message);
                                // Keep the data URI as fallback so PDF still works
                                return { originalIndex, url: null };
                            }
                        })
                    );

                // Rebuild photos array: replace data URIs with Storage URLs where available
                const newPhotos = [...updatedData.condition.photos];
                let anyFailed = false;
                for (const { originalIndex, url } of uploadResults) {
                    if (url) {
                        newPhotos[originalIndex] = url;
                    } else {
                        anyFailed = true;
                        // Keep data URI as fallback — PDF will still embed it
                    }
                }

                updatedData.condition.photos = newPhotos;

                // Push updated photos back into React state
                setFormData(prev => ({
                    ...prev,
                    condition: { ...prev.condition, photos: newPhotos } as any,
                }));

                if (anyFailed) {
                    toast({
                        variant: "destructive",
                        title: language === 'fr' ? "Avertissement" : "Warning",
                        description: language === 'fr'
                            ? "Certaines photos n'ont pas pu être téléchargées sur le serveur, mais elles seront incluses dans le PDF."
                            : "Some photos could not be uploaded to storage, but they will still be included in the PDF.",
                    });
                }
            }
        }
        
        if (!user.isAnonymous && !updatedData.client?.id) {
            const clientDocRef = doc(firestore, 'clients', user.uid);
            const clientData = { email: user.email, lastUpdate: serverTimestamp() };
            setDocumentNonBlocking(clientDocRef, clientData, { merge: true });
            updatedData.client = { ...updatedData.client, id: user.uid };
        }

        const assessmentDocRef = doc(collectionRef, docId);
        const dataToSave = {
          ...updatedData,
          createdAt: updatedData.createdAt || serverTimestamp(),
          userId: user.uid,
        }
        setDocumentNonBlocking(assessmentDocRef, dataToSave, { merge: true });
        
    }

    setStep((prev) => Math.min(TOTAL_STEPS, prev + 1));
  };

  const handleBack = () => {
    setDirection(-1);
    setStep((prev) => Math.max(0, prev - 1));
  };

  const handleWelcomeNext = (lang: 'en' | 'fr') => {
    setLanguage(lang);
    if (auth && !user) {
      initiateAnonymousSignIn(auth);
    }
    setStep((prev) => prev + 1);
  }
  
  const restart = () => {
    setFormData({});
    setStep(0);
  }
  
  const handleAppointmentNext = (d: AppointmentData) => {
    const updatedTowingData = { ...formData.towing, ...d };
    handleNext({ towing: updatedTowingData });
  };

  const renderStep = () => {
    const commonProps = {
        onBack: handleBack,
        data: formData,
        lang: language,
    }

    switch (step) {
      case 0:
        return <WelcomeStep onNext={handleWelcomeNext} />;
      case 1:
        return <VehicleInfoStep onNext={(d: VehicleInfoData) => handleNext({ vehicle: d })} {...commonProps} />;
      case 2:
        return <ConditionWizardStep onNext={(d: { condition: ConditionWizardData }) => handleNext(d)} {...commonProps} />;
      case 3:
        return <ValuationStep onNext={(d) => handleNext(d)} onRestart={restart} {...commonProps} />;
      case 4:
         return <ClientInfoStep onNext={(d: ClientInfoData) => handleNext({ client: d })} {...commonProps} />;
      case 5:
        return <TowingStep onNext={(d: { towing: Partial<TowingData> }) => handleNext(d)} {...commonProps} />;
      case 6:
        return <AppointmentStep onNext={handleAppointmentNext} {...commonProps} />;
      case 7:
        return <SummaryStep onNext={() => handleNext()} {...commonProps} />;
      case 8:
        return <FinalStep onRestart={restart} data={formData} lang={language} />;
      default:
        return null;
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: '0%',
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
    }),
  };

  const currentStepInfo = steps[step];

  return (
     <Card className="w-full mx-auto overflow-hidden grid md:grid-cols-[1fr_200px]" style={{maxWidth:'960px', boxShadow:'0 0 0 1px rgba(169,38,54,0.15), 0 25px 60px rgba(0,0,0,0.6)'}}>
      <div className="flex flex-col">
        {step > 0 && (
          <div className="px-3 py-2 border-b flex items-center gap-3 min-h-[58px]">
            <Logo size="small" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-bold font-headline leading-tight truncate">{currentStepInfo.title}</h3>
              <p className="text-xs text-muted-foreground leading-tight line-clamp-1 mt-0.5">{currentStepInfo.description}</p>
            </div>
          </div>
        )}
        <CardContent className="p-0 flex-grow">
          <div className="relative h-[500px] sm:h-[550px] overflow-hidden">
              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: 'spring', stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                  className="absolute w-full h-full"
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>
          </div>
        </CardContent>
      </div>
      <div className="bg-secondary/50 border-l p-6 hidden md:block">
        <h3 className="font-headline text-lg mb-4">Steps</h3>
        <Stepper orientation="vertical" activeStep={step}>
          {steps_en.map((item, index) => (
            <Step key={item.label} label={item.label} />
          ))}
        </Stepper>
      </div>
    </Card>
  );
}
