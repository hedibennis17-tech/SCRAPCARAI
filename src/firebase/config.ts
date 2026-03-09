// Firebase configuration — hardcoded for reliability
// Project: scrpcaraiengsp-89650661-77994
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyCdS2Wkr29nuk0Vczm6pyYC815nVagwHVU",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "scrpcaraiengsp-89650661-77994.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "scrpcaraiengsp-89650661-77994",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "scrpcaraiengsp-89650661-77994.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "89650661",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};
