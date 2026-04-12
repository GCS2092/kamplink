import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-123',
    firebaseUid: 'firebase-123',
    telephone: '+221771234567',
    role: 'student',
    estActif: true,
    estBanni: false,
  };

  const mockProfil = {
    id: 'profil-123',
    utilisateurId: 'user-123',
    prenom: 'John',
    nom: 'Doe',
    niveau: 'L1',
    universiteId: 'uni-123',
    filiereId: 'fil-123',
    avatarUrl: null,
    scoreReputation: 0,
    statutVerification: 'pending',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            profil: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            utilisateur: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            universite: {
              findUnique: jest.fn(),
            },
            filiere: {
              findFirst: jest.fn(),
            },
            verification: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProfile', () => {
    const createDto = {
      prenom: 'John',
      nom: 'Doe',
      niveau: 'L1' as const,
      universiteId: 'uni-123',
      filiereId: 'fil-123',
    };

    it('should create profile successfully', async () => {
      prismaService.profil.findUnique.mockResolvedValue(null);
      prismaService.universite.findUnique.mockResolvedValue({ id: 'uni-123' } as any);
      prismaService.filiere.findFirst.mockResolvedValue({ id: 'fil-123' } as any);
      prismaService.profil.create.mockResolvedValue(mockProfil as any);

      const result = await service.createProfile('user-123', createDto);

      expect(result).toEqual(mockProfil);
      expect(prismaService.profil.create).toHaveBeenCalledWith({
        data: {
          utilisateurId: 'user-123',
          prenom: 'John',
          nom: 'Doe',
          niveau: 'L1',
          universiteId: 'uni-123',
          filiereId: 'fil-123',
        },
        include: {
          universite: true,
          filiere: true,
        },
      });
    });

    it('should throw ConflictException if profile already exists', async () => {
      prismaService.profil.findUnique.mockResolvedValue(mockProfil as any);

      await expect(service.createProfile('user-123', createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if universite not found', async () => {
      prismaService.profil.findUnique.mockResolvedValue(null);
      prismaService.universite.findUnique.mockResolvedValue(null);

      await expect(service.createProfile('user-123', createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if filiere not found', async () => {
      prismaService.profil.findUnique.mockResolvedValue(null);
      prismaService.universite.findUnique.mockResolvedValue({ id: 'uni-123' } as any);
      prismaService.filiere.findFirst.mockResolvedValue(null);

      await expect(service.createProfile('user-123', createDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      prismaService.profil.findUnique.mockResolvedValue(mockProfil as any);

      const result = await service.getProfile('user-123');

      expect(result).toEqual(mockProfil);
    });

    it('should throw NotFoundException if profile not found', async () => {
      prismaService.profil.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPublicProfile', () => {
    it('should return public profile data', async () => {
      prismaService.profil.findUnique.mockResolvedValue({
        prenom: 'John',
        nom: 'Doe',
        avatarUrl: null,
        niveau: 'L1',
        scoreReputation: 0,
        statutVerification: 'pending',
        universite: { nom: 'UCAD', ville: 'Dakar' },
        filiere: { nom: 'Informatique' },
      } as any);

      const result = await service.getPublicProfile('user-123');

      expect(result.prenom).toBe('John');
      expect(result.nom).toBe('Doe');
      expect(result.universite.nom).toBe('UCAD');
    });
  });

  describe('banUser / unbanUser', () => {
    it('should ban user successfully', async () => {
      prismaService.utilisateur.findUnique.mockResolvedValue(mockUser as any);
      prismaService.utilisateur.update.mockResolvedValue({
        ...mockUser,
        estBanni: true,
      } as any);

      const result = await service.banUser('user-123', 'admin-123', 'Spam');

      expect(result.estBanni).toBe(true);
    });

    it('should unban user successfully', async () => {
      prismaService.utilisateur.findUnique.mockResolvedValue({
        ...mockUser,
        estBanni: true,
      } as any);
      prismaService.utilisateur.update.mockResolvedValue({
        ...mockUser,
        estBanni: false,
      } as any);

      const result = await service.unbanUser('user-123', 'admin-123');

      expect(result.estBanni).toBe(false);
    });
  });
});
