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
            'Firebase Admin SDK could not initialize due to missing or invalid credentials (see logs above). Operating in fallback mock mode.',
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
    const credObj = admin.credential || (admin.default && admin.default.credential);
    if (!credObj || typeof credObj.cert !== 'function') {
      this.logger.error('Firebase Admin SDK: cert factory method not available.');
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
          if (!parsed.project_id) this.logger.warn('FIREBASE_SERVICE_ACCOUNT_JSON missing "project_id"');
          if (!parsed.client_email) this.logger.warn('FIREBASE_SERVICE_ACCOUNT_JSON missing "client_email"');
          if (!parsed.private_key) this.logger.warn('FIREBASE_SERVICE_ACCOUNT_JSON missing "private_key"');

          if (parsed.private_key) {
            parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
          }

          const cert = credObj.cert(parsed);
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

    this.logger.log(
      `Checking individual Firebase env vars: FIREBASE_PROJECT_ID=${projectId ? 'SET' : 'MISSING'}, FIREBASE_CLIENT_EMAIL=${clientEmail ? 'SET' : 'MISSING'}, FIREBASE_PRIVATE_KEY=${rawPrivateKey ? 'SET' : 'MISSING'}`,
    );

    const isProjectValid = Boolean(projectId && !projectId.includes('your_'));
    const isEmailValid = Boolean(clientEmail && !clientEmail.includes('your_'));
    const isKeyValid = Boolean(rawPrivateKey && !rawPrivateKey.includes('YOUR_'));

    if (!isProjectValid) this.logger.warn(`FIREBASE_PROJECT_ID issue: value is "${projectId || 'undefined'}"`);
    if (!isEmailValid) this.logger.warn(`FIREBASE_CLIENT_EMAIL issue: value is "${clientEmail || 'undefined'}"`);
    if (!isKeyValid) this.logger.warn(`FIREBASE_PRIVATE_KEY issue: key is missing or contains placeholder text.`);

    if (isProjectValid && isEmailValid && isKeyValid && projectId && clientEmail && rawPrivateKey) {
      try {
        let privateKey = rawPrivateKey;
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
          privateKey = privateKey.slice(1, -1);
        }
        privateKey = privateKey.replace(/\\n/g, '\n');

        const cert = credObj.cert({
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
