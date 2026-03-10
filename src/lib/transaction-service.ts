'use client';

import {
  doc, collection, setDoc, serverTimestamp, Firestore,
} from 'firebase/firestore';
import { Auth, signInAnonymously } from 'firebase/auth';
import type { Assessment } from '@/types';
import { getOrCreateLocalUid } from './local-uid';

// ── Ensure authenticated user ─────────────────────────────────────────────────
// Tries Firebase anonymous auth first.
// If disabled/unavailable, falls back to a local session UID silently.
async function ensureAuth(auth: Auth): Promise<string> {
  if (auth.currentUser) return auth.currentUser.uid;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user.uid;
  } catch {
    // Anonymous auth disabled — use local UID (no console noise)
    return getOrCreateLocalUid();
  }
}

function getPickupAddress(a: Assessment): string {
  const { client, towing } = a;
  const alt = (towing as any)?.alternateAddress;
  if (towing?.sameAddress === 'no' && alt?.street) {
    return `${alt.street}, ${alt.city ?? ''}`.trim();
  }
  return `${client?.address ?? ''}, ${client?.city ?? ''}`.trim();
}

// ── Write to assessments ─────────────────────────────────────────────────────
async function writeAssessment(db: Firestore, uid: string, a: Assessment) {
  await setDoc(doc(db, 'assessments', a.id!), {
    id: a.id,
    userId: uid,
    status: 'confirmed',
    client: a.client ?? null,
    vehicle: a.vehicle ?? null,
    condition: a.condition ?? null,
    valuation: a.valuation ?? null,
    towing: a.towing ?? null,
    yard: a.yard ?? null,
    summary: a.summary ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ── Write to transactions ────────────────────────────────────────────────────
async function writeTransaction(db: Firestore, a: Assessment) {
  await setDoc(doc(db, 'transactions', a.id!), {
    assessmentId: a.id,
    // PO/DO — used by Dossiers page
    purchaseOrder: a.summary?.purchaseOrder ?? null,
    deliveryOrder: a.summary?.deliveryOrder ?? null,
    status: 'confirmed',
    // Client — used by Dossiers page
    clientName:    a.client?.name    ?? null,
    clientEmail:   a.client?.email   ?? null,
    clientPhone:   a.client?.phone   ?? null,
    clientAddress: `${a.client?.address ?? ''}, ${a.client?.city ?? ''}, ${a.client?.province ?? ''}`,
    // Vehicle — used by Dossiers page (reads vehicleYear/Make/Model/Vin/Mileage)
    vehicleYear:    a.vehicle?.year         ?? null,
    vehicleMake:    a.vehicle?.make         ?? null,
    vehicleModel:   a.vehicle?.model        ?? null,
    vehiclePlate:   a.vehicle?.licensePlate ?? null,
    vehicleVin:     a.vehicle?.vin          ?? null,
    vehicleMileage: a.vehicle?.mileage      ?? null,
    // Offer — Dossiers page reads `finalPrice`, also store as offerAmount
    finalPrice:  a.valuation?.finalPrice ?? null,
    offerAmount: a.valuation?.finalPrice ?? null,
    towingDistance: (a.towing as any)?.towingDistance ?? null,
    towingDuration: (a.towing as any)?.towingDuration ?? null,
    createdAt: serverTimestamp(),
  }, { merge: true });
}

// ── Write to clients ─────────────────────────────────────────────────────────
async function writeClient(db: Firestore, uid: string, a: Assessment) {
  const clientId = a.client?.email?.replace(/[^a-zA-Z0-9]/g, '_') ?? a.id!;
  await setDoc(doc(db, 'clients', clientId), {
    userId: uid,
    name: a.client?.name ?? null,
    email: a.client?.email ?? null,
    phone: a.client?.phone ?? null,
    address: a.client?.address ?? null,
    city: a.client?.city ?? null,
    province: a.client?.province ?? null,
    postalCode: a.client?.postalCode ?? null,
    country: a.client?.country ?? null,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ── Write to vehicles ────────────────────────────────────────────────────────
async function writeVehicle(db: Firestore, a: Assessment) {
  // Always build a non-empty, valid Firestore document ID
  // Priority: VIN → assessmentId → timestamp fallback
  const rawVin = a.vehicle?.vin?.trim();
  const vehicleId = (rawVin && rawVin.length > 0)
    ? rawVin.replace(/[^a-zA-Z0-9_-]/g, '_')   // sanitize special chars
    : (a.id && a.id.length > 0)
      ? a.id
      : `veh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  await setDoc(doc(db, 'vehicles', vehicleId), {
    assessmentId:  a.id   ?? null,
    // Vehicle info — shown in Véhicules admin page
    year:          a.vehicle?.year         ?? null,
    make:          a.vehicle?.make         ?? null,
    model:         a.vehicle?.model        ?? null,
    trim:          a.vehicle?.trim         ?? null,
    vin:           a.vehicle?.vin          ?? null,
    mileage:       a.vehicle?.mileage      ?? null,
    licensePlate:  a.vehicle?.licensePlate ?? null,
    transmission:  a.vehicle?.transmission ?? null,
    vehicleType:   a.vehicle?.vehicleType  ?? null,
    // Client info — shown in Véhicules admin page (CLIENT column)
    clientName:    a.client?.name          ?? null,
    clientEmail:   a.client?.email         ?? null,
    clientPhone:   a.client?.phone         ?? null,
    // Offer — Véhicules admin reads `offeredPrice`, Dossiers reads `finalPrice`
    offeredPrice:  a.valuation?.finalPrice ?? null,
    finalPrice:    a.valuation?.finalPrice ?? null,
    // PO/DO reference
    purchaseOrder: a.summary?.purchaseOrder ?? null,
    deliveryOrder: a.summary?.deliveryOrder ?? null,
    // Condition
    condition:     a.condition ?? null,
    missingParts:  a.condition?.missingParts ?? null,
    createdAt: serverTimestamp(),
  }, { merge: true });
}

// ── Write to towing_dispatches ───────────────────────────────────────────────
async function writeTowing(db: Firestore, uid: string, a: Assessment) {
  const pickupAddress = getPickupAddress(a);
  const rawDate = (a.towing as any)?.pickupDate ?? null;

  // Normalize pickupDate to a plain ISO string so admin pages can parse it
  let pickupDate: string | null = null;
  if (rawDate) {
    if (typeof rawDate === 'string') pickupDate = rawDate;
    else if (rawDate?.seconds) pickupDate = new Date(rawDate.seconds * 1000).toISOString();
    else if (rawDate instanceof Date) pickupDate = rawDate.toISOString();
  }

  await setDoc(doc(db, 'towing_dispatches', a.id!), {
    assessmentId: a.id,
    userId: uid,
    status: 'pending',
    // Client
    clientName:  a.client?.name  ?? null,
    clientPhone: a.client?.phone ?? null,
    // PO — shown in towing dispatch table
    purchaseOrder: a.summary?.purchaseOrder ?? null,
    deliveryOrder: a.summary?.deliveryOrder ?? null,
    // Vehicle — towing page reads `vehicleSummary` (combined) + individual fields
    vehicleSummary: a.vehicle
      ? `${a.vehicle.year ?? ''} ${a.vehicle.make ?? ''} ${a.vehicle.model ?? ''}`.trim()
      : null,
    vehicleYear:  a.vehicle?.year         ?? null,
    vehicleMake:  a.vehicle?.make         ?? null,
    vehicleModel: a.vehicle?.model        ?? null,
    vehiclePlate: a.vehicle?.licensePlate ?? null,
    // Address
    pickupAddress,
    vendorAddress: '1547 rue Trépanier, Laval, QC H7W 3G5, Canada',
    // Distance — from client-side Maps calculation
    towingDistance: (a.towing as any)?.towingDistance ?? null,
    towingDuration: (a.towing as any)?.towingDuration ?? null,
    // Scheduling — towing page reads `pickupDate` + `pickupTimeSlot`
    pickupDate,
    scheduledDate:   pickupDate,
    pickupTimeSlot:  (a.towing as any)?.pickupTimeSlot ?? null,
    parkingLocation: (a.towing as any)?.parkingLocation ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ── Write to reports_data ────────────────────────────────────────────────────
async function writeReport(db: Firestore, a: Assessment) {
  await setDoc(doc(db, 'reports_data', a.id!), {
    assessmentId: a.id,
    summary: a.summary ?? null,
    valuation: a.valuation ?? null,
    condition: a.condition ?? null,
    client: a.client ?? null,
    vehicle: a.vehicle ?? null,
    towing: a.towing ?? null,
    createdAt: serverTimestamp(),
  }, { merge: true });
}

// ── Main entry point ──────────────────────────────────────────────────────────
export async function finalizeTransaction(
  db: Firestore,
  auth: Auth,
  assessment: Assessment,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Ensure we always have a valid string ID — Firestore requires a non-empty string
    if (!assessment.id) {
      assessment.id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }

    const uid = await ensureAuth(auth);

    // Run each write independently — one failure cannot block the others
    const errors: string[] = [];

    for (const [name, fn] of [
      ['assessment',   () => writeAssessment(db, uid, assessment)],
      ['transaction',  () => writeTransaction(db, assessment)],
      ['client',       () => writeClient(db, uid, assessment)],
      ['vehicle',      () => writeVehicle(db, assessment)],
      ['towing',       () => writeTowing(db, uid, assessment)],
      ['report',       () => writeReport(db, assessment)],
    ] as [string, () => Promise<void>][]) {
      try {
        await fn();
      } catch (e: any) {
        console.error(`[finalizeTransaction] ${name} write failed:`, e?.message ?? e);
        errors.push(name);
      }
    }

    if (errors.length > 0) {
      console.warn('[finalizeTransaction] partial write — failed collections:', errors.join(', '));
    }

    return { success: errors.length === 0 };
  } catch (e: any) {
    console.error('[finalizeTransaction] error:', e);
    return { success: false, error: e?.message ?? String(e) };
  }
}
