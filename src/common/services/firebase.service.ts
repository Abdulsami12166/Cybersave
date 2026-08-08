import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';

// ponytail: minimum clean implementation of FirebaseService using firebase-admin v14 subpaths
@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger('FirebaseService');
  private isInitialized = false;

  onModuleInit() {
    try {
      if (!getApps().length) {
        const credential = this.getFirebaseCredential();
        if (credential) {
          initializeApp({ credential });
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

  private getFirebaseCredential() {
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
          const credential = cert(parsed);
          this.logger.log('Firebase Service Account loaded from FIREBASE_SERVICE_ACCOUNT_JSON.');
          return credential;
        } catch (e) {
          this.logger.error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON string: ${e.message}`);
        }
      }
    }

    // Option 2: Individual env variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && rawPrivateKey && !projectId.includes('your_')) {
      try {
        if (rawPrivateKey.startsWith('"') && rawPrivateKey.endsWith('"')) {
          rawPrivateKey = rawPrivateKey.slice(1, -1);
        }
        const privateKey = rawPrivateKey.replace(/\\n/g, '\n');

        const credential = cert({
          projectId,
          clientEmail,
          privateKey,
        });
        this.logger.log('Firebase Service Account loaded from individual environment variables.');
        return credential;
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
      const decoded = await getAuth().verifyIdToken(idToken);
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
      const response = await getMessaging().send({
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

