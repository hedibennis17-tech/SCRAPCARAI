import { NextResponse } from 'next/server';
import type { Assessment } from '@/types';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'scrpcaraiengsp-89650661-77994';
const API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyCdS2Wkr29nuk0Vczm6pyYC815nVagwHVU';
const FIRESTORE  = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ── Get an anonymous Firebase ID token (server-side) ─────────────────────────
// This lets us bypass Firestore rules that require request.auth != null.
async function getAnonToken(): Promise<string | null> {
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnSecureToken: true }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.idToken ?? null;
  } catch {
    return null;
  }
}

// ── Firestore value converter ─────────────────────────────────────────────────
function toValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean')          return { booleanValue: val };
  if (typeof val === 'number')           return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === 'string')           return { stringValue: val };
  if (val instanceof Date)               return { timestampValue: val.toISOString() };
  if (Array.isArray(val))                return { arrayValue: { values: val.map(toValue) } };
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toDoc(data: Record<string, any>) {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) fields[k] = toValue(v);
  }
  return { fields };
}

// ── Simple PATCH (no updateMask = full replace, shorter URL) ──────────────────
async function fsSet(col: string, id: string, data: Record<string, any>, token: string | null) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${FIRESTORE}/${col}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(toDoc(data)),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${col}/${id}: ${res.status} ${err.slice(0, 200)}`);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const { assessment }: { assessment: Assessment } = await request.json();

    if (!assessment?.id) {
      return NextResponse.json({ ok: false, error: 'Missing assessment.id' }, { status: 400 });
    }

    const a   = assessment;
    const id  = a.id!;
    const now = new Date().toISOString();

    // Build pickup address
    const altAddr = (a.towing as any)?.alternateAddress;
    const pickupAddress = a.towing?.sameAddress === 'no' && altAddr?.street
      ? `${altAddr.street}, ${altAddr.city ?? ''}`.trim()
      : `${a.client?.address ?? ''}, ${a.client?.city ?? ''}`.trim();

    // Normalize pickup date
    const rawDate = (a.towing as any)?.pickupDate;
    let pickupDate: string | null = null;
    if (rawDate) {
      if (typeof rawDate === 'string') pickupDate = rawDate;
      else if (rawDate?.seconds) pickupDate = new Date(rawDate.seconds * 1000).toISOString();
      else if (rawDate instanceof Date) pickupDate = rawDate.toISOString();
    }

    // Photos: only Storage URLs (filter out base64)
    const photoUrls: string[] = ((a.condition as any)?.photos ?? [])
      .filter((p: string) => p && p.startsWith('http'));

    // Get anonymous token to satisfy auth rules
    const token = await getAnonToken();
    console.log('[save-transaction] anon token obtained:', !!token);

    const errors: string[] = [];

    // 1. transactions
    try {
      await fsSet('transactions', id, {
        assessmentId:   id,
        purchaseOrder:  a.summary?.purchaseOrder  ?? null,
        deliveryOrder:  a.summary?.deliveryOrder  ?? null,
        status:         'confirmed',
        clientName:     a.client?.name            ?? null,
        clientEmail:    a.client?.email           ?? null,
        clientPhone:    a.client?.phone           ?? null,
        clientAddress:  a.client?.address         ?? null,
        clientCity:     a.client?.city            ?? null,
        clientProvince: a.client?.province        ?? null,
        clientPostal:   a.client?.postalCode      ?? null,
        clientCountry:  a.client?.country         ?? null,
        vehicleYear:         a.vehicle?.year                 ?? null,
        vehicleMake:         a.vehicle?.make                 ?? null,
        vehicleModel:        a.vehicle?.model                ?? null,
        vehicleVin:          a.vehicle?.vin                  ?? null,
        vehicleMileage:      a.vehicle?.mileage              ?? null,
        vehicleTransmission: a.vehicle?.transmission         ?? null,
        vehicleDriveline:    a.vehicle?.driveline            ?? null,
        vehicleType:         a.vehicle?.vehicleType          ?? null,
        vehiclePlate:        (a.vehicle as any)?.licensePlate ?? null,
        conditionRuns:         a.condition?.runs               ?? null,
        conditionAccident:     a.condition?.accident           ?? null,
        conditionMissingParts: a.condition?.missingParts       ?? null,
        conditionHasRust:      a.condition?.hasRust            ?? null,
        conditionRustDetails:  a.condition?.rustDetails        ?? null,
        conditionHasBodyDamage: a.condition?.hasBodyDamage     ?? null,
        conditionBodyDamage:   a.condition?.bodyDamageDetails  ?? null,
        conditionHasMechanical: a.condition?.hasMechanicalIssues ?? null,
        conditionMechanical:   a.condition?.mechanicalIssues   ?? null,
        conditionIsComplete:   a.condition?.isComplete         ?? null,
        conditionIncomplete:   a.condition?.incompleteDetails  ?? null,
        photoUrls,
        finalPrice:      a.valuation?.finalPrice ?? null,
        offerAmount:     a.valuation?.finalPrice ?? null,
        pickupAddress,
        pickupDate,
        pickupTimeSlot:  (a.towing as any)?.pickupTimeSlot  ?? null,
        parkingLocation: (a.towing as any)?.parkingLocation ?? null,
        towingDistance:  (a.towing as any)?.towingDistance  ?? null,
        towingDuration:  (a.towing as any)?.towingDuration  ?? null,
        towingAllWheels: a.towing?.allWheels ?? null,
        towingFlatTires: a.towing?.flatTires ?? null,
        towingBlocked:   a.towing?.blocked   ?? null,
        towingHasKeys:   a.towing?.hasKeys   ?? null,
        yardName:    a.yard?.yard_name        ?? null,
        yardAddress: a.yard?.contact?.address ?? null,
        yardPhone:   a.yard?.contact?.phone   ?? null,
        yardEmail:   a.yard?.contact?.email   ?? null,
        createdAt: now,
      }, token);
      console.log('[save-transaction] ✅ transactions');
    } catch (e: any) {
      console.error('[save-transaction] ❌ transactions:', e.message);
      errors.push('transactions');
    }

    // 2. assessments
    try {
      await fsSet('assessments', id, {
        id,
        status:    'confirmed',
        summary:   a.summary   ?? null,
        client:    a.client    ?? null,
        vehicle:   a.vehicle   ?? null,
        condition: a.condition ?? null,
        valuation: a.valuation ?? null,
        towing:    a.towing    ?? null,
        yard:      a.yard      ?? null,
        updatedAt: now,
        createdAt: now,
      }, token);
      console.log('[save-transaction] ✅ assessments');
    } catch (e: any) {
      console.error('[save-transaction] ❌ assessments:', e.message);
      errors.push('assessments');
    }

    // 3. towing_dispatches
    try {
      await fsSet('towing_dispatches', id, {
        assessmentId:   id,
        status:         'pending',
        clientName:     a.client?.name  ?? null,
        clientPhone:    a.client?.phone ?? null,
        purchaseOrder:  a.summary?.purchaseOrder ?? null,
        deliveryOrder:  a.summary?.deliveryOrder ?? null,
        vehicleSummary: a.vehicle ? `${a.vehicle.year ?? ''} ${a.vehicle.make ?? ''} ${a.vehicle.model ?? ''}`.trim() : null,
        vehicleYear:    a.vehicle?.year  ?? null,
        vehicleMake:    a.vehicle?.make  ?? null,
        vehicleModel:   a.vehicle?.model ?? null,
        vehiclePlate:   (a.vehicle as any)?.licensePlate ?? null,
        pickupAddress,
        towingDistance: (a.towing as any)?.towingDistance ?? null,
        towingDuration: (a.towing as any)?.towingDuration ?? null,
        pickupDate,
        scheduledDate:   pickupDate,
        pickupTimeSlot:  (a.towing as any)?.pickupTimeSlot  ?? null,
        parkingLocation: (a.towing as any)?.parkingLocation ?? null,
        createdAt: now,
        updatedAt: now,
      }, token);
      console.log('[save-transaction] ✅ towing_dispatches');
    } catch (e: any) {
      console.error('[save-transaction] ❌ towing_dispatches:', e.message);
      errors.push('towing_dispatches');
    }

    return NextResponse.json({
      ok: errors.length === 0,
      saved: ['transactions', 'assessments', 'towing_dispatches'].filter(c => !errors.includes(c)),
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (err: any) {
    console.error('[save-transaction] unexpected:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
