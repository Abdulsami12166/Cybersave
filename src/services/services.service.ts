import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ServicesService implements OnModuleInit {
  private readonly logger = new Logger('ServicesService');

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultServices();
  }

  private async seedDefaultServices() {
    try {
      const count = await this.prisma.service.count();
      if (count > 0) return;

      this.logger.log('Seeding default Cybersave government services...');

      const defaultServices = [
        {
          slug: 'aadhaar-update',
          title: 'Aadhaar Services',
          description: 'UIDAI Official Central Services for address, mobile, name updates',
          category: 'Government',
          department: 'UIDAI Central Authority',
          fee: 50.0,
          processingTime: '5-7 Days',
          eligibility: ['Citizen of India', 'Valid ID & Address proof'],
          requiredDocs: ['Aadhaar Card', 'Proof of Address (Utility bill/Rent agreement)'],
          iconName: 'shield-account-outline',
          colorHex: '#2F6BFF',
        },
        {
          slug: 'pan-card',
          title: 'PAN Card Services',
          description: 'Income Tax Department - New PAN, corrections, reprint & linking',
          category: 'Government',
          department: 'Income Tax Department',
          fee: 50.0,
          processingTime: '7-10 Days',
          eligibility: ['Individual / Indian Resident'],
          requiredDocs: ['Identity Proof (Aadhaar)', 'Date of Birth Proof'],
          iconName: 'card-account-details-outline',
          colorHex: '#00A86B',
        },
        {
          slug: 'birth-certificate',
          title: 'Birth Certificate',
          description: 'Official certified document issued by Municipal Registrar',
          category: 'Government',
          department: 'Municipal Corporation',
          fee: 50.0,
          processingTime: '7-15 Days',
          eligibility: ['Citizen of India', 'Birth occurred within state limits'],
          requiredDocs: ['Hospital Discharge Slip', 'Parent ID Proof (Aadhaar/PAN)'],
          iconName: 'baby-carriage',
          colorHex: '#2F6BFF',
        },
        {
          slug: 'income-certificate',
          title: 'Income Certificate',
          description: 'State Revenue Department Income Verification Certificate',
          category: 'Government',
          department: 'Revenue Department',
          fee: 30.0,
          processingTime: '7-10 Days',
          eligibility: ['Resident of State'],
          requiredDocs: ['Salary Slip / Income Tax Return', 'Aadhaar Card'],
          iconName: 'trending-up',
          colorHex: '#10B981',
        },
        {
          slug: 'caste-certificate',
          title: 'Caste Certificate',
          description: 'Official Community / Caste Verification Certificate',
          category: 'Government',
          department: 'Revenue Department',
          fee: 50.0,
          processingTime: '10-12 Days',
          eligibility: ['Resident of State'],
          requiredDocs: ['Paternal Caste Proof', 'Aadhaar Card'],
          iconName: 'account-group-outline',
          colorHex: '#F59E0B',
        },
        {
          slug: 'utility-bills',
          title: 'Electricity & Water Bills',
          description: 'Pay State & Central Electricity & Water invoices',
          category: 'Finance',
          department: 'Electricity Board',
          fee: 0.0,
          processingTime: 'Instant',
          eligibility: ['Consumer Account Holder'],
          requiredDocs: ['Consumer Account Number'],
          iconName: 'receipt-text-outline',
          colorHex: '#FF5B73',
        },
      ];

      for (const service of defaultServices) {
        await this.prisma.service.create({ data: service });
      }

      this.logger.log('Default Cybersave services seeded successfully.');
    } catch (error) {
      this.logger.warn(`Services seeding deferred: ${error.message}`);
    }
  }

  async getAllServices(category?: string) {
    try {
      if (category && category !== 'All') {
        return await this.prisma.service.findMany({
          where: { category, isActive: true },
        });
      }
      return await this.prisma.service.findMany({ where: { isActive: true } });
    } catch (error) {
      this.logger.warn(`Database query fallback for services: ${error.message}`);
      return [];
    }
  }

  async getServiceBySlug(slug: string) {
    try {
      return await this.prisma.service.findUnique({ where: { slug } });
    } catch (error) {
      return null;
    }
  }

  async getServiceById(id: string) {
    try {
      return await this.prisma.service.findUnique({ where: { id } });
    } catch (error) {
      return null;
    }
  }
}
