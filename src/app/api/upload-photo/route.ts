import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, inMemoryPersistence, setPersistence } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Server-side photo upload using Firebase SDK (Node.js).
 * No CORS restrictions server-side — SDK handles auth + upload transparently.
 *
 * POST /api/upload-photo
 * Body: { base64: string, path: string, mimeType?: string }
 * Returns: { ok: true, url: string } | { ok: false, error: string }
 */

const FIREBASE_CONFIG = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            ?? 'AIzaSyCdS2Wkr29nuk0Vczm6pyYC815nVagwHVU',
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? 'scrpcaraiengsp-89650661-77994.firebaseapp.com',
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         ?? 'scrpcaraiengsp-89650661-77994',
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? 'carwizardai2025-03267024-51842.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '89650661',
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             ?? '',
};

// Singleton — reuse across requests in the same serverless instance
function getServerApp(): FirebaseApp {
  const NAME = 'server-upload-proxy';
  try { return getApp(NAME); }
  catch { return initializeApp(FIREBASE_CONFIG, NAME); }
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

    const imageBuffer = Buffer.from(base64, 'base64');
    if (imageBuffer.length === 0) {
      return NextResponse.json({ ok: false, error: 'Empty image buffer' }, { status: 400 });
    }

    console.log(`[upload-photo] START bucket=${FIREBASE_CONFIG.storageBucket} path=${path} size=${imageBuffer.length}B`);

    const app = getServerApp();
    const auth = getAuth(app);
    const storage = getStorage(app);

    // Use in-memory persistence — no browser APIs needed
    await setPersistence(auth, inMemoryPersistence);

    // Sign in anonymously so upload passes "write: if request.auth != null" rules
    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
        console.log('[upload-photo] ✅ signed in anonymously uid:', auth.currentUser?.uid);
      } catch (authErr: any) {
        console.warn('[upload-photo] ⚠️ anon sign-in failed:', authErr.code, authErr.message);
        // Continue anyway — might work if rules allow write: if true
      }
    }

    // Upload via Firebase Storage SDK (handles REST API, retries, tokens internally)
    const storageRef = ref(storage, path);
    const metadata = { contentType: mimeType };
    const uint8 = new Uint8Array(imageBuffer);

    const snapshot = await uploadBytes(storageRef, uint8, metadata);
    console.log('[upload-photo] ✅ uploadBytes done:', snapshot.metadata.fullPath);

    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('[upload-photo] ✅ url:', downloadURL.slice(0, 100));

    return NextResponse.json({ ok: true, url: downloadURL });

  } catch (err: any) {
    console.error('[upload-photo] ❌ error:', err.code ?? '', err.message);
    return NextResponse.json(
      { ok: false, error: `${err.code ?? 'unknown'}: ${err.message}` },
      { status: 502 }
    );
  }
}
