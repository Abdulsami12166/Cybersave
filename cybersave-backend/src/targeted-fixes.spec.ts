import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from './profile/profile.service';
import { PrismaService } from './database/prisma.service';
import { CloudinaryService } from './common/services/cloudinary.service';

describe('Targeted Fixes - Regression Tests', () => {
  let profileService: ProfileService;
  let prismaService: any;

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    profile: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockCloudinary = {
    uploadImage: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CloudinaryService, useValue: mockCloudinary },
      ],
    }).compile();

    profileService = module.get<ProfileService>(ProfileService);
    prismaService = module.get(PrismaService);
  });

  describe('Issue 1: Address Persistence & Display Across Sessions', () => {
    it('should return empty addresses array when citizen has no saved addresses', async () => {
      mockPrisma.profile.findUnique.mockResolvedValueOnce({
        id: 'prof_1',
        userId: '507f1f77bcf86cd799439011',
        fullName: 'Citizen User',
        addresses: null,
      });

      const result = await profileService.getProfile('507f1f77bcf86cd799439011');
      expect(result).toBeDefined();
      expect(result?.addresses).toEqual([]);
    });

    it('should return saved addresses from database for authenticated user', async () => {
      const savedAddresses = [
        {
          id: 'addr_1',
          tag: 'Home',
          houseNumber: 'Flat 401',
          building: 'Ganga Enclave',
          street: 'Main Road',
          city: 'Kanpur',
          district: 'Kanpur Nagar',
          state: 'Uttar Pradesh',
          pincode: '208001',
          isDefault: true,
        },
      ];

      mockPrisma.profile.findUnique.mockResolvedValueOnce({
        id: 'prof_1',
        userId: '507f1f77bcf86cd799439011',
        fullName: 'Ramesh Gupta',
        addresses: savedAddresses,
      });

      const result = await profileService.getProfile('507f1f77bcf86cd799439011');
      expect(result).toBeDefined();
      expect(result?.addresses).toHaveLength(1);
      expect(result?.addresses[0].tag).toBe('Home');
      expect(result?.addresses[0].pincode).toBe('208001');
    });

    it('should persist updated addresses array without losing data', async () => {
      const newAddresses = [
        {
          id: 'addr_2',
          tag: 'Work',
          houseNumber: 'Cabin 3B',
          building: 'IT Park',
          street: 'Tech Zone',
          city: 'Noida',
          district: 'Gautam Buddha Nagar',
          state: 'Uttar Pradesh',
          pincode: '201301',
          isDefault: false,
        },
      ];

      mockPrisma.profile.upsert.mockResolvedValueOnce({
        id: 'prof_1',
        userId: '507f1f77bcf86cd799439011',
        fullName: 'Ramesh Gupta',
        addresses: newAddresses,
      });

      const updated = await profileService.update('507f1f77bcf86cd799439011', {
        addresses: newAddresses,
      } as any);

      expect(mockPrisma.profile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            addresses: newAddresses,
          }),
        }),
      );
      expect(updated.addresses).toEqual(newAddresses);
    });
  });
});
