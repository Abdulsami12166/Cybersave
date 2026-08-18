import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

// ponytail: use env vars, never commit credential files
let messaging: any = null;

const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
  try {
    const app = getApps().length === 0
      ? initializeApp({ credential: cert({ projectId: FIREBASE_PROJECT_ID, clientEmail: FIREBASE_CLIENT_EMAIL, privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') }) })
      : getApps()[0];
    messaging = getMessaging(app);
  } catch (error) {
    console.error('Firebase Admin Initialization Error:', error);
  }
} else {
  console.warn('Firebase env vars not set — push notifications disabled.');
}

export { messaging };
