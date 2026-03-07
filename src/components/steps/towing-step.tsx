
'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Home } from 'lucide-react';
import type { Assessment } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '../ui/form';
import { Input } from '../ui/input';
import { towingDetailsSchema, type TowingDetailsData } from '@/lib/schemas';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { countries } from '@/lib/locations';
import { useState, useEffect } from 'react';
import { ScrollArea } from '../ui/scroll-area';

type TowingStepProps = {
  onNext: (data: { towing: TowingDetailsData }) => void;
  onBack: () => void;
  data: Assessment;
  lang: 'en' | 'fr';
};

const content = {
    en: {
        assignedYard: "Assigned Yard",
        assignedYardDesc: "Your vehicle will be assigned to our <strong>{yard_name}</strong> location.",
        sameAddressLabel: "Is the car parked at the address you provided ({address})?",
        yes: "Yes",
        no: "No",
        alternateAddressTitle: "Alternate Address",
        streetLabel: "Street",
        streetPlaceholder: "123 Other St",
        cityLabel: "City",
        cityPlaceholder: "e.g. Laval",
        postalCodeLabel: "Postal/ZIP Code",
        postalCodePlaceholder: "H7L 1A1 or 90210",
        countryLabel: "Country",
        countryPlaceholder: "Select a country",
        provinceLabel: "Province/State",
        provincePlaceholder: "Select a province/state",
        parkingLocationLabel: "Where is the vehicle parked?",
        parkingLocationPlaceholder: "Select a parking location",
        parkingLocations: [ "In the street", "Driveway (entrance)", "Private parking", "Garage", "Public parking", "Other" ],
        accessibilityLabel: "Vehicle Accessibility",
        allWheelsLabel: "Are all wheels on the car?",
        flatTiresLabel: "Any flat tires?",
        blockedLabel: "Is access to the car blocked?",
        keysLabel: "Do you have the keys?",
        backButton: "Back",
        nextButton: "Next",
    },
    fr: {
        assignedYard: "Cour assignée",
        assignedYardDesc: "Votre véhicule sera assigné à notre cour de <strong>{yard_name}</strong>.",
        sameAddressLabel: "La voiture est-elle stationnée à l'adresse fournie ({address}) ?",
        yes: "Oui",
        no: "Non",
        alternateAddressTitle: "Adresse alternative",
        streetLabel: "Rue",
        streetPlaceholder: "ex: 123 rue Autre",
        cityLabel: "Ville",
        cityPlaceholder: "ex: Laval",
        postalCodeLabel: "Code postal",
        postalCodePlaceholder: "H7L 1A1 ou 90210",
        countryLabel: "Pays",
        countryPlaceholder: "Sélectionnez un pays",
        provinceLabel: "Province/État",
        provincePlaceholder: "Sélectionnez une province/un état",
        parkingLocationLabel: "Où se trouve le véhicule ?",
        parkingLocationPlaceholder: "Sélectionnez l'emplacement",
        parkingLocations: [ "Dans la rue", "Entrée (Driveway)", "Stationnement privé", "Garage", "Stationnement public", "Autre" ],
        accessibilityLabel: "Accessibilité du véhicule",
        allWheelsLabel: "Toutes les roues sont-elles sur la voiture ?",
        flatTiresLabel: "Des pneus crevés ?",
        blockedLabel: "L'accès à la voiture est-il bloqué ?",
        keysLabel: "Avez-vous les clés ?",
        backButton: "Retour",
        nextButton: "Suivant",
    }
}

