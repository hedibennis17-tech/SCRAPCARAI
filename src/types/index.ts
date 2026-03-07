
import { ClientInfoData, VehicleInfoData, ConditionWizardData, TowingData, AppointmentData } from '@/lib/schemas';
import type { Yard } from '@/lib/yards';
import type { Timestamp } from 'firebase/firestore';

export type ValuationResult = {
  finalPrice: number;
  breakdown: {
    metalValue: number;
    partsValue: number;
    classBonus: number;
    penalties: number;
    completeBonus: number;
  };
}

export type Assessment = {
  id?: string;
  createdAt?: Timestamp;
  client?: ClientInfoData;
  vehicle?: VehicleInfoData;
  condition?: ConditionWizardData;
  valuation?: ValuationResult;
  towing?: Partial<TowingData & AppointmentData>;
  yard?: Yard;
  summary?: {
    purchaseOrder: string,
    deliveryOrder: string
  },
  mechanicalSummary?: any,
  bodySummary?: any,
  status?: string,
};

export * from '@/lib/schemas';
