
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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { clientInfoSchema, type ClientInfoData } from '@/lib/schemas';
import type { Assessment } from '@/types';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { countries } from '@/lib/locations';
import { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '../ui/scroll-area';
import { GooglePlacesAutocomplete } from '@/components/ui/google-places-autocomplete';

type ClientInfoStepProps = {
  onNext: (data: ClientInfoData) => void;
  onBack: () => void;
  data: Assessment;
  lang: 'en' | 'fr';
};

const content = {
    en: {
        nameLabel: "Full Name",
        namePlaceholder: "e.g., Jane Doe",
        emailLabel: "Email Address",
        emailPlaceholder: "e.g., jane.doe@example.com",
        phoneLabel: "Phone Number",
        phonePlaceholder: "e.g., (555) 123-4567",
        addressLabel: "Address",
        addressPlaceholder: "Start typing your address...",
        cityLabel: "City",
        cityPlaceholder: "e.g. Montreal",
        postalCodeLabel: "Postal/ZIP Code",
        postalCodePlaceholder: "e.g. H1A 1A1 or 90210",
        countryLabel: "Country",
        countryPlaceholder: "Select a country",
        provinceLabel: "Province/State",
        provincePlaceholder: "Select a province/state",
        backButton: "Back",
        nextButton: "Next",
    },
    fr: {
        nameLabel: "Nom complet",
        namePlaceholder: "ex: Jean Tremblay",
        emailLabel: "Courriel",
        emailPlaceholder: "ex: jean.tremblay@exemple.com",
        phoneLabel: "Numéro de téléphone",
        phonePlaceholder: "ex: (514) 123-4567",
        addressLabel: "Adresse",
        addressPlaceholder: "Commencez à taper votre adresse...",
        cityLabel: "Ville",
        cityPlaceholder: "ex: Montréal",
        postalCodeLabel: "Code postal",
        postalCodePlaceholder: "ex: H1A 1A1 ou 90210",
        countryLabel: "Pays",
        countryPlaceholder: "Sélectionnez un pays",
        provinceLabel: "Province/État",
        provincePlaceholder: "Sélectionnez une province/un état",
        backButton: "Retour",
        nextButton: "Suivant",
    }
}

export function ClientInfoStep({ onNext, onBack, data, lang }: ClientInfoStepProps) {
  const c = content[lang];
  const form = useForm<ClientInfoData>({
    resolver: zodResolver(clientInfoSchema(lang)),
    defaultValues: data.client || {
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: 'CA',
      province: 'Quebec',
      postalCode: '',
    },
     mode: 'onChange',
  });

  const selectedCountryCode = form.watch('country');
  const [provinces, setProvinces] = useState<{name: string; code: string}[]>([]);

  useEffect(() => {
    const country = countries.find(c => c.code === selectedCountryCode);
    if (country) {
        setProvinces(country.provinces || country.states || []);
    }
  }, [selectedCountryCode]);

  const handleCountryChange = (value: string) => {
    form.setValue('country', value as 'CA' | 'US');
    form.setValue('province', '');
  };

  // Handle Google Places address selection — auto-fills city, province, country, postalCode
  const handleAddressSelect = useCallback((components: {
    streetNumber?: string;
    route?: string;
    city?: string;
    province?: string;
    country?: string;
    postalCode?: string;
    fullAddress?: string;
  }) => {
    if (components.city) {
      form.setValue('city', components.city, { shouldValidate: true });
    }
    if (components.postalCode) {
      form.setValue('postalCode', components.postalCode, { shouldValidate: true });
    }
    if (components.country) {
      const countryCode = components.country as 'CA' | 'US';
      form.setValue('country', countryCode, { shouldValidate: true });
      // Update provinces list
      const countryData = countries.find(c => c.code === countryCode);
      if (countryData) {
        const newProvinces = countryData.provinces || countryData.states || [];
        setProvinces(newProvinces);
        // Auto-fill province if found
        if (components.province) {
          const matchedProvince = newProvinces.find(
            p => p.name.toLowerCase() === components.province!.toLowerCase() ||
                 p.code.toLowerCase() === components.province!.toLowerCase()
          );
          if (matchedProvince) {
            form.setValue('province', matchedProvince.name, { shouldValidate: true });
          }
        }
      }
    }
  }, [form]);

  const onSubmit = (values: ClientInfoData) => {
    onNext(values);
  };
  
  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex-grow flex flex-col">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{c.nameLabel}</FormLabel>
                <FormControl>
                  <Input placeholder={c.namePlaceholder} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{c.emailLabel}</FormLabel>
                <FormControl>
                  <Input placeholder={c.emailPlaceholder} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{c.phoneLabel}</FormLabel>
                <FormControl>
                  <Input placeholder={c.phonePlaceholder} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Address field with Google Places Autocomplete */}
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{c.addressLabel}</FormLabel>
                <FormControl>
                  <GooglePlacesAutocomplete
                    value={field.value}
                    onChange={field.onChange}
                    onAddressSelect={handleAddressSelect}
                    placeholder={c.addressPlaceholder}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{c.countryLabel}</FormLabel>
                  <Select onValueChange={handleCountryChange} value={field.value}>
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
              name="province"
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
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{c.cityLabel}</FormLabel>
                  <FormControl>
                    <Input placeholder={c.cityPlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="postalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{c.postalCodeLabel}</FormLabel>
                  <FormControl>
                    <Input placeholder={c.postalCodePlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
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
