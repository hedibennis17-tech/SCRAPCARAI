import { NextResponse } from 'next/server';
import twilio from 'twilio';
import type { Assessment } from '@/types';

export async function POST(request: Request) {
  try {
    const { assessment, lang }: { assessment: Assessment; lang?: 'en' | 'fr' } = await request.json();

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromPhone) {
      console.error('Twilio credentials missing');
      return NextResponse.json({ ok: false, error: 'Twilio credentials not configured' }, { status: 500 });
    }

    const clientPhone = assessment?.client?.phone;
    // En mode Twilio Trial, seuls les numéros vérifiés peuvent recevoir des SMS
    // ADMIN_PHONE doit être un numéro vérifié dans le compte Twilio
    const adminPhone = process.env.ADMIN_PHONE || '+14388334319';

    if (!clientPhone) {
      return NextResponse.json({ ok: false, error: 'Client phone number missing' }, { status: 400 });
    }

    const client = twilio(accountSid, authToken);

    const vehicle = assessment.vehicle;
    const towing = assessment.towing;
    const valuation = assessment.valuation;
    const summary = assessment.summary;
    const clientName = assessment.client?.name || '';

    const pickupDate = towing?.pickupDate
      ? new Date(towing.pickupDate).toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA')
      : 'N/A';
    const timeSlot = towing?.pickupTimeSlot || 'N/A';
    const price = valuation?.finalPrice ? `$${valuation.finalPrice.toFixed(0)}` : 'N/A';
    const po = summary?.purchaseOrder || 'N/A';
    const vehicleName = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'N/A';

    const smsBody = lang === 'fr'
      ? `✅ SCRAP CAR AI - Confirmation\n\nBonjour ${clientName},\n\nVotre évaluation est confirmée!\n🚗 Véhicule: ${vehicleName}\n💰 Offre: ${price}\n📅 Cueillette: ${pickupDate} (${timeSlot})\n📋 Réf: ${po}\n\nNotre chauffeur vous appellera 30-60 min avant l'arrivée. Merci!`
      : `✅ SCRAP CAR AI - Confirmation\n\nHi ${clientName},\n\nYour assessment is confirmed!\n🚗 Vehicle: ${vehicleName}\n💰 Offer: ${price}\n📅 Pickup: ${pickupDate} (${timeSlot})\n📋 Ref: ${po}\n\nOur driver will call 30-60 min before arrival. Thank you!`;

    const adminSmsBody = `🔔 NEW SUBMISSION - SCRAP CAR AI\n\nClient: ${clientName}\nPhone: ${clientPhone}\nVehicle: ${vehicleName}\nOffer: ${price}\nPickup: ${pickupDate} (${timeSlot})\nRef: ${po}`;

    const results = await Promise.allSettled([
      // SMS to client
      client.messages.create({
        body: smsBody,
        from: fromPhone,
        to: clientPhone,
      }),
      // SMS to admin (only if admin phone is different from Twilio number)
      ...(adminPhone && adminPhone !== fromPhone ? [
        client.messages.create({
          body: adminSmsBody,
          from: fromPhone,
          to: adminPhone,
        })
      ] : []),
    ]);

    const clientResult = results[0];
    const errors: string[] = [];

    if (clientResult.status === 'rejected') {
      console.error('SMS to client failed:', clientResult.reason);
      errors.push(`Client SMS failed: ${clientResult.reason?.message || clientResult.reason}`);
    } else {
      console.log('✅ SMS to client sent:', clientResult.value.sid);
    }

    if (results[1] && results[1].status === 'rejected') {
      console.error('SMS to admin failed:', (results[1] as PromiseRejectedResult).reason);
    }

    if (errors.length > 0) {
      return NextResponse.json({ ok: false, errors }, { status: 500 });
    }

    return NextResponse.json({ ok: true, messageSid: (clientResult as PromiseFulfilledResult<any>).value?.sid });
  } catch (err: any) {
    console.error('Error in /api/send-sms:', err);
    return NextResponse.json({ ok: false, error: err.message || 'Unknown error' }, { status: 500 });
  }
}
