import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { origin, destination } = await request.json();

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBhbVgnBgOA0qi7-a95Ol7G5BTlfIqa50s';

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?` +
      `origins=${encodeURIComponent(origin)}` +
      `&destinations=${encodeURIComponent(destination)}` +
      `&units=metric` +
      `&language=fr` +
      `&key=${apiKey}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK') {
      return NextResponse.json({ ok: false, error: data.status }, { status: 400 });
    }

    const element = data.rows?.[0]?.elements?.[0];

    if (!element || element.status !== 'OK') {
      return NextResponse.json({ ok: false, error: element?.status ?? 'NO_RESULTS' }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      distanceText: element.distance.text,
      distanceValue: element.distance.value,
      durationText: element.duration.text,
      durationValue: element.duration.value,
    });

  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