export function TowingStep({ onNext, onBack, data, lang }: TowingStepProps) {
  const c = content[lang];
  const form = useForm<TowingDetailsData>({
    resolver: zodResolver(towingDetailsSchema(lang)),
    defaultValues: data.towing || {
      sameAddress: 'yes',
      alternateAddress: { street: '', city: '', country: data.client?.country || 'CA', province: data.client?.province || 'Quebec', postalCode: ''},
      parkingLocation: undefined,
      allWheels: true,
      flatTires: false,
      blocked: false,
      hasKeys: true,
    },
     mode: "onChange"
  });
  
  const onSubmit = (values: TowingDetailsData) => {
    onNext({ towing: values });
  };

  const sameAddress = form.watch('sameAddress');
  const selectedCountryCode = form.watch('alternateAddress.country');
  const [provinces, setProvinces] = useState<{name: string; code: string}[]>([]);

  useEffect(() => {
    if (sameAddress === 'no') {
      const country = countries.find(c => c.code === selectedCountryCode);
      if (country) {
          setProvinces(country.provinces || country.states || []);
      }
    }
  }, [selectedCountryCode, sameAddress]);

  const handleCountryChange = (value: string) => {
    form.setValue('alternateAddress.country', value as 'CA' | 'US');
    form.setValue('alternateAddress.province', '');
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      {data.yard && data.yard.yard_name !== "Aucune fourrière trouvée" && (
        <Alert className="mb-6">
          <Home className="h-4 w-4" />
          <AlertTitle>{c.assignedYard}</AlertTitle>
          <AlertDescription dangerouslySetInnerHTML={{ __html: c.assignedYardDesc.replace('{yard_name}', data.yard.yard_name) }} />
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-grow flex flex-col">
          
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="sameAddress"
                render={({ field }) => (
                  <FormItem className="space-y-3 rounded-lg border p-4">
                    <FormLabel>{c.sameAddressLabel.replace('{address}', data.client?.address || '')}</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value="yes" /></FormControl>
                          <FormLabel className="font-normal">{c.yes}</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value="no" /></FormControl>
                          <FormLabel className="font-normal">{c.no}</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {sameAddress === 'no' && (
                <div className="space-y-4 rounded-lg border p-4">
                    <h4 className="font-medium">{c.alternateAddressTitle}</h4>
                    <FormField control={form.control} name="alternateAddress.street" render={({ field }) => ( <FormItem><FormLabel>{c.streetLabel}</FormLabel><FormControl><Input placeholder={c.streetPlaceholder} {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="alternateAddress.country"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>{c.countryLabel}</FormLabel>
                                <Select onValueChange={handleCountryChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder={c.countryPlaceholder} /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {countries.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="alternateAddress.province"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>{c.provinceLabel}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCountryCode}>
                                <FormControl>
                                    <SelectTrigger><SelectValue placeholder={c.provincePlaceholder} /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <ScrollArea className="h-72">
                                        {provinces.map(p => <SelectItem key={p.code} value={p.name}>{p.name}</SelectItem>)}
                                    </ScrollArea>
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="alternateAddress.city" render={({ field }) => ( <FormItem><FormLabel>{c.cityLabel}</FormLabel><FormControl><Input placeholder={c.cityPlaceholder} {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="alternateAddress.postalCode" render={({ field }) => ( <FormItem><FormLabel>{c.postalCodeLabel}</FormLabel><FormControl><Input placeholder={c.postalCodePlaceholder} {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                </div>
              )}
              
              <FormField
                control={form.control}
                name="parkingLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{c.parkingLocationLabel}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={c.parkingLocationPlaceholder} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {c.parkingLocations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-3 rounded-lg border p-4">
                 <FormLabel>{c.accessibilityLabel}</FormLabel>
                 <FormField control={form.control} name="allWheels" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between"><FormDescription>{c.allWheelsLabel}</FormDescription><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
                 <Separator/>
                 <FormField control={form.control} name="flatTires" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between"><FormDescription>{c.flatTiresLabel}</FormDescription><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
                 <Separator/>
                 <FormField control={form.control} name="blocked" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between"><FormDescription>{c.blockedLabel}</FormDescription><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
              </div>

              <FormField
                control={form.control}
                name="hasKeys"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>{c.keysLabel}</FormLabel>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )}
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
