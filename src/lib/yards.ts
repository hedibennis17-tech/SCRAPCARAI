import type { CarWizardData } from "@/types";

export interface Yard {
  cities: string[];
  postal_prefixes: string[];
  yard_name: string;
  contact: {
    phone: string;
    address: string;
    email: string;
  };
}

export interface YardsConfig {
  [province: string]: {
    [region: string]: Yard;
  };
}

const yardsConfig: YardsConfig = {
  "Quebec": {
    "Laval": {
      "cities": ["Laval", "Fabreville", "Chomedey", "Duvernay", "Ste-Dorothée", "Auteuil"],
      "postal_prefixes": ["H7W", "H7N", "H7S", "H7L", "H7M"],
      "yard_name": "Fourrière Laval",
      "contact": {
        "phone": "+1-450-555-2024",
        "address": "2350 Rue Industrielle, Laval, QC",
        "email": "contact@fourrierelaval.ca"
      }
    },
    "LaPrairie": {
      "cities": ["Châteauguay", "Candiac", "Delson", "La Prairie", "St-Constant", "Ste-Catherine"],
      "postal_prefixes": ["J5R", "J6J", "J6K", "J5B", "J5A"],
      "yard_name": "Fourrière Rive-Sud La Prairie",
      "contact": {
        "phone": "+1-450-555-3128",
        "address": "480 Rue Industrielle, La Prairie, QC",
        "email": "dispatch@fourrierelaprairie.ca"
      }
    },
    "Montréal": {
      "cities": ["Montréal", "Anjou", "Saint-Léonard", "Outremont", "Rosemont", "Plateau-Mont-Royal"],
      "postal_prefixes": ["H1S", "H1T", "H2V", "H2J", "H2K"],
      "yard_name": "Fourrière Montréal Est",
      "contact": {
        "phone": "+1-514-555-0024",
        "address": "120 Rue Hochelaga, Montréal, QC",
        "email": "dispatch@fourrieremontreal.ca"
      }
    },
    "Sherbrooke": {
      "cities": ["Sherbrooke", "Magog", "Ascot Corner", "Lennoxville"],
      "postal_prefixes": ["J1G", "J1H", "J1J", "J1K", "J1L"],
      "yard_name": "Fourrière Estrie Sherbrooke",
      "contact": {
        "phone": "+1-819-555-1189",
        "address": "750 Rue Industrielle, Sherbrooke, QC",
        "email": "info@fourriereestrie.ca"
      }
    },
    "Québec": {
      "cities": ["Québec", "Lévis", "Beauport", "Charlesbourg", "Ste-Foy"],
      "postal_prefixes": ["G1R", "G1S", "G1V", "G1W", "G6V"],
      "yard_name": "Fourrière Capitale Québec",
      "contact": {
        "phone": "+1-418-555-7420",
        "address": "1020 Rue des Méandres, Québec, QC",
        "email": "dispatch@fourrierequebec.ca"
      }
    }
  },
  "Ontario": {
    "Toronto": {
      "cities": ["Toronto", "Scarborough", "North York", "Etobicoke"],
      "postal_prefixes": ["M1B", "M1C", "M2N", "M3A", "M9V"],
      "yard_name": "Tow Yard Toronto",
      "contact": {
        "phone": "+1-416-555-4402",
        "address": "900 Industrial Dr, Toronto, ON",
        "email": "info@towyardtoronto.ca"
      }
    },
    "Ottawa": {
      "cities": ["Ottawa", "Gatineau", "Nepean", "Orleans"],
      "postal_prefixes": ["K1A", "K1C", "K2J", "J8Y"],
      "yard_name": "Tow Yard Ottawa-Gatineau",
      "contact": {
        "phone": "+1-613-555-7720",
        "address": "500 Industrial Blvd, Ottawa, ON",
        "email": "dispatch@towyardottawa.ca"
      }
    }
  }
};

const fallbackYard: Yard = {
  cities: [],
  postal_prefixes: [],
  yard_name: "Aucune fourrière trouvée",
  contact: {
    phone: "1-800-111-1111",
    address: "Please contact support",
    email: "support@carwizard.ai"
  }
};

export function getAssignedYard(data: CarWizardData): Yard {
  const { province, city, postalCode } = data;

  if (!province || (!city && !postalCode)) {
    return fallbackYard;
  }

  const provinceYards = yardsConfig[province as keyof typeof yardsConfig];
  if (!provinceYards) {
    return fallbackYard;
  }

  for (const region in provinceYards) {
    const yard = provinceYards[region];
    
    // Check by city
    if (city && yard.cities.some(c => c.toLowerCase() === city.toLowerCase())) {
      return yard;
    }
    
    // Check by postal code prefix
    if (postalCode && yard.postal_prefixes.some(prefix => postalCode.toUpperCase().startsWith(prefix))) {
      return yard;
    }
  }

  return fallbackYard;
}
