'use client';

import {
  doc, collection, setDoc, serverTimestamp, Firestore,
} from 'firebase/firestore';
import { Auth, signInAnonymously } from 'firebase/auth';
import type { Assessment } from '@/types';

// ── Ensure authenticated user ─────────────────────────────────────────────────
async function ensureAuth(auth: Auth): Promise<string | null> {
  if (auth.currentUser) return auth.currentUser.uid;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user.uid;
  } catch (e) {
    console.error('ensureAuth failed:', e);
    return null;
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

// ── Write to assessments (what admin dashboard reads) ────────────────────────
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
    vehicleVin: a.vehicle?.vin ?? null,
    vehicleMileage: a.vehicle?.mileage ?? null,
    finalPrice: a.valuation?.finalPrice ?? 0,
    priceBreakdown: a.valuation?.breakdown ?? null,
    pickupAddress: getPickupAddress(a),
    pickupDate: a.towing?.pickupDate ?? null,
    pickupTimeSlot: a.towing?.pickupTimeSlot ?? null,
    yardName: a.yard?.yard_name ?? null,
    yardPhone: a.yard?.contact?.phone ?? null,
    yardAddress: a.yard?.contact?.address ?? null,
    photos: a.condition?.photos ?? [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ── Write to clients ─────────────────────────────────────────────────────────
async function writeClient(db: Firestore, a: Assessment) {
  if (!a.client?.email) return;
  const slug = a.client.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
  await setDoc(doc(db, 'clients', slug), {
    name: a.client.name ?? null,
    email: a.client.email,
    phone: a.client.phone ?? null,
    address: a.client.address ?? null,
    city: a.client.city ?? null,
    province: a.client.province ?? null,
    lastAssessmentId: a.id,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ── Write to vehicles ────────────────────────────────────────────────────────
async function writeVehicle(db: Firestore, a: Assessment) {
  await setDoc(doc(db, 'vehicles', a.id!), {
    assessmentId: a.id,
    purchaseOrder: a.summary?.purchaseOrder ?? null,
    year: a.vehicle?.year ?? null,
    make: a.vehicle?.make ?? null,
    model: a.vehicle?.model ?? null,
    vin: a.vehicle?.vin ?? null,
    mileage: a.vehicle?.mileage ?? null,
    transmission: a.vehicle?.transmission ?? null,
    vehicleType: a.vehicle?.vehicleType ?? null,
    runs: a.condition?.runs ?? null,
    accident: a.condition?.accident ?? null,
    missingParts: a.condition?.missingParts ?? [],
    photos: a.condition?.photos ?? [],
    finalPrice: a.valuation?.finalPrice ?? 0,
    status: 'pending_pickup',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ── Write to towing_dispatches ────────────────────────────────────────────────
async function writeTowing(db: Firestore, a: Assessment) {
  await setDoc(doc(db, 'towing_dispatches', a.id!), {
    assessmentId: a.id,
    purchaseOrder: a.summary?.purchaseOrder ?? null,
    deliveryOrder: a.summary?.deliveryOrder ?? null,
    clientName: a.client?.name ?? null,
    clientPhone: a.client?.phone ?? null,
    vehicleSummary: `${a.vehicle?.year ?? ''} ${a.vehicle?.make ?? ''} ${a.vehicle?.model ?? ''}`.trim(),
    vehicleVin: a.vehicle?.vin ?? null,
    pickupAddress: getPickupAddress(a),
    pickupDate: a.towing?.pickupDate ?? null,
    pickupTimeSlot: a.towing?.pickupTimeSlot ?? null,
    parkingLocation: a.towing?.parkingLocation ?? null,
    allWheels: a.towing?.allWheels ?? null,
    flatTires: a.towing?.flatTires ?? null,
    blocked: a.towing?.blocked ?? null,
    hasKeys: a.towing?.hasKeys ?? null,
    yardName: a.yard?.yard_name ?? null,
    yardPhone: a.yard?.contact?.phone ?? null,
    status: 'scheduled',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ── Write to reports_data ─────────────────────────────────────────────────────
async function writeReport(db: Firestore, a: Assessment) {
  const pd = a.towing?.pickupDate ? new Date(a.towing.pickupDate) : null;
  await setDoc(doc(db, 'reports_data', a.id!), {
    assessmentId: a.id,
    province: a.client?.province ?? null,
    city: a.client?.city ?? null,
    vehicleMake: a.vehicle?.make ?? null,
    vehicleYear: a.vehicle?.year ?? null,
    yardName: a.yard?.yard_name ?? null,
    finalPrice: a.valuation?.finalPrice ?? 0,
    metalValue: a.valuation?.breakdown?.metalValue ?? 0,
    partsValue: a.valuation?.breakdown?.partsValue ?? 0,
    pickupMonth: pd ? pd.getMonth() + 1 : null,
    pickupYear: pd ? pd.getFullYear() : null,
    createdAt: serverTimestamp(),
  }, { merge: true });
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export async function finalizeTransaction(
  db: Firestore,
  auth: Auth,
  assessment: Assessment
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Auth
    const uid = await ensureAuth(auth);
    if (!uid) return { success: false, error: 'Auth failed' };

    // 2. Ensure ID
    if (!assessment.id) {
      assessment.id = doc(collection(db, 'assessments')).id;
    }

    // 3. Ensure summary
    if (!assessment.summary?.purchaseOrder) {
      const seq = Math.floor(Math.random() * 900) + 100;
      const yd = assessment.yard?.yard_name?.substring(0, 2).toUpperCase() ?? 'SC';
      const now = new Date();
      const yr = now.getFullYear().toString().slice(-2);
      const mo = (now.getMonth() + 1).toString().padStart(2, '0');
      assessment.summary = {
        purchaseOrder: `PO-${yd}-${yr}${mo}-${seq}`,
        deliveryOrder: `DO-${yd}-${yr}${mo}-${seq}`,
      };
    }

    console.log('📝 Writing to Firestore, id:', assessment.id);

    // 4. Write all 6 collections
    await Promise.all([
      writeAssessment(db, uid, assessment),
      writeTransaction(db, assessment),
      writeClient(db, assessment),
      writeVehicle(db, assessment),
      writeTowing(db, assessment),
      writeReport(db, assessment),
    ]);

    console.log('✅ All 6 collections written for ID:', assessment.id);
    return { success: true };

  } catch (err: any) {
    console.error('❌ finalizeTransaction failed:', err.code, err.message);
    return { success: false, error: err?.message ?? 'Unknown error' };
  }
}
