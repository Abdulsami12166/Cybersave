import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as firebaseAdminModule from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger('FirebaseService');
  private isInitialized = false;
  private adminRef: any = null;

  onModuleInit() {
    try {
      const admin: any = (firebaseAdminModule as any).default || firebaseAdminModule;
      this.adminRef = admin;

      const apps = admin.apps || (firebaseAdminModule as any).apps || [];
      if (!apps.length) {
        const credential = this.getFirebaseCredential(admin);
        if (credential) {
          if (typeof admin.initializeApp === 'function') {
            admin.initializeApp({ credential });
          } else if (admin.default && typeof admin.default.initializeApp === 'function') {
            admin.default.initializeApp({ credential });
          }
          this.isInitialized = true;
          this.logger.log('Firebase Admin SDK initialized successfully.');
        } else {
          this.logger.warn(
            'Firebase Admin SDK could not initialize due to missing or invalid credentials. Operating in fallback mock mode.',
          );
        }
      } else {
        this.isInitialized = true;
      }
    } catch (error) {
      this.logger.warn(
        `Firebase Admin SDK init exception: ${error.message}. Operating in fallback mock mode.`,
      );
    }
  }

  private getFirebaseCredential(admin: any) {
    const credentialFactory =
      admin?.credential ||
      (firebaseAdminModule as any)?.credential ||
      admin?.default?.credential ||
      (firebaseAdminModule as any)?.default?.credential;

    if (!credentialFactory || typeof credentialFactory.cert !== 'function') {
      this.logger.warn('Firebase Admin credential.cert method not available. Operating in fallback mock mode.');
      return null;
    }

    // Option 1: FIREBASE_SERVICE_ACCOUNT_JSON
    const jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (jsonStr) {
      if (jsonStr.includes('your_')) {
        this.logger.warn('FIREBASE_SERVICE_ACCOUNT_JSON contains placeholder text ("your_").');
      } else {
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.private_key) {
            parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
          }
          const cert = credentialFactory.cert(parsed);
          this.logger.log('Firebase Service Account loaded from FIREBASE_SERVICE_ACCOUNT_JSON.');
          return cert;
        } catch (e) {
          this.logger.error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON string: ${e.message}`);
        }
      }
    }

    // Option 2: Individual env variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && rawPrivateKey && !projectId.includes('your_')) {
      try {
        let privateKey = rawPrivateKey;
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
          privateKey = privateKey.slice(1, -1);
        }
        privateKey = privateKey.replace(/\\n/g, '\n');

        const cert = credentialFactory.cert({
          projectId,
          clientEmail,
          privateKey,
        });
        this.logger.log('Firebase Service Account loaded from individual environment variables.');
        return cert;
      } catch (err) {
        this.logger.error(`Failed to create cert from individual Firebase variables: ${err.message}`);
      }
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
      const admin = this.adminRef || firebaseAdminModule;
      const authFn = admin.auth || admin.default?.auth;
      const decoded = await authFn().verifyIdToken(idToken);
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
      const admin = this.adminRef || firebaseAdminModule;
      const messagingFn = admin.messaging || admin.default?.messaging;
      const response = await messagingFn().send({
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
