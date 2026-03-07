
import { z } from 'zod';
import { countries } from './locations';

const postalCodeRegexCA = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
const postalCodeRegexUS = /^\d{5}(-\d{4})?$/;

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
] as const;

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
] as const;

const canadianProvinces = countries.find(c => c.code === 'CA')?.provinces.map(p => p.name) || [];
const usStates = countries.find(c => c.code === 'US')?.states.map(s => s.name) || [];
const allProvincesAndStates = [...canadianProvinces, ...usStates] as [string, ...string[]];


const errorMessages = {
    en: {
        name: 'Name must be at least 2 characters.',
        email: 'Please enter a valid email address.',
        phone: 'Please enter a valid phone number.',
        address: 'Please enter a valid address.',
        city: 'Please enter a valid city.',
        postalCode: 'Please enter a valid postal code for the selected country.',
        country: 'Country is required',
        province: 'Province/State is required.',
        make: 'Make is required.',
        model: 'Model is required.',
        yearMin: 'Year must be after 1900.',
        yearMax: 'Year cannot be in the future.',
        vin: 'VIN must be 17 characters.',
        mileage: 'Mileage must be a positive number.',
        transmission: 'Transmission is required.',
        driveline: 'Driveline is required.',
        vehicleType: 'Vehicle type is required.',
        describeMechanicalIssues: 'Please describe the mechanical issues (min. 10 characters).',
        describeRust: 'Please describe the rust (min. 10 characters).',
        describeBodyDamage: 'Please describe the body damage (min. 10 characters).',
        describeIncomplete: 'Please describe what is missing (min. 10 characters).',
        parkingLocation: 'Please select a parking location.',
        streetRequired: 'Street is required',
        cityRequired: 'City is required',
        pickupDate: 'Please select a date.',
        pickupTimeSlot: 'Please select a time slot.',
    },
    fr: {
        name: 'Le nom doit comporter au moins 2 caractères.',
        email: 'Veuillez saisir une adresse courriel valide.',
        phone: 'Veuillez saisir un numéro de téléphone valide.',
        address: 'Veuillez saisir une adresse valide.',
        city: 'Veuillez saisir une ville valide.',
        postalCode: 'Veuillez saisir un code postal valide pour le pays sélectionné.',
        country: 'Le pays est requis.',
        province: 'La province/état est requis.',
        make: 'La marque est requise.',
        model: 'Le modèle est requis.',
        yearMin: 'L\'année doit être après 1900.',
        yearMax: 'L\'année ne peut pas être dans le futur.',
        vin: 'Le NIV doit comporter 17 caractères.',
        mileage: 'Le kilométrage doit être un nombre positif.',
        transmission: 'La transmission est requise.',
        driveline: 'La traction est requise.',
        vehicleType: 'Le type de véhicule est requis.',
        describeMechanicalIssues: 'Veuillez décrire les problèmes mécaniques (min. 10 caractères).',
        describeRust: 'Veuillez décrire la rouille (min. 10 caractères).',
        describeBodyDamage: 'Veuillez décrire les dommages (min. 10 caractères).',
        describeIncomplete: 'Veuillez décrire ce qui manque (min. 10 caractères).',
        parkingLocation: 'Veuillez sélectionner un lieu de stationnement.',
        streetRequired: 'La rue est requise',
        cityRequired: 'La ville est requise',
        pickupDate: 'Veuillez sélectionner une date.',
        pickupTimeSlot: 'Veuillez sélectionner une plage horaire.',
    }
};

export const clientInfoSchema = (lang: 'en' | 'fr' = 'en') => z.object({
  name: z.string().min(2, errorMessages[lang].name),
  email: z.string().email({ message: errorMessages[lang].email }),
  phone: z.string().min(10, errorMessages[lang].phone),
  address: z.string().min(3, errorMessages[lang].address),
  city: z.string().min(2, errorMessages[lang].city),
  postalCode: z.string(),
  country: z.enum(['CA', 'US'], { required_error: errorMessages[lang].country }),
  province: z.enum(allProvincesAndStates, { required_error: errorMessages[lang].province }),
}).superRefine((data, ctx) => {
    if (data.country === 'CA' && !postalCodeRegexCA.test(data.postalCode)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: errorMessages[lang].postalCode,
            path: ['postalCode'],
        });
    }
    if (data.country === 'US' && !postalCodeRegexUS.test(data.postalCode)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: errorMessages[lang].postalCode,
            path: ['postalCode'],
        });
    }
});


