import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID || 'skillstamp-web-app';
const emulated = process.env.FIREBASE_AUTH_EMULATOR_HOST && process.env.FIRESTORE_EMULATOR_HOST;
if (process.env.NODE_ENV === 'production' && (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST)) {
  throw new Error('Firebase emulators must not be enabled in production.');
}
const app = initializeApp(emulated ? { projectId } : { projectId, credential: applicationDefault() });
export const firebaseAuth = getAuth(app);
export const db = getFirestore(app);
