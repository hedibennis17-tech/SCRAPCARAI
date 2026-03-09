'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';

/** Initiate anonymous sign-in (non-blocking, error-safe). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  // Wrapped in .catch so auth/admin-restricted-operation never crashes the app
  signInAnonymously(authInstance).catch((err) => {
    console.warn('[auth] Anonymous sign-in unavailable (enable it in Firebase Console → Authentication → Sign-in methods):', err.code);
  });
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): void {
  createUserWithEmailAndPassword(authInstance, email, password);
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  signInWithEmailAndPassword(authInstance, email, password);
}