export const vehicleInfoSchema = (lang: 'en' | 'fr' = 'en') => z.object({
  make: z.string({ required_error: errorMessages[lang].make }).min(1, errorMessages[lang].make),
  model: z.string({ required_error: errorMessages[lang].model }).min(1, errorMessages[lang].model),
  year: z.coerce.number({invalid_type_error: "Year is required."})
    .min(1900, errorMessages[lang].yearMin)
    .max(new Date().getFullYear() + 1, errorMessages[lang].yearMax),
  vin: z.string().length(17, errorMessages[lang].vin).optional().or(z.literal('')),
  mileage: z.coerce.number({invalid_type_error: "Mileage is required"}).min(0, errorMessages[lang].mileage),
  transmission: z.enum(['Automatic', 'Manual'], { required_error: errorMessages[lang].transmission }),
  driveline: z.enum(drivelineTypes, { required_error: errorMessages[lang].driveline }),
  vehicleType: z.enum(vehicleTypes, { required_error: errorMessages[lang].vehicleType }),
});


const majorParts = z.enum(["Catalyst", "Engine", "Transmission", "Battery", "Wheels", "AC"]);

export const baseConditionWizardSchema = z.object({
  runs: z.boolean().default(true),
  missingParts: z.array(majorParts).optional(),
  accident: z.boolean().default(false),
  hasMechanicalIssues: z.boolean().default(false),
  mechanicalIssues: z.string().optional(),
  hasRust: z.boolean().default(false),
  rustDetails: z.string().optional(),
  wheelType: z.enum(['Rims', 'Mags']).default('Rims'),
  hasBodyDamage: z.boolean().default(false),
  bodyDamageDetails: z.string().optional(),
  isComplete: z.boolean().default(true),
  incompleteDetails: z.string().optional(),
  photos: z.array(z.string()).optional(),
});

export const conditionWizard_schema = (lang: 'en' | 'fr' = 'en') => baseConditionWizardSchema.superRefine((data, ctx) => {
  if (data.hasMechanicalIssues && (!data.mechanicalIssues || data.mechanicalIssues.length < 10)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: errorMessages[lang].describeMechanicalIssues,
      path: ["mechanicalIssues"],
    });
  }
   if (data.hasRust && (!data.rustDetails || data.rustDetails.length < 10)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: errorMessages[lang].describeRust,
      path: ["rustDetails"],
    });
  }
   if (data.hasBodyDamage && (!data.bodyDamageDetails || data.bodyDamageDetails.length < 10)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: errorMessages[lang].describeBodyDamage,
      path: ["bodyDamageDetails"],
    });
  }
  if (data.isComplete === false && (!data.incompleteDetails || data.incompleteDetails.length < 10)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: errorMessages[lang].describeIncomplete,
      path: ["incompleteDetails"],
    });
  }
});


const alternateAddressSchema = (lang: 'en' | 'fr' = 'en') => z.object({
    street: z.string().min(1, errorMessages[lang].streetRequired),
    city: z.string().min(1, errorMessages[lang].cityRequired),
    country: z.enum(['CA', 'US'], { required_error: errorMessages[lang].country }),
    province: z.enum(allProvincesAndStates),
    postalCode: z.string(),
}).superRefine((data, ctx) => {
    if (data.country === 'CA' && !postalCodeRegexCA.test(data.postalCode)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: errorMessages[lang].postalCode,
            path: ['postalCode'],
        });
    }
    if (data.country === 'US' && !postalCodeRegexUS.test(data.postalCode)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: errorMessages[lang].postalCode,
            path: ['postalCode'],
        });
    }
});


const baseTowingSchema = (lang: 'en' | 'fr' = 'en') => z.object({
  parkingLocation: z.string({required_error: errorMessages[lang].parkingLocation}).min(1, errorMessages[lang].parkingLocation),
  allWheels: z.boolean(),
  flatTires: z.boolean(),
  blocked: z.boolean(),
  hasKeys: z.boolean(),
});

export const towingDetailsSchema = (lang: 'en' | 'fr' = 'en') => z.discriminatedUnion("sameAddress", [
  z.object({
    sameAddress: z.literal("yes"),
  }).merge(baseTowingSchema(lang)),
  z.object({
    sameAddress: z.literal("no"),
    alternateAddress: alternateAddressSchema(lang),
  }).merge(baseTowingSchema(lang)),
]);


export const appointmentSchema = (lang: 'en' | 'fr' = 'en') => z.object({
  pickupDate: z.date({ required_error: errorMessages[lang].pickupDate }),
  pickupTimeSlot: z.enum(['AM', 'PM', 'EVENING'], { required_error: errorMessages[lang].pickupTimeSlot }),
});

export type ClientInfoData = z.infer<ReturnType<typeof clientInfoSchema>>;
export type VehicleInfoData = z.infer<ReturnType<typeof vehicleInfoSchema>>;
export type ConditionWizardData = z.infer<typeof baseConditionWizardSchema>;
export type TowingDetailsData = z.infer<ReturnType<typeof towingDetailsSchema>>;
export type AppointmentData = z.infer<ReturnType<typeof appointmentSchema>>;
export type TowingData = TowingDetailsData & AppointmentData;
