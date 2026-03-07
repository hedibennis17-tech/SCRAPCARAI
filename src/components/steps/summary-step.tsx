
'use client';

import { Button } from '@/components/ui/button';
import type { Assessment } from '@/types';
import { ArrowLeft, CheckCircle, Home } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';

type SummaryStepProps = {
  onNext: () => void;
  onBack: () => void;
  data: Assessment;
  lang: 'en' | 'fr';
};

const SummaryItem = ({ label, value }: { label: string; value?: string | number | boolean | null }) => (
    <div className="flex justify-between items-start py-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-right max-w-[60%]">
            {typeof value === 'boolean' ? 'Yes' : (value || 'N/A')}
        </p>
    </div>
)

const content = {
    en: {
        contactTitle: "Contact Information",
        nameLabel: "Name",
        emailLabel: "Email",
        phoneLabel: "Phone",
        addressLabel: "Address",
        vehicleTitle: "Vehicle Details",
        makeLabel: "Make",
        modelLabel: "Model",
        yearLabel: "Year",
        mileageLabel: "Mileage",
        transmissionLabel: "Transmission",
        drivelineLabel: "Driveline",
        vehicleTypeLabel: "Vehicle Type",
        vinLabel: "VIN",
        conditionTitle: "Vehicle Condition",
        runsLabel: "Does it run?",
        accidentLabel: "Accidented?",
        missingPartsLabel: "Missing Major Parts",
        mechanicalIssuesLabel: "Mechanical Issues?",
        mechanicalDetailsLabel: "Mechanical Details",
        rustLabel: "Has Rust?",
        rustDetailsLabel: "Rust Details",
        wheelTypeLabel: "Wheel Type",
        bodyDamageLabel: "Body Damage?",
        bodyDamageDetailsLabel: "Body Damage Details",
        completeLabel: "Is Complete?",
        incompleteDetailsLabel: "Incomplete Details",
        towingTitle: "Towing & Appointment",
        pickupLocationLabel: "Pickup Location",
        parkingSpotLabel: "Parking Spot",
        pickupDateLabel: "Pickup Date",
        timeSlotLabel: "Time Slot",
        assignedYardTitle: "Assigned Yard",
        yardLabel: "Yard",
        yardAddressLabel: "Address",
        yardPhoneLabel: "Phone",
        valuationTitle: "AI Valuation",
        offerPriceLabel: "Offer Price",
        backButton: "Back",
        confirmButton: "Confirm & Accept Offer",
        none: 'None',
        yes: 'Yes',
        no: 'No',
    },
    fr: {
        contactTitle: "Coordonnées",
        nameLabel: "Nom",
        emailLabel: "Courriel",
        phoneLabel: "Téléphone",
        addressLabel: "Adresse",
        vehicleTitle: "Détails du véhicule",
        makeLabel: "Marque",
        modelLabel: "Modèle",
        yearLabel: "Année",
        mileageLabel: "Kilométrage",
        transmissionLabel: "Transmission",
        drivelineLabel: "Traction",
        vehicleTypeLabel: "Type de véhicule",
        vinLabel: "NIV",
        conditionTitle: "État du véhicule",
        runsLabel: "Démarre ?",
        accidentLabel: "Accidenté ?",
        missingPartsLabel: "Pièces majeures manquantes",
        mechanicalIssuesLabel: "Problèmes mécaniques ?",
        mechanicalDetailsLabel: "Détails mécaniques",
        rustLabel: "Rouille ?",
        rustDetailsLabel: "Détails rouille",
        wheelTypeLabel: "Type de roues",
        bodyDamageLabel: "Dommages carrosserie ?",
        bodyDamageDetailsLabel: "Détails dommages",
        completeLabel: "Complet ?",
        incompleteDetailsLabel: "Détails si incomplet",
        towingTitle: "Cueillette et Rendez-vous",
        pickupLocationLabel: "Lieu de cueillette",
        parkingSpotLabel: "Emplacement stationnement",
        pickupDateLabel: "Date de cueillette",
        timeSlotLabel: "Plage horaire",
        assignedYardTitle: "Cour assignée",
        yardLabel: "Cour",
        yardAddressLabel: "Adresse",
        yardPhoneLabel: "Téléphone",
        valuationTitle: "Évaluation IA",
        offerPriceLabel: "Prix de l'offre",
        backButton: "Retour",
        confirmButton: "Confirmer et accepter l'offre",
        none: 'Aucune',
        yes: 'Oui',
        no: 'Non',
    }
}

