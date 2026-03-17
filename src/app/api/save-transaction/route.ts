import { NextResponse } from 'next/server';
import type { Assessment } from '@/types';

/**
 * Server-side transaction saver.
 * Uses Firebase REST API directly — bypasses client auth issues on mobile.
 * Called as a fallback when client-side finalizeTransaction fails/is slow.
 */

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'scrpcaraiengsp-89650661-77994';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Convert a JS value to Firestore REST value
function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === 'string') return { stringValue: val };
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreDoc(data: Record<string, any>) {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) fields[k] = toFirestoreValue(v);
  }
  return { fields };
}

async function firestorePatch(collection: string, docId: string, data: Record<string, any>) {
  const url = `${FIRESTORE_BASE}/${collection}/${encodeURIComponent(docId)}?updateMask.fieldPaths=${Object.keys(data).join('&updateMask.fieldPaths=')}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toFirestoreDoc(data)),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firestore PATCH ${collection}/${docId} failed: ${err}`);
  }
  return res.json();
}

export async function POST(request: Request) {
  try {
    const { assessment }: { assessment: Assessment } = await request.json();

    if (!assessment || !assessment.id) {
      return NextResponse.json({ ok: false, error: 'Missing assessment or id' }, { status: 400 });
    }

    const a = assessment;
    const id = a.id!;
    const now = new Date().toISOString();

    const altAddr = (a.towing as any)?.alternateAddress;
    const pickupAddress = a.towing?.sameAddress === 'no' && altAddr?.street
      ? `${altAddr.street}, ${altAddr.city ?? ''}`.trim()
      : `${a.client?.address ?? ''}, ${a.client?.city ?? ''}`.trim();

    const rawDate = (a.towing as any)?.pickupDate;
    let pickupDate: string | null = null;
    if (rawDate) {
      if (typeof rawDate === 'string') pickupDate = rawDate;
      else if (rawDate?.seconds) pickupDate = new Date(rawDate.seconds * 1000).toISOString();
      else if (rawDate instanceof Date) pickupDate = rawDate.toISOString();
    }

    const photoUrls: string[] = ((a.condition as any)?.photos ?? [])
      .filter((p: string) => p && !p.startsWith('data:'));

    const errors: string[] = [];

    // 1. transactions
    try {
      await firestorePatch('transactions', id, {
        assessmentId: id,
        purchaseOrder: a.summary?.purchaseOrder ?? null,
        deliveryOrder: a.summary?.deliveryOrder ?? null,
        status: 'confirmed',
        clientName: a.client?.name ?? null,
        clientEmail: a.client?.email ?? null,
        clientPhone: a.client?.phone ?? null,
        clientAddress: a.client?.address ?? null,
        clientCity: a.client?.city ?? null,
        clientProvince: a.client?.province ?? null,
        clientPostal: a.client?.postalCode ?? null,
        clientCountry: a.client?.country ?? null,
        vehicleYear: a.vehicle?.year ?? null,
        vehicleMake: a.vehicle?.make ?? null,
        vehicleModel: a.vehicle?.model ?? null,
        vehiclePlate: (a.vehicle as any)?.licensePlate ?? null,
        vehicleVin: a.vehicle?.vin ?? null,
        vehicleMileage: a.vehicle?.mileage ?? null,
        vehicleTransmission: a.vehicle?.transmission ?? null,
        vehicleDriveline: a.vehicle?.driveline ?? null,
        vehicleType: a.vehicle?.vehicleType ?? null,
        conditionRuns: a.condition?.runs ?? null,
        conditionAccident: a.condition?.accident ?? null,
        conditionMissingParts: a.condition?.missingParts ?? null,
        conditionHasRust: a.condition?.hasRust ?? null,
        conditionRustDetails: a.condition?.rustDetails ?? null,
        conditionHasBodyDamage: a.condition?.hasBodyDamage ?? null,
        conditionBodyDamage: a.condition?.bodyDamageDetails ?? null,
        conditionHasMechanical: a.condition?.hasMechanicalIssues ?? null,
        conditionMechanical: a.condition?.mechanicalIssues ?? null,
        conditionIsComplete: a.condition?.isComplete ?? null,
        photoUrls,
        finalPrice: a.valuation?.finalPrice ?? null,
        offerAmount: a.valuation?.finalPrice ?? null,
        pickupAddress,
        pickupDate,
        pickupTimeSlot: (a.towing as any)?.pickupTimeSlot ?? null,
        parkingLocation: (a.towing as any)?.parkingLocation ?? null,
        towingDistance: (a.towing as any)?.towingDistance ?? null,
        towingDuration: (a.towing as any)?.towingDuration ?? null,
        towingAllWheels: a.towing?.allWheels ?? null,
        towingFlatTires: a.towing?.flatTires ?? null,
        towingBlocked: a.towing?.blocked ?? null,
        towingHasKeys: a.towing?.hasKeys ?? null,
        yardName: a.yard?.yard_name ?? null,
        yardAddress: a.yard?.contact?.address ?? null,
        yardPhone: a.yard?.contact?.phone ?? null,
        yardEmail: a.yard?.contact?.email ?? null,
        createdAt: now,
      });
    } catch (e: any) {
      console.error('[save-transaction] transactions failed:', e.message);
      errors.push('transactions');
    }

    // 2. assessments
    try {
      await firestorePatch('assessments', id, {
        id,
        status: 'confirmed',
        client: a.client ? JSON.stringify(a.client) : null,
        vehicle: a.vehicle ? JSON.stringify(a.vehicle) : null,
        condition: a.condition ? JSON.stringify(a.condition) : null,
        valuation: a.valuation ? JSON.stringify(a.valuation) : null,
        towing: a.towing ? JSON.stringify(a.towing) : null,
        yard: a.yard ? JSON.stringify(a.yard) : null,
        summary: a.summary ? JSON.stringify(a.summary) : null,
        updatedAt: now,
      });
    } catch (e: any) {
      console.error('[save-transaction] assessments failed:', e.message);
      errors.push('assessments');
    }

    // 3. towing_dispatches
    try {
      await firestorePatch('towing_dispatches', id, {
        assessmentId: id,
        status: 'pending',
        clientName: a.client?.name ?? null,
        clientPhone: a.client?.phone ?? null,
        purchaseOrder: a.summary?.purchaseOrder ?? null,
        deliveryOrder: a.summary?.deliveryOrder ?? null,
        vehicleSummary: a.vehicle ? `${a.vehicle.year ?? ''} ${a.vehicle.make ?? ''} ${a.vehicle.model ?? ''}`.trim() : null,
        vehicleYear: a.vehicle?.year ?? null,
        vehicleMake: a.vehicle?.make ?? null,
        vehicleModel: a.vehicle?.model ?? null,
        vehiclePlate: (a.vehicle as any)?.licensePlate ?? null,
        pickupAddress,
        towingDistance: (a.towing as any)?.towingDistance ?? null,
        towingDuration: (a.towing as any)?.towingDuration ?? null,
        pickupDate,
        scheduledDate: pickupDate,
        pickupTimeSlot: (a.towing as any)?.pickupTimeSlot ?? null,
        parkingLocation: (a.towing as any)?.parkingLocation ?? null,
        createdAt: now,
        updatedAt: now,
      });
    } catch (e: any) {
      console.error('[save-transaction] towing_dispatches failed:', e.message);
      errors.push('towing_dispatches');
    }

    return NextResponse.json({
      ok: errors.length < 2,
      savedCollections: ['transactions', 'assessments', 'towing_dispatches'].filter(c => !errors.includes(c)),
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (err: any) {
    console.error('[save-transaction] unexpected error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
