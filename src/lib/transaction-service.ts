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
    purchaseOrder: a.summary?.purchaseOrder ?? null,
    deliveryOrder: a.summary?.deliveryOrder ?? null,
    status: 'confirmed',
    clientName: a.client?.name ?? null,
    clientEmail: a.client?.email ?? null,
    clientPhone: a.client?.phone ?? null,
    clientAddress: `${a.client?.address ?? ''}, ${a.client?.city ?? ''}, ${a.client?.province ?? ''}`,
    vehicleYear: a.vehicle?.year ?? null,
    vehicleMake: a.vehicle?.make ?? null,
    vehicleModel: a.vehicle?.model ?? null,
    vehiclePlate: a.vehicle?.licensePlate ?? null,
    offerAmount: a.valuation?.finalOffer ?? null,
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
  const vehicleId = a.vehicle?.vin ?? a.id!;
  await setDoc(doc(db, 'vehicles', vehicleId), {
    assessmentId: a.id,
    year: a.vehicle?.year ?? null,
    make: a.vehicle?.make ?? null,
    model: a.vehicle?.model ?? null,
    trim: a.vehicle?.trim ?? null,
    vin: a.vehicle?.vin ?? null,
    mileage: a.vehicle?.mileage ?? null,
    licensePlate: a.vehicle?.licensePlate ?? null,
    condition: a.condition ?? null,
    createdAt: serverTimestamp(),
  }, { merge: true });
}

// ── Write to towing_dispatches ───────────────────────────────────────────────
async function writeTowing(db: Firestore, uid: string, a: Assessment) {
  const pickupAddress = getPickupAddress(a);
  await setDoc(doc(db, 'towing_dispatches', a.id!), {
    assessmentId: a.id,
    userId: uid,
    status: 'pending',
    clientName: a.client?.name ?? null,
    clientPhone: a.client?.phone ?? null,
    pickupAddress,
    vendorAddress: '1547 rue Trépanier, Laval, QC H7W 3G5, Canada',
    towingDistance: (a.towing as any)?.towingDistance ?? null,
    towingDuration: (a.towing as any)?.towingDuration ?? null,
    vehicleYear: a.vehicle?.year ?? null,
    vehicleMake: a.vehicle?.make ?? null,
    vehicleModel: a.vehicle?.model ?? null,
    vehiclePlate: a.vehicle?.licensePlate ?? null,
    parkingLocation: (a.towing as any)?.parkingLocation ?? null,
    scheduledDate: (a.towing as any)?.pickupDate ?? null,
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

    await Promise.all([
      writeAssessment(db, uid, assessment),
      writeTransaction(db, assessment),
      writeClient(db, uid, assessment),
      writeVehicle(db, assessment),
      writeTowing(db, uid, assessment),
      writeReport(db, assessment),
    ]);

    return { success: true };
  } catch (e: any) {
    console.error('[finalizeTransaction] error:', e);
    return { success: false, error: e?.message ?? String(e) };
  }
}
