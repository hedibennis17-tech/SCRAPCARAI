
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { conditionWizard_schema, type ConditionWizardData } from '@/lib/schemas';
import type { Assessment } from '@/types';
import { ArrowLeft, ArrowRight, ImagePlus, X } from 'lucide-react';
import { Separator } from '../ui/separator';
import { ChangeEvent, useRef } from 'react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

type ConditionWizardStepProps = {
  onNext: (data: { condition: ConditionWizardData }) => void;
  onBack: () => void;
  data: Assessment;
  lang: 'en' | 'fr';
};

const majorParts = ["Catalyst", "Engine", "Transmission", "Battery", "Wheels", "AC"] as const;

const majorParts_fr = {
    Catalyst: "Catalyseur",
    Engine: "Moteur",
    Transmission: "Transmission",
    Battery: "Batterie",
    Wheels: "Roues",
    AC: "Climatisation"
}

const content = {
    en: {
        mechanicalTitle: "Mechanical Condition",
        runsLabel: "Does the car run?",
        runsDescription: "Can the vehicle start and drive?",
        missingPartsLabel: "Are any major parts missing?",
        missingPartsDescription: "Select all that apply.",
        accidentLabel: "Was the car in an accident?",
        mechanicalIssuesLabel: "Any mechanical issues?",
        mechanicalIssuesPlaceholder: "e.g., Engine makes a knocking sound, transmission slips...",
        describeMechanicalIssues: "Describe the mechanical issues",
        bodyTitle: "Body Condition",
        rustLabel: "Is there any rust?",
        describeRust: "Describe the rust",
        rustPlaceholder: "e.g., On the driver side door, under the car...",
        wheelTypeLabel: "Wheel Type",
        rimsLabel: "Rims",
        magsLabel: "Mags",
        bodyDamageLabel: "Any body damage?",
        describeBodyDamage: "Describe the body damage",
        bodyDamagePlaceholder: "e.g., Large dent on the passenger door, cracked bumper...",
        completeLabel: "Is the vehicle complete?",
        incompleteDetailsLabel: "What is missing?",
        incompleteDetailsPlaceholder: "e.g., Missing a side mirror, radio is gone...",
        photosTitle: "Vehicle Photos",
        photosDescription: "Upload up to 5 photos of your vehicle (max 20MB each).",
        addPhotosButton: "Add Photos",
        maxFilesError: "You can only upload a maximum of 5 photos.",
        fileTooLargeError: "File size exceeds 20MB.",
        backButton: "Back",
        nextButton: "Next",
    },
    fr: {
        mechanicalTitle: "État mécanique",
        runsLabel: "Est-ce que la voiture démarre ?",
        runsDescription: "Le véhicule peut-il démarrer et avancer ?",
        missingPartsLabel: "Des pièces majeures sont-elles manquantes ?",
        missingPartsDescription: "Sélectionnez tout ce qui s'applique.",
        accidentLabel: "La voiture a-t-elle été accidentée ?",
        mechanicalIssuesLabel: "Des problèmes mécaniques ?",
        mechanicalIssuesPlaceholder: "ex: Le moteur cogne, la transmission glisse...",
        describeMechanicalIssues: "Décrivez les problèmes mécaniques",
        bodyTitle: "État de la carrosserie",
        rustLabel: "Y a-t-il de la rouille ?",
        describeRust: "Décrivez la rouille",
        rustPlaceholder: "ex: Sur la porte conducteur, sous le châssis...",
        wheelTypeLabel: "Type de roues",
        rimsLabel: "Rims (Acier)",
        magsLabel: "Mags (Alliage)",
        bodyDamageLabel: "Des dommages à la carrosserie ?",
        describeBodyDamage: "Décrivez les dommages",
        bodyDamagePlaceholder: "ex: Grosse bosse porte passager, pare-chocs fissuré...",
        completeLabel: "Le véhicule est-il complet ?",
        incompleteDetailsLabel: "Que manque-t-il ?",
        incompleteDetailsPlaceholder: "ex: Miroir latéral manquant, radio enlevée...",
        photosTitle: "Photos du véhicule",
        photosDescription: "Téléchargez jusqu'à 5 photos (max 20 Mo chacune).",
        addPhotosButton: "Ajouter des photos",
        maxFilesError: "Vous ne pouvez télécharger que 5 photos au maximum.",
        fileTooLargeError: "Le fichier dépasse 20 Mo.",
        backButton: "Retour",
        nextButton: "Suivant",
    }
}


