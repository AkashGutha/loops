import { getApps, initializeApp } from "firebase/app";
import { getAnalytics, type Analytics } from "firebase/analytics";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import type { FirebaseApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyAefhQ4qD4BpFrgUrikcg1yDxZ0969ChM8",
  authDomain: "loops-8b0a1.firebaseapp.com",
  projectId: "loops-8b0a1",
  storageBucket: "loops-8b0a1.firebasestorage.app",
  messagingSenderId: "898173019138",
  appId: "1:898173019138:web:e37335577bd45ac701f31b",
  measurementId: "G-LLCLVFVMR4"
};

let app: FirebaseApp | null = null;

const getFirebaseApp = (): FirebaseApp => {
  if (app) return app;
  app = getApps()[0] ?? initializeApp(firebaseConfig);
  return app;
};

export const getFirebaseAuth = (): Auth => getAuth(getFirebaseApp());
export const getFirebaseDb = (): Firestore => getFirestore(getFirebaseApp());

export const getFirebaseAnalytics = (): Analytics | null => {
  if (typeof window === "undefined") return null;
  return getAnalytics(getFirebaseApp());
};

export { getFirebaseApp };
