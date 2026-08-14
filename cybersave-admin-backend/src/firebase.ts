const admin = require('firebase-admin');
import path from 'path';

// Using the provided service account JSON from the root
const serviceAccountPath = path.resolve('C:\\Cybersave\\cyberbase-d3c1b-firebase-adminsdk-fbsvc-7feb16841a.json');

try {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
  });
  console.log('Firebase Admin SDK Initialized Successfully.');
} catch (error) {
  console.error('Firebase Admin Initialization Error:', error);
}

export const messaging = admin.messaging();
