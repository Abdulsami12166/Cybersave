import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import * as fs from 'fs';
import * as path from 'path';

let messaging: any = null;

const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
  try {
    const app = getApps().length === 0
      ? initializeApp({
          credential: cert({
            projectId: FIREBASE_PROJECT_ID,
            clientEmail: FIREBASE_CLIENT_EMAIL,
            privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
        })
      : getApps()[0];
    messaging = getMessaging(app);
    console.log('[Firebase Admin] Initialized from environment variables for project:', FIREBASE_PROJECT_ID);
  } catch (error) {
    console.error('Firebase Admin Initialization Error (env):', error);
  }
} else {
  // Discover service account JSON key file from candidate paths
  const candidateKeyFiles = [
    path.join(process.cwd(), 'cybersave-47a6e-firebase-adminsdk.json'),
    path.join(process.cwd(), 'cybersave-backend', 'cybersave-47a6e-firebase-adminsdk.json'),
    path.join(__dirname, '..', '..', 'cybersave-47a6e-firebase-adminsdk.json'),
    path.join(__dirname, '..', 'cybersave-47a6e-firebase-adminsdk.json'),
    path.join(process.cwd(), 'cyberbase-d3c1b-firebase-adminsdk-fbsvc-7feb16841a.json'),
  ];

  for (const keyPath of candidateKeyFiles) {
    if (fs.existsSync(keyPath)) {
      try {
        const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
        const app = getApps().length === 0
          ? initializeApp({
              credential: cert(keyData),
            })
          : getApps()[0];
        messaging = getMessaging(app);
        console.log(`[Firebase Admin] Initialized from key file "${path.basename(keyPath)}" for project: ${keyData.project_id}`);
        break;
      } catch (err) {
        console.warn(`[Firebase Admin] Failed loading key file "${keyPath}":`, err);
      }
    }
  }
}

/**
 * Send FCM Broadcast message to topic 'all' with high-priority Android channel configuration
 */
export async function sendFCMBroadcast(title: string, body: string, extraData?: Record<string, string>) {
  if (!messaging) {
    console.warn('[Firebase Admin] Messaging not initialized. Cannot dispatch FCM broadcast.');
    return { success: false, reason: 'Firebase Messaging not initialized' };
  }

  const payload: any = {
    topic: 'all',
    notification: {
      title,
      body,
    },
    data: {
      title,
      body,
      message: body,
      type: 'GLOBAL_PUSH',
      ...(extraData || {}),
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'cybersave_alerts_channel',
        priority: 'max',
        sound: 'default',
        defaultSound: true,
        defaultVibrateTimings: true,
        visibility: 'public',
        notificationCount: 1,
      },
    },
  };

  try {
    const res = await messaging.send(payload);
    console.log('[Firebase Admin] Successfully sent broadcast to topic "all":', res);
    return { success: true, messageId: res };
  } catch (err: any) {
    console.error('[Firebase Admin] Error broadcasting to topic "all":', err?.message || err);
    return { success: false, error: err?.message };
  }
}

/**
 * Send FCM Multicast directly to specific user device tokens
 */
export async function sendFCMToTokens(tokens: string[], title: string, body: string, extraData?: Record<string, string>) {
  if (!messaging || !tokens || tokens.length === 0) {
    return { success: false, sentCount: 0 };
  }

  const uniqueTokens = Array.from(new Set(tokens.filter((t) => typeof t === 'string' && t.trim().length > 10)));
  if (uniqueTokens.length === 0) {
    return { success: true, sentCount: 0 };
  }

  try {
    const response = await messaging.sendEachForMulticast({
      tokens: uniqueTokens,
      notification: {
        title,
        body,
      },
      data: {
        title,
        body,
        message: body,
        type: 'GLOBAL_PUSH',
        ...(extraData || {}),
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'cybersave_alerts_channel',
          priority: 'max',
          sound: 'default',
          defaultSound: true,
          defaultVibrateTimings: true,
          visibility: 'public',
          notificationCount: 1,
        },
      },
    });

    console.log(`[Firebase Admin] Multicast sent: ${response.successCount} succeeded, ${response.failureCount} failed of ${uniqueTokens.length}`);
    return { success: true, sentCount: response.successCount, failureCount: response.failureCount };
  } catch (err: any) {
    console.error('[Firebase Admin] Multicast dispatch error:', err?.message || err);
    return { success: false, error: err?.message };
  }
}

export { messaging };
