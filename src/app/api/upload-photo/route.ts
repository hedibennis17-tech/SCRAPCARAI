import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

/**
 * Server-side photo upload proxy — uploads photos to Firebase Storage via
 * Node.js https (bypasses browser CORS entirely).
 *
 * Strategy:
 *  1. Try WITH anonymous auth token (satisfies "write: if request.auth != null")
 *  2. Fallback: try WITHOUT token (satisfies "write: if true" rules)
 */

const STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  'carwizardai2025-03267024-51842.firebasestorage.app';

const API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  'AIzaSyCdS2Wkr29nuk0Vczm6pyYC815nVagwHVU';

function getAnonToken(): Promise<string | null> {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ returnSecureToken: true });
    const req = https.request({
      hostname: 'identitytoolkit.googleapis.com',
      path: `/v1/accounts:signUp?key=${API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try {
          const j = JSON.parse(raw);
          if (j.idToken) { resolve(j.idToken); }
          else { console.warn('[upload-photo] no idToken status:', res.statusCode, raw.slice(0, 200)); resolve(null); }
        } catch { resolve(null); }
      });
    });
    req.on('error', (e) => { console.warn('[upload-photo] auth error:', e.message); resolve(null); });
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
    req.write(payload);
    req.end();
  });
}

function doUpload(
  bucket: string, path: string, data: Buffer, contentType: string, token: string | null
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const encodedName = encodeURIComponent(path);
    const urlPath = `/v0/b/${encodeURIComponent(bucket)}/o?name=${encodedName}&uploadType=media`;
    const headers: Record<string, string | number> = {
      'Content-Type': contentType,
      'Content-Length': data.length,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = https.request({
      hostname: 'firebasestorage.googleapis.com',
      path: urlPath,
      method: 'POST',
      headers,
    }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Upload timeout')); });
    req.write(data);
    req.end();
  });
}

function buildSuccessResponse(responseBody: string, path: string): NextResponse {
  let uploadData: any = {};
  try { uploadData = JSON.parse(responseBody); } catch { /* */ }
  const encodedPath = encodeURIComponent(path);
  const dt = uploadData.downloadTokens;
  const url = dt
    ? `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodedPath}?alt=media&token=${dt}`
    : `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodedPath}?alt=media`;
  console.log(`[upload-photo] ✅ url=${url.slice(0, 100)}`);
  return NextResponse.json({ ok: true, url });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { base64, path, mimeType = 'image/png' } = body as { base64: string; path: string; mimeType?: string; };

    if (!base64 || !path) return NextResponse.json({ ok: false, error: 'Missing base64 or path' }, { status: 400 });

    const imageBuffer = Buffer.from(base64, 'base64');
    if (imageBuffer.length === 0) return NextResponse.json({ ok: false, error: 'Empty image buffer' }, { status: 400 });

    console.log(`[upload-photo] START bucket=${STORAGE_BUCKET} path=${path} size=${imageBuffer.length}B`);

    // Attempt 1: with anon token
    const token = await getAnonToken();
    console.log(`[upload-photo] token=${token ? '✅' : '❌ null'}`);

    if (token) {
      const r1 = await doUpload(STORAGE_BUCKET, path, imageBuffer, mimeType, token);
      console.log(`[upload-photo] attempt1 status=${r1.status}`);
      if (r1.status >= 200 && r1.status < 300) return buildSuccessResponse(r1.body, path);
      console.warn(`[upload-photo] attempt1 failed ${r1.status}: ${r1.body.slice(0, 200)}`);
    }

    // Attempt 2: without token (write: if true paths)
    const r2 = await doUpload(STORAGE_BUCKET, path, imageBuffer, mimeType, null);
    console.log(`[upload-photo] attempt2 status=${r2.status}`);
    if (r2.status >= 200 && r2.status < 300) return buildSuccessResponse(r2.body, path);

    const errMsg = `Both attempts failed. token=${!!token} last=${r2.status}: ${r2.body.slice(0, 300)}`;
    console.error(`[upload-photo] ❌ ${errMsg}`);
    return NextResponse.json({ ok: false, error: errMsg }, { status: 502 });

  } catch (err: any) {
    console.error('[upload-photo] error:', err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
