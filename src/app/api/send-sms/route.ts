import { NextResponse } from 'next/server';
import type { Assessment } from '@/types';

export async function POST(request: Request) {
  try {
    const { assessment, lang }: { assessment: Assessment; lang?: 'en' | 'fr' } = await request.json();

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken  = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone  = process.env.TWILIO_PHONE_NUMBER;

    // Graceful degradation — SMS is optional
    if (!accountSid || !authToken || !fromPhone) {
      console.warn('[SMS] Twilio credentials missing — skipping SMS.');
      return NextResponse.json({ ok: true, skipped: true, reason: 'Twilio not configured' });
    }

    const clientPhone = assessment?.client?.phone;
    const adminPhone  = process.env.ADMIN_PHONE ?? null;

    if (!clientPhone) {
      return NextResponse.json({ ok: false, error: 'Client phone missing' }, { status: 400 });
    }

    // Dynamically import twilio to avoid SSR issues
    const twilio = (await import('twilio')).default;
    const client = twilio(accountSid, authToken);

    const v   = assessment.vehicle;
    const t   = assessment.towing;
    const val = assessment.valuation;
    const s   = assessment.summary;
    const name = assessment.client?.name ?? '';

    const pickupDate = t?.pickupDate
      ? new Date(t.pickupDate).toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA')
      : 'N/A';
    const price   = val?.finalPrice ? `$${val.finalPrice.toFixed(0)}` : 'N/A';
    const po      = s?.purchaseOrder ?? 'N/A';
    const vehicle = v ? `${v.year} ${v.make} ${v.model}` : 'N/A';

    const clientMsg = lang === 'fr'
      ? `✅ SCRAP CAR AI\n\nBonjour ${name},\n🚗 ${vehicle}\n💰 Offre: ${price}\n📅 Cueillette: ${pickupDate} (${t?.pickupTimeSlot ?? 'N/A'})\n📍 Distance: ${(t as any)?.towingDistance ?? 'N/A'} — ⏱ ${(t as any)?.towingDuration ?? 'N/A'}\n📋 Réf: ${po}\n\nNotre chauffeur vous appellera 30-60 min avant l'arrivée. Merci!`
      : `✅ SCRAP CAR AI\n\nHi ${name},\n🚗 ${vehicle}\n💰 Offer: ${price}\n📅 Pickup: ${pickupDate} (${t?.pickupTimeSlot ?? 'N/A'})\n📍 Distance: ${(t as any)?.towingDistance ?? 'N/A'} — ⏱ ${(t as any)?.towingDuration ?? 'N/A'}\n📋 Ref: ${po}\n\nDriver will call 30-60 min before arrival. Thank you!`;

    const adminMsg = `🔔 NEW SCRAP CAR AI SUBMISSION\nClient: ${name} ${clientPhone}\nVehicle: ${vehicle}\nOffer: ${price}\nPickup: ${pickupDate}\n📍 Distance: ${(t as any)?.towingDistance ?? 'N/A'} (${(t as any)?.towingDuration ?? 'N/A'})\nRef: ${po}`;

    const sends: Promise<any>[] = [
      client.messages.create({ body: clientMsg, from: fromPhone, to: clientPhone }),
    ];
    if (adminPhone && adminPhone !== fromPhone) {
      sends.push(client.messages.create({ body: adminMsg, from: fromPhone, to: adminPhone }));
    }

    const results = await Promise.allSettled(sends);

    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        console.log(`✅ SMS[${i}] sent:`, r.value.sid);
      } else {
        console.error(`❌ SMS[${i}] failed:`, r.reason?.message ?? r.reason);
      }
    });

    const clientOk = results[0].status === 'fulfilled';
    return NextResponse.json({
      ok: clientOk,
      sid: clientOk ? (results[0] as PromiseFulfilledResult<any>).value.sid : null,
      errors: results.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason?.message),
    });

  } catch (err: any) {
    console.error('[SMS] Unexpected error:', err.message);
    // Return ok:true so the wizard doesn't show an error — SMS is non-critical
    return NextResponse.json({ ok: true, skipped: true, error: err.message });
  }
}
