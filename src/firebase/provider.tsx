'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { auth, firestore } from './firebase';

interface FirebaseContextState {
  firebaseApp?: FirebaseApp;
  firestore?: Firestore;
  auth?: Auth;
  user: User | null | undefined;
  isUserLoading: boolean;
  userError?: Error;
}

const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  // CRITICAL: Hooks must be called unconditionally at the top level.
  // Since auth is initialized in firebase.ts, we can pass it directly.
  const [user, isUserLoading, userError] = useAuthState(auth);

  const contextValue = useMemo((): FirebaseContextState => ({
    firebaseApp: auth?.app,
    firestore,
    auth,
    user,
    isUserLoading,
    userError,
  }), [user, isUserLoading, userError]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      {auth && <FirebaseErrorListener />}
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};
