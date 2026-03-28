import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side photo upload proxy — receives a base64 image and uploads it
 * to Firebase Storage via REST API, bypassing browser CORS restrictions.
 *
 * POST /api/upload-photo
 * Body: { base64: string, path: string, mimeType?: string }
 * Returns: { ok: true, url: string } | { ok: false, error: string }
 */

const API_KEY       = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyCdS2Wkr29nuk0Vczm6pyYC815nVagwHVU';
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'scrpcaraiengsp-89650661-77994.firebasestorage.app';

// ── Get an anonymous Firebase ID token (server-side) ─────────────────────────
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { base64, path, mimeType = 'image/png' } = body as {
      base64: string;
      path: string;
      mimeType?: string;
    };

    if (!base64 || !path) {
      return NextResponse.json({ ok: false, error: 'Missing base64 or path' }, { status: 400 });
    }

    // Convert base64 to Buffer
    const imageBuffer = Buffer.from(base64, 'base64');

    // Get auth token
    const token = await getAnonToken();
    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Content-Length': String(imageBuffer.length),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Upload to Firebase Storage REST API
    const encodedPath = encodeURIComponent(path);
    const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o?name=${encodedPath}&uploadType=media`;

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body: imageBuffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error('[upload-photo] Firebase Storage error:', uploadRes.status, errText);
      return NextResponse.json(
        { ok: false, error: `Storage upload failed: ${uploadRes.status}` },
        { status: 502 }
      );
    }

    const uploadData = await uploadRes.json();
    const downloadToken = uploadData.downloadTokens;

    // Build public download URL
    const downloadUrl = downloadToken
      ? `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodedPath}?alt=media&token=${downloadToken}`
      : `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodedPath}?alt=media`;

    return NextResponse.json({ ok: true, url: downloadUrl });
  } catch (err: any) {
    console.error('[upload-photo] Unexpected error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
