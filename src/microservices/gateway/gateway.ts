import express, { Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import http from 'http';

const app = express();
const server = http.createServer(app);

// Microservices Host & Port Mapping
const AUTH_SERVICE_URL        = process.env.AUTH_SERVICE_URL        || 'http://localhost:3001';
const APPLICATION_SERVICE_URL = process.env.APPLICATION_SERVICE_URL || 'http://localhost:3002';
const PAYMENT_SERVICE_URL     = process.env.PAYMENT_SERVICE_URL     || 'http://localhost:3003';
const DOCUMENT_SERVICE_URL    = process.env.DOCUMENT_SERVICE_URL    || 'http://localhost:3004';
const AI_SERVICE_URL          = process.env.AI_SERVICE_URL          || 'http://localhost:3005';
const ADMIN_SERVICE_URL       = process.env.ADMIN_SERVICE_URL       || 'http://localhost:3006';

// Global Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());

// Health Check Aggregator
app.get('/health', async (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    gateway: 'Cybersave Unified API Gateway v2.0',
    timestamp: new Date().toISOString(),
    services: {
      auth: AUTH_SERVICE_URL,
      application: APPLICATION_SERVICE_URL,
      payment: PAYMENT_SERVICE_URL,
      document: DOCUMENT_SERVICE_URL,
      ai: AI_SERVICE_URL,
      admin: ADMIN_SERVICE_URL,
    },
  });
});

// 1. Auth & User Service Proxy (/auth, /user, /profile)
app.use(
  ['/api/v1/auth', '/api/auth', '/auth', '/api/v1/user', '/api/v1/users', '/api/v1/profile', '/api/profile', '/profile'],
  createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    ws: false,
  })
);

// 2. Application & Scheme Service Proxy (/applications, /services)
app.use(
  ['/api/v1/applications', '/api/applications', '/applications', '/api/v1/services', '/api/services', '/services'],
  createProxyMiddleware({
    target: APPLICATION_SERVICE_URL,
    changeOrigin: true,
    ws: false,
  })
);

// 3. Payment & Wallet Service Proxy (/wallet, /payment)
app.use(
  ['/api/v1/wallet', '/api/wallet', '/wallet', '/api/v1/payment', '/api/payment', '/payment'],
  createProxyMiddleware({
    target: PAYMENT_SERVICE_URL,
    changeOrigin: true,
    ws: false,
  })
);

// 4. Document Vault & KYC Service Proxy (/documents, /aadhaar)
app.use(
  ['/api/v1/documents', '/api/documents', '/documents', '/api/v1/aadhaar', '/api/aadhaar', '/aadhaar'],
  createProxyMiddleware({
    target: DOCUMENT_SERVICE_URL,
    changeOrigin: true,
    ws: false,
  })
);

// 5. AI CyberBot Service Proxy (/ai)
app.use(
  ['/api/v1/ai', '/api/ai', '/ai'],
  createProxyMiddleware({
    target: AI_SERVICE_URL,
    changeOrigin: true,
    ws: false,
  })
);

// 6. Admin & Real-Time Gateway Proxy (/admin, /support, /notifications, socket.io)
app.use(
  ['/api/v1/admin', '/api/admin', '/admin', '/api/v1/support', '/api/support', '/support', '/api/v1/notifications', '/api/notifications', '/notifications', '/socket.io'],
  createProxyMiddleware({
    target: ADMIN_SERVICE_URL,
    changeOrigin: true,
    ws: true,
  })
);

const PORT = parseInt(process.env.GATEWAY_PORT || process.env.PORT || '3000', 10);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Cybersave Gateway] Running on http://0.0.0.0:${PORT}`);
  console.log(`[Cybersave Gateway] Proxying /api/v1 to microservices (Ports 3001-3006)`);
});