export function ConditionWizardStep({ onNext, onBack, data, lang }: ConditionWizardStepProps) {
  const c = content[lang];
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const form = useForm<ConditionWizardData>({
    resolver: zodResolver(conditionWizard_schema(lang)),
    defaultValues: data.condition || {
      runs: true,
      missingParts: [],
      accident: false,
      hasMechanicalIssues: false,
      mechanicalIssues: '',
      hasRust: false,
      rustDetails: '',
      wheelType: 'Rims',
      hasBodyDamage: false,
      bodyDamageDetails: '',
      isComplete: true,
      incompleteDetails: '',
      photos: [],
    },
     mode: "onChange",
  });

  const hasMechanicalIssues = form.watch('hasMechanicalIssues');
  const hasRust = form.watch('hasRust');
  const hasBodyDamage = form.watch('hasBodyDamage');
  const isComplete = form.watch('isComplete');
  const photos = form.watch('photos') || [];

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      const totalPhotos = photos.length + files.length;

      if (totalPhotos > 5) {
        toast({ variant: 'destructive', title: 'Error', description: c.maxFilesError });
        return;
      }
      
      files.forEach(file => {
        if (file.size > 20 * 1024 * 1024) { 
            toast({ variant: 'destructive', title: 'Error', description: c.fileTooLargeError });
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const newPhotos = [...(form.getValues('photos') || []), e.target?.result as string];
          form.setValue('photos', newPhotos, { shouldValidate: true });
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    form.setValue('photos', newPhotos, { shouldValidate: true });
  };
  
  const onSubmit = (values: ConditionWizardData) => {
    onNext({ condition: values });
  };

  const getPartLabel = (part: typeof majorParts[number]) => {
    if (lang === 'fr') return majorParts_fr[part];
    return part;
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-grow flex flex-col">
          
          <h4 className="text-lg font-semibold">{c.mechanicalTitle}</h4>

          <FormField
            control={form.control}
            name="runs"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">{c.runsLabel}</FormLabel>
                  <FormDescription>{c.runsDescription}</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <div>
            <FormLabel className="text-base">{c.missingPartsLabel}</FormLabel>
            <FormDescription className="text-sm text-muted-foreground mb-2">{c.missingPartsDescription}</FormDescription>
            <div className="space-y-2 rounded-lg border p-4">
              {majorParts.map(part => (
                <FormField
                  key={part}
                  control={form.control}
                  name="missingParts"
                  render={({ field }) => {
                    return (
                      <FormItem key={part} className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(part)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...(field.value || []), part])
                                : field.onChange(field.value?.filter(value => value !== part));
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">{getPartLabel(part)}</FormLabel>
                      </FormItem>
                    );
                  }}
                />
              ))}
            </div>
            <FormMessage />
          </div>

          <FormField
            control={form.control}
            name="accident"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">{c.accidentLabel}</FormLabel>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hasMechanicalIssues"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">{c.mechanicalIssuesLabel}</FormLabel>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          {hasMechanicalIssues && (
            <FormField
              control={form.control}
              name="mechanicalIssues"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{c.describeMechanicalIssues}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={c.mechanicalIssuesPlaceholder}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <Separator className="my-8" />
          <h4 className="text-lg font-semibold">{c.bodyTitle}</h4>

           <FormField
            control={form.control}
            name="hasRust"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">{c.rustLabel}</FormLabel>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          {hasRust && (
            <FormField
              control={form.control}
              name="rustDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{c.describeRust}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={c.rustPlaceholder}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="wheelType"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>{c.wheelTypeLabel}</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="Rims" />
                      </FormControl>
                      <FormLabel className="font-normal">{c.rimsLabel}</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="Mags" />
                      </FormControl>
                      <FormLabel className="font-normal">{c.magsLabel}</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

           <FormField
            control={form.control}
            name="hasBodyDamage"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">{c.bodyDamageLabel}</FormLabel>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          {hasBodyDamage && (
            <FormField
              control={form.control}
              name="bodyDamageDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{c.describeBodyDamage}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={c.bodyDamagePlaceholder}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="isComplete"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">{c.completeLabel}</FormLabel>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          {!isComplete && (
            <FormField
              control={form.control}
              name="incompleteDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{c.incompleteDetailsLabel}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={c.incompleteDetailsPlaceholder}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <Separator className="my-8" />
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">{c.photosTitle}</h4>
            <FormDescription>{c.photosDescription}</FormDescription>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
              {photos.map((photo, index) => (
                <div key={index} className="relative aspect-square">
                  <Image
                    src={photo}
                    alt={`Vehicle photo ${index + 1}`}
                    layout="fill"
                    className="rounded-md object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => removePhoto(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {photos.length < 5 && (
                <div 
                  className="aspect-square rounded-md border-2 border-dashed border-muted-foreground flex items-center justify-center cursor-pointer hover:bg-muted/50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <Input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="image/jpeg,image/png"
              className="hidden"
            />
          </div>
          
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
  );
}
