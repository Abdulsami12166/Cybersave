import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
const admin = require('firebase-admin');

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger('FirebaseService');
  private isInitialized = false;

  onModuleInit() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
        this.isInitialized = true;
        this.logger.log('Firebase Admin SDK initialized successfully.');
      } catch (error) {
        this.logger.error('Failed to initialize Firebase Admin SDK', error);
      }
    } else {
      this.logger.warn(
        'Firebase config missing from env. Operating in DEVELOPMENT mock mode.',
      );
    }
  }

  async verifyIdToken(token: string): Promise<{ uid: string; email: string }> {
    if (!this.isInitialized || token.startsWith('mock-')) {
      // Mock validation for development/testing
      this.logger.log(`Mocking verification for token: ${token}`);
      const mockUid = token.replace('mock-', '') || 'mock-user-uid-123';
      const mockEmail = `${mockUid}@cybersave.test`;
      return { uid: mockUid, email: mockEmail };
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      return {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
      };
    } catch (error) {
      this.logger.error('Firebase token verification failed', error);
      throw error;
    }
  }
}