export function SummaryStep({ onNext, onBack, data, lang }: SummaryStepProps) {
  const c = content[lang];
  const { client, vehicle, condition, towing, yard, valuation } = data;

  const fullConditionSummary = [
      data.mechanicalSummary?.summary,
      data.bodySummary?.summary
  ].filter(Boolean).join(' ');

  const pickupAddress = towing?.sameAddress === 'no' 
    ? `${towing.alternateAddress?.street}, ${towing.alternateAddress?.city}`
    : `${client?.address}, ${client?.city}`;
    
  const formatBoolean = (value: boolean | undefined) => {
    if(value === undefined) return 'N/A';
    return value ? c.yes : c.no;
  }

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex-grow space-y-4 overflow-y-auto pr-4 -mr-4">
        {client && 
        <Card>
            <CardHeader><CardTitle className="text-lg">{c.contactTitle}</CardTitle></CardHeader>
            <CardContent>
                <SummaryItem label={c.nameLabel} value={client.name} />
                <Separator />
                <SummaryItem label={c.emailLabel} value={client.email} />
                <Separator />
                <SummaryItem label={c.phoneLabel} value={client.phone} />
                <Separator />
                <SummaryItem label={c.addressLabel} value={`${client.address}, ${client.city}, ${client.province}, ${client.postalCode}`} />
            </CardContent>
        </Card>
        }
        {vehicle &&
        <Card>
            <CardHeader><CardTitle className="text-lg">{c.vehicleTitle}</CardTitle></CardHeader>
            <CardContent>
                <SummaryItem label={c.makeLabel} value={vehicle.make} />
                <Separator />
                <SummaryItem label={c.modelLabel} value={vehicle.model} />
                <Separator />
                <SummaryItem label={c.yearLabel} value={vehicle.year} />
                <Separator />
                <SummaryItem label={c.mileageLabel} value={vehicle.mileage ? `${vehicle.mileage.toLocaleString()} km` : 'N/A'} />
                <Separator />
                <SummaryItem label={c.transmissionLabel} value={vehicle.transmission} />
                 <Separator />
                <SummaryItem label={c.drivelineLabel} value={vehicle.driveline} />
                 <Separator />
                <SummaryItem label={c.vehicleTypeLabel} value={vehicle.vehicleType} />
                <Separator />
                <SummaryItem label={c.vinLabel} value={vehicle.vin} />
            </CardContent>
        </Card>
        }
        
        {condition && (
        <Card>
            <CardHeader><CardTitle className="text-lg">{c.conditionTitle}</CardTitle></CardHeader>
            <CardContent>
                <SummaryItem label={c.runsLabel} value={formatBoolean(condition.runs)} />
                <Separator />
                <SummaryItem label={c.accidentLabel} value={formatBoolean(condition.accident)} />
                <Separator />
                <SummaryItem label={c.missingPartsLabel} value={condition.missingParts && condition.missingParts.length > 0 ? condition.missingParts.join(', ') : c.none} />
                <Separator />
                <SummaryItem label={c.mechanicalIssuesLabel} value={formatBoolean(condition.hasMechanicalIssues)} />
                {condition.hasMechanicalIssues && (
                    <>
                    <Separator />
                    <SummaryItem label={c.mechanicalDetailsLabel} value={condition.mechanicalIssues} />
                    </>
                )}
                <Separator />
                <SummaryItem label={c.rustLabel} value={formatBoolean(condition.hasRust)} />
                {condition.hasRust && (
                    <>
                    <Separator />
                    <SummaryItem label={c.rustDetailsLabel} value={condition.rustDetails} />
                    </>
                )}
                <Separator />
                <SummaryItem label={c.wheelTypeLabel} value={condition.wheelType} />
                <Separator />
                <SummaryItem label={c.bodyDamageLabel} value={formatBoolean(condition.hasBodyDamage)} />
                {condition.hasBodyDamage && (
                    <>
                    <Separator />
                    <SummaryItem label={c.bodyDamageDetailsLabel} value={condition.bodyDamageDetails} />
                    </>
                )}
                 <Separator />
                <SummaryItem label={c.completeLabel} value={formatBoolean(condition.isComplete)} />
                {!condition.isComplete && (
                    <>
                    <Separator />
                    <SummaryItem label={c.incompleteDetailsLabel} value={condition.incompleteDetails} />
                    </>
                )}
            </CardContent>
        </Card>
        )}
        
        {towing && (
            <Card>
                <CardHeader><CardTitle className="text-lg">{c.towingTitle}</CardTitle></CardHeader>
                <CardContent>
                    <SummaryItem label={c.pickupLocationLabel} value={pickupAddress} />
                    <Separator />
                    <SummaryItem label={c.parkingSpotLabel} value={towing.parkingLocation} />
                    <Separator />
                    <SummaryItem label={c.pickupDateLabel} value={towing.pickupDate ? new Date(towing.pickupDate).toLocaleDateString(lang) : 'N/A'} />
                    <Separator />
                    <SummaryItem label={c.timeSlotLabel} value={towing.pickupTimeSlot} />
                </CardContent>
            </Card>
        )}

        {yard && yard.yard_name !== "Aucune fourrière trouvée" && (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Home className="h-5 w-5" />
                        {c.assignedYardTitle}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <SummaryItem label={c.yardLabel} value={yard.yard_name} />
                    <Separator />
                    <SummaryItem label={c.yardAddressLabel} value={yard.contact.address} />
                    <Separator />
                    <SummaryItem label={c.yardPhoneLabel} value={yard.contact.phone} />
                </CardContent>
            </Card>
        )}
        
        {valuation &&
        <Card>
            <CardHeader><CardTitle className="text-lg">{c.valuationTitle}</CardTitle></CardHeader>
            <CardContent>
                 <div className="flex justify-between items-center py-2">
                    <p className="text-lg text-muted-foreground">{c.offerPriceLabel}</p>
                    <p className="text-lg font-bold text-primary">
                        {valuation ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(valuation.finalPrice) : 'N/A'}
                    </p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{fullConditionSummary}</p>
            </CardContent>
        </Card>
        }

      </div>


      <div className="flex justify-between items-center pt-6 mt-auto">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {c.backButton}
        </Button>
        <Button type="button" onClick={onNext}>
          {c.confirmButton}
          <CheckCircle className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
