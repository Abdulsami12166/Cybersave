import { bootstrapAuthService } from './auth/auth.service.app';
import { bootstrapApplicationService } from './application/application.service.app';
import { bootstrapPaymentService } from './payment/payment.service.app';
import { bootstrapDocumentService } from './document/document.service.app';
import { bootstrapAiService } from './ai/ai.service.app';
import { bootstrapAdminService } from './admin/admin.service.app';

async function bootstrapMicroservicesCluster() {
  console.log('====================================================');
  console.log('🚀 BOOTSTRAPPING CYBERSAVE MICROSERVICES CLUSTER');
  console.log('====================================================');

  try {
    // 1. Auth & User Service (Port 3001)
    await bootstrapAuthService();

    // 2. Application & Scheme Service (Port 3002)
    await bootstrapApplicationService();

    // 3. Payment & Wallet Service (Port 3003)
    await bootstrapPaymentService();

    // 4. Document Vault & KYC Service (Port 3004)
    await bootstrapDocumentService();

    // 5. AI CyberBot Service (Port 3005)
    await bootstrapAiService();

    // 6. Admin & Real-Time Gateway Service (Port 3006)
    await bootstrapAdminService();

    // 7. Gateway Proxy (Port 3000)
    require('./gateway/gateway');

    console.log('====================================================');
    console.log('✅ ALL 6 MICROSERVICES + API GATEWAY ACTIVE & READY');
    console.log('🌐 Gateway Entrypoint: http://localhost:3000');
    console.log('====================================================');
  } catch (error) {
    console.error('❌ Error starting microservices cluster:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  bootstrapMicroservicesCluster();
}
