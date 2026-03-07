
'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, CalendarIcon } from 'lucide-react';
import type { AppointmentData } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { appointmentSchema } from '@/lib/schemas';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { fr } from 'date-fns/locale';
import type { Assessment } from '@/types';

type AppointmentStepProps = {
  onNext: (data: AppointmentData) => void;
  onBack: () => void;
  data: Assessment;
  lang: 'en' | 'fr';
};

const content = {
    en: {
        dateLabel: "Preferred Pickup Date",
        datePlaceholder: "Pick a date",
        timeSlotLabel: "Preferred Time Slot",
        timeSlots: {
            AM: { label: "Morning", time_range: "08:00-12:00" },
            PM: { label: "Afternoon", time_range: "12:00-17:00" },
            EVENING: { label: "Evening", time_range: "17:00-20:00" },
        },
        backButton: "Back",
        nextButton: "Confirm Appointment",
    },
    fr: {
        dateLabel: "Date de cueillette préférée",
        datePlaceholder: "Choisissez une date",
        timeSlotLabel: "Plage horaire préférée",
        timeSlots: {
            AM: { label: "Matin", time_range: "08:00-12:00" },
            PM: { label: "Après-midi", time_range: "12:00-17:00" },
            EVENING: { label: "Soir", time_range: "17:00-20:00" },
        },
        backButton: "Retour",
        nextButton: "Confirmer le rendez-vous",
    }
}


export function AppointmentStep({ onNext, onBack, data, lang }: AppointmentStepProps) {
  const c = content[lang];
  const form = useForm<AppointmentData>({
    resolver: zodResolver(appointmentSchema(lang)),
    defaultValues: {
      pickupDate: data.towing?.pickupDate,
      pickupTimeSlot: data.towing?.pickupTimeSlot,
    },
     mode: "onChange"
  });
  
  const onSubmit = (values: AppointmentData) => {
    onNext(values);
  };

  const getLocale = () => {
    if (lang === 'fr') return fr;
    return undefined;
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-grow flex flex-col">
          
            <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="pickupDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{c.dateLabel}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? format(field.value, "PPP", { locale: getLocale() }) : <span>{c.datePlaceholder}</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                            initialFocus
                            locale={getLocale()}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                 <FormField
                    control={form.control}
                    name="pickupTimeSlot"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>{c.timeSlotLabel}</FormLabel>
                        <FormControl>
                          <RadioGroup 
                              onValueChange={field.onChange}
                              defaultValue={field.value} 
                              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                          >
                            {Object.entries(c.timeSlots).map(([key, {label, time_range}]) => (
                              <FormItem key={key} className="relative">
                                <FormControl>
                                  <RadioGroupItem value={key} className="sr-only" />
                                </FormControl>
                                <FormLabel className={cn(
                                    "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                    field.value === key && "border-primary"
                                )}>
                                    <p className="font-semibold">{label}</p>
                                    <p className="text-xs text-muted-foreground">{time_range}</p>
                                </FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
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
