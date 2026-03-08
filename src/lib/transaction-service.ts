'use client';

import {
  doc,
  collection,
  setDoc,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';
import type { Assessment } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugEmail(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

// ─── Collection writers ───────────────────────────────────────────────────────

/** 1. transactions/{id} — source of truth for every module */
async function writeTransaction(db: Firestore, assessment: Assessment) {
  const id = assessment.id!;
  const { client, vehicle, valuation, towing, yard, summary, condition } = assessment;

  const pickupAddress =
    towing?.sameAddress === 'no' && towing.alternateAddress
      ? `${towing.alternateAddress.street}, ${towing.alternateAddress.city}`
      : `${client?.address ?? ''}, ${client?.city ?? ''}`;

  await setDoc(
    doc(db, 'transactions', id),
    {
      assessmentId: id,
      purchaseOrder: summary?.purchaseOrder ?? null,
      deliveryOrder: summary?.deliveryOrder ?? null,
      status: 'confirmed',

      // Client snapshot
      clientName:     client?.name     ?? null,
      clientEmail:    client?.email    ?? null,
      clientPhone:    client?.phone    ?? null,
      clientAddress:  `${client?.address ?? ''}, ${client?.city ?? ''}, ${client?.province ?? ''}`,

      // Vehicle snapshot
      vehicleYear:    vehicle?.year    ?? null,
      vehicleMake:    vehicle?.make    ?? null,
      vehicleModel:   vehicle?.model   ?? null,
      vehicleVin:     vehicle?.vin     ?? null,
      vehicleMileage: vehicle?.mileage ?? null,
      vehicleType:    vehicle?.vehicleType ?? null,

      // Financials
      finalPrice: valuation?.finalPrice ?? 0,
      priceBreakdown: valuation?.breakdown ?? null,

      // Pickup
      pickupAddress,
      pickupDate:     towing?.pickupDate     ?? null,
      pickupTimeSlot: towing?.pickupTimeSlot ?? null,

      // Yard
      yardName:    yard?.yard_name       ?? null,
      yardPhone:   yard?.contact.phone   ?? null,
      yardEmail:   yard?.contact.email   ?? null,
      yardAddress: yard?.contact.address ?? null,

      // Condition flags
      vehicleRuns:     condition?.runs     ?? null,
      vehicleAccident: condition?.accident ?? null,
      missingParts:    condition?.missingParts ?? [],
      photos:          condition?.photos   ?? [],

      createdAt:   serverTimestamp(),
      updatedAt:   serverTimestamp(),
    },
    { merge: true }
  );
}

/** 2. clients/{slug} — client profile, updated on every transaction */
async function writeClient(db: Firestore, assessment: Assessment) {
  const { client } = assessment;
  if (!client?.email) return;

  const slug = slugEmail(client.email);

  await setDoc(
    doc(db, 'clients', slug),
    {
      name:     client.name    ?? null,
      email:    client.email,
      phone:    client.phone   ?? null,
      address:  client.address ?? null,
      city:     client.city    ?? null,
      province: client.province ?? null,
      postalCode: (client as any).postalCode ?? null,

      lastAssessmentId: assessment.id ?? null,
      lastTransactionDate: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/** 3. vehicles/{id} — full vehicle record with condition & photos */
async function writeVehicle(db: Firestore, assessment: Assessment) {
  const id = assessment.id!;
  const { vehicle, condition, valuation, summary } = assessment;

  await setDoc(
    doc(db, 'vehicles', id),
    {
      assessmentId: id,
      purchaseOrder: summary?.purchaseOrder ?? null,

      year:         vehicle?.year         ?? null,
      make:         vehicle?.make         ?? null,
      model:        vehicle?.model        ?? null,
      vin:          vehicle?.vin          ?? null,
      mileage:      vehicle?.mileage      ?? null,
      transmission: vehicle?.transmission ?? null,
      driveline:    vehicle?.driveline    ?? null,
      vehicleType:  vehicle?.vehicleType  ?? null,

      // Condition
      runs:              condition?.runs         ?? null,
      accident:          condition?.accident     ?? null,
      missingParts:      condition?.missingParts ?? [],
      hasMechanicalIssues: condition?.hasMechanicalIssues ?? false,
      mechanicalIssues:  condition?.mechanicalIssues ?? null,
      hasRust:           condition?.hasRust       ?? false,
      rustDetails:       condition?.rustDetails   ?? null,
      wheelType:         condition?.wheelType     ?? null,
      hasBodyDamage:     condition?.hasBodyDamage ?? false,
      bodyDamageDetails: condition?.bodyDamageDetails ?? null,
      isComplete:        condition?.isComplete    ?? null,
      incompleteDetails: condition?.incompleteDetails ?? null,
      photos:            condition?.photos        ?? [],

      finalPrice: valuation?.finalPrice ?? 0,
      status: 'pending_pickup',

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/** 4. towing_dispatches/{id} — dispatch sheet for driver */
async function writeTowingDispatch(db: Firestore, assessment: Assessment) {
  const id = assessment.id!;
  const { client, vehicle, towing, yard, summary } = assessment;

  const pickupAddress =
    towing?.sameAddress === 'no' && towing.alternateAddress
      ? `${towing.alternateAddress.street}, ${towing.alternateAddress.city}`
      : `${client?.address ?? ''}, ${client?.city ?? ''}`;

  await setDoc(
    doc(db, 'towing_dispatches', id),
    {
      assessmentId:   id,
      purchaseOrder:  summary?.purchaseOrder ?? null,
      deliveryOrder:  summary?.deliveryOrder ?? null,

      // Client contact for driver
      clientName:  client?.name  ?? null,
      clientPhone: client?.phone ?? null,
      clientEmail: client?.email ?? null,

      // Vehicle for driver
      vehicleSummary: `${vehicle?.year ?? ''} ${vehicle?.make ?? ''} ${vehicle?.model ?? ''}`.trim(),
      vehicleVin:     vehicle?.vin ?? null,

      // Pickup details
      pickupAddress,
      pickupDate:     towing?.pickupDate     ?? null,
      pickupTimeSlot: towing?.pickupTimeSlot ?? null,
      parkingLocation: towing?.parkingLocation ?? null,

      // Vehicle state flags (important for driver)
      allWheels:  towing?.allWheels  ?? null,
      flatTires:  towing?.flatTires  ?? null,
      blocked:    towing?.blocked    ?? null,
      hasKeys:    towing?.hasKeys    ?? null,

      // Assigned yard
      yardName:    yard?.yard_name       ?? null,
      yardPhone:   yard?.contact.phone   ?? null,
      yardEmail:   yard?.contact.email   ?? null,
      yardAddress: yard?.contact.address ?? null,

      status: 'scheduled',
      driverNotes: null,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/** 5. reports_data/{id} — aggregation-ready snapshot for charts */
async function writeReportData(db: Firestore, assessment: Assessment) {
  const id = assessment.id!;
  const { client, vehicle, valuation, towing, yard } = assessment;

  const pickupDate = towing?.pickupDate
    ? new Date(towing.pickupDate)
    : null;

  await setDoc(
    doc(db, 'reports_data', id),
    {
      assessmentId: id,

      // Dimensions for charts
      province:    client?.province     ?? null,
      city:        client?.city         ?? null,
      vehicleMake: vehicle?.make        ?? null,
      vehicleYear: vehicle?.year        ?? null,
      yardName:    yard?.yard_name      ?? null,

      // Metrics
      finalPrice: valuation?.finalPrice ?? 0,
      metalValue: valuation?.breakdown?.metalValue ?? 0,
      partsValue: valuation?.breakdown?.partsValue ?? 0,

      // Date fields for time-series
      pickupMonth: pickupDate ? pickupDate.getMonth() + 1 : null,
      pickupYear:  pickupDate ? pickupDate.getFullYear()  : null,

      // Flags
      vehicleRuns:    assessment.condition?.runs ?? null,
      hadAccident:    assessment.condition?.accident ?? null,

      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Called once when the wizard reaches FinalStep.
 * Writes the complete assessment to all 5 Firestore collections in parallel.
 */
export async function finalizeTransaction(
  db: Firestore,
  assessment: Assessment
): Promise<{ success: boolean; error?: string }> {
  if (!assessment.id || !assessment.summary?.purchaseOrder) {
    return { success: false, error: 'Missing assessment ID or summary' };
  }

  try {
    await Promise.all([
      writeTransaction(db, assessment),
      writeClient(db, assessment),
      writeVehicle(db, assessment),
      writeTowingDispatch(db, assessment),
      writeReportData(db, assessment),
    ]);
    return { success: true };
  } catch (err: any) {
    console.error('❌ finalizeTransaction error:', err);
    return { success: false, error: err?.message ?? 'Unknown error' };
  }
}
