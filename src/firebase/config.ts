// Firebase configuration
// Uses environment variables in production, falls back to hardcoded values for development
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBGz8j572klRVWrvgKrfr9Gkpb5v2coGBc",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-2680655679-36c60.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-2680655679-36c60",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "studio-2680655679-36c60.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "698672764159",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:698672764159:web:c796c6f87bfc3e6b8ea8ca",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-S0X2TTCY1Y",
};
