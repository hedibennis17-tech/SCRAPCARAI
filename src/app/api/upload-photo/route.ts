import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side photo upload proxy — receives a base64 image and uploads it
 * to Firebase Storage via REST API, bypassing browser CORS restrictions.
 *
 * The Storage path MUST be under assessments/{docId}/{photoId} which has
 * storage rules: allow write: if true  (no auth needed)
 *
 * POST /api/upload-photo
 * Body: { base64: string, path: string, mimeType?: string }
 * Returns: { ok: true, url: string } | { ok: false, error: string }
 */

// Use env vars set in Vercel — falls back to hardcoded value seen in CORS errors
const STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  'carwizardai2025-03267024-51842.firebasestorage.app';

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

    // Only allow assessments/ paths — these have write: if true in storage rules
    if (!path.startsWith('assessments/')) {
      return NextResponse.json(
        { ok: false, error: 'Only assessments/ paths allowed via this proxy' },
        { status: 403 }
      );
    }

    // Convert base64 to Buffer
    const imageBuffer = Buffer.from(base64, 'base64');

    // Firebase Storage REST API — no auth needed for assessments/ (rules: write: if true)
    const encodedPath = encodeURIComponent(path);
    const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o?name=${encodedPath}&uploadType=media`;

    console.log(`[upload-photo] bucket=${STORAGE_BUCKET} path=${path} size=${imageBuffer.length}B`);

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(imageBuffer.length),
      },
      body: imageBuffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error(`[upload-photo] Firebase ${uploadRes.status}:`, errText);
      return NextResponse.json(
        { ok: false, error: `Storage upload failed: ${uploadRes.status} — ${errText.slice(0, 300)}` },
        { status: 502 }
      );
    }

    const uploadData = await uploadRes.json();
    const downloadToken = uploadData.downloadTokens;

    // Build public download URL
    const downloadUrl = downloadToken
      ? `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodedPath}?alt=media&token=${downloadToken}`
      : `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodedPath}?alt=media`;

    console.log(`[upload-photo] ✅ → ${downloadUrl.slice(0, 80)}…`);

    return NextResponse.json({ ok: true, url: downloadUrl });
  } catch (err: any) {
    console.error('[upload-photo] Unexpected error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
