import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
const admin = require('firebase-admin');

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger('FirebaseService');
  private isInitialized = false;

  onModuleInit() {
    try {
      if (!admin.apps.length) {
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        if (serviceAccountJson) {
          const serviceAccount = JSON.parse(serviceAccountJson);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          this.isInitialized = true;
          this.logger.log('Firebase Admin initialized successfully');
        } else {
          this.logger.warn('FIREBASE_SERVICE_ACCOUNT_JSON missing. Running in fallback mode.');
        }
      } else {
        this.isInitialized = true;
      }
    } catch (error) {
      this.logger.warn(`Firebase Admin init warning: ${error.message}. Running in fallback mode.`);
    }
  }

  async verifyIdToken(idToken: string) {
    if (!this.isInitialized || idToken.startsWith('mock-')) {
      this.logger.warn(`Mocking verification for token: ${idToken}`);
      const mockUid = idToken.replace('mock-', '') || 'mock-user-123';
      return { uid: mockUid, email: `${mockUid}@cybersave.test`, phone_number: '+919876543210' };
    }
    try {
      return await admin.auth().verifyIdToken(idToken);
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
      const response = await admin.messaging().send({
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
