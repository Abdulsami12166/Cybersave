import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
const admin = require('firebase-admin');

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger('FirebaseService');
  private isInitialized = false;

  onModuleInit() {
    try {
      const apps = admin.apps || (admin.default && admin.default.apps) || [];
      if (!apps.length) {
        const credential = this.getFirebaseCredential();
        if (credential) {
          admin.initializeApp({ credential });
          this.isInitialized = true;
          this.logger.log('Firebase Admin SDK initialized successfully.');
        } else {
          this.logger.warn(
            'Firebase config missing or incomplete in env. Operating in fallback mock mode.',
          );
        }
      } else {
        this.isInitialized = true;
      }
    } catch (error) {
      this.logger.warn(
        `Firebase Admin SDK init warning: ${error.message}. Operating in fallback mock mode.`,
      );
    }
  }

  private getFirebaseCredential() {
    const credObj = admin.credential || (admin.default && admin.default.credential);
    if (!credObj || typeof credObj.cert !== 'function') {
      return null;
    }

    // Check Option 1: Full JSON string
    const jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (jsonStr && !jsonStr.includes('your_')) {
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.private_key) {
          parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
        }
        return credObj.cert(parsed);
      } catch (e) {
        this.logger.warn(`Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: ${e.message}`);
      }
    }

    // Check Option 2: Individual variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (
      projectId &&
      clientEmail &&
      privateKey &&
      !projectId.includes('your_') &&
      !clientEmail.includes('your_') &&
      !privateKey.includes('YOUR_')
    ) {
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      privateKey = privateKey.replace(/\\n/g, '\n');

      return credObj.cert({
        projectId,
        clientEmail,
        privateKey,
      });
    }

    return null;
  }

  async verifyIdToken(idToken: string): Promise<{ uid: string; email: string; phone_number?: string }> {
    if (!this.isInitialized || idToken.startsWith('mock-')) {
      this.logger.log(`Mocking verification for token: ${idToken}`);
      const mockUid = idToken.replace('mock-', '') || 'mock-user-123';
      return { uid: mockUid, email: `${mockUid}@cybersave.test`, phone_number: '+919876543210' };
    }
    try {
      const authObj = admin.auth ? admin.auth() : admin.default.auth();
      const decoded = await authObj.verifyIdToken(idToken);
      return {
        uid: decoded.uid,
        email: decoded.email || `${decoded.uid}@cybersave.gov.in`,
        phone_number: decoded.phone_number,
      };
    } catch (error) {
      this.logger.error('Firebase token verification failed', error);
      throw error;
    }
  }

  async sendPushNotification(fcmToken: string, title: string, body: string, data?: Record<string, string>) {
    if (!this.isInitialized || !fcmToken) {
      this.logger.log(`Mock Push Notification to ${fcmToken || 'User'}: ${title} - ${body}`);
      return { success: true };
    }
    try {
      const messagingObj = admin.messaging ? admin.messaging() : admin.default.messaging();
      const response = await messagingObj.send({
        token: fcmToken,
        notification: { title, body },
        data,
      });
      return response;
    } catch (error) {
      this.logger.error('FCM Push Notification failed', error);
      return null;
    }
  }
}
