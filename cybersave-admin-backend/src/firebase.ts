import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import path from 'path';
import fs from 'fs';

// Using the provided service account JSON from the root
const serviceAccountPath = path.resolve('C:\\Cybersave\\cyberbase-d3c1b-firebase-adminsdk-fbsvc-7feb16841a.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

let app;
try {
  app = initializeApp({
    credential: cert(serviceAccount),
  });
  console.log('Firebase Admin SDK Initialized Successfully.');
} catch (error) {
  console.error('Firebase Admin Initialization Error:', error);
}

export const messaging = app ? getMessaging(app) : null;
