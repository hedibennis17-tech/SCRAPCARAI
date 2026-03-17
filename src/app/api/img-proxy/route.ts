import { NextResponse } from 'next/server';

/**
 * Server-side image proxy — fetches a Firebase Storage image and returns it
 * as base64. Used by client-side PDF builders to bypass CORS restrictions
 * that prevent loading Storage URLs in canvas elements.
 *
 * Usage: GET /api/img-proxy?url=<encoded_firebase_storage_url>
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ ok: false, error: 'Missing url param' }, { status: 400 });
    }

    // Only allow Firebase Storage URLs for security
    const allowed =
      url.startsWith('https://firebasestorage.googleapis.com/') ||
      url.startsWith('https://storage.googleapis.com/');

    if (!allowed) {
      return NextResponse.json({ ok: false, error: 'URL not allowed' }, { status: 403 });
    }

    const res = await fetch(url, { headers: { 'User-Agent': 'ScrapCarAI-PDFProxy/1.0' } });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `Upstream ${res.status}` }, { status: 502 });
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const dataUri = `data:${contentType};base64,${base64}`;

    return NextResponse.json({ ok: true, dataUri });
  } catch (err: any) {
    console.error('[img-proxy] error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
