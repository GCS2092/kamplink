import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { FirebaseService } from '../firebase/firebase.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let firebaseService: jest.Mocked<FirebaseService>;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-123',
    firebaseUid: 'firebase-123',
    telephone: '+221771234567',
    email: null,
    role: 'student',
    estActif: true,
    estBanni: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    profil: null,
  };

  const mockDecodedToken = {
    uid: 'firebase-123',
    phone_number: '+221771234567',
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: FirebaseService,
          useValue: {
            verifyToken: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            utilisateur: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
            profil: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    firebaseService = module.get(FirebaseService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('loginWithFirebaseToken', () => {
    it('should return existing user', async () => {
      firebaseService.verifyToken.mockResolvedValue(mockDecodedToken);
      prismaService.utilisateur.findUnique.mockResolvedValue(mockUser as any);

      const result = await service.loginWithFirebaseToken('valid-token');

      expect(result.user).toEqual(mockUser);
      expect(result.message).toBe('Profil à compléter');
      expect(firebaseService.verifyToken).toHaveBeenCalledWith('valid-token');
      expect(prismaService.utilisateur.findUnique).toHaveBeenCalledWith({
        where: { firebaseUid: 'firebase-123' },
        include: { profil: true },
      });
    });

    it('should create new user if not exists', async () => {
      firebaseService.verifyToken.mockResolvedValue(mockDecodedToken);
      prismaService.utilisateur.findUnique.mockResolvedValue(null);
      prismaService.utilisateur.create.mockResolvedValue(mockUser as any);

      const result = await service.loginWithFirebaseToken('valid-token');

      expect(prismaService.utilisateur.create).toHaveBeenCalledWith({
        data: {
          firebaseUid: 'firebase-123',
          telephone: '+221771234567',
          role: 'student',
          estActif: true,
        },
        include: { profil: true },
      });
      expect(result.user).toEqual(mockUser);
    });

    it('should throw if token verification fails', async () => {
      firebaseService.verifyToken.mockRejectedValue(new Error('Invalid token'));

      await expect(service.loginWithFirebaseToken('invalid-token')).rejects.toThrow();
    });
  });

  describe('createProfil', () => {
    const profilData = {
      prenom: 'John',
      nom: 'Doe',
      niveau: 'L1',
      universiteId: 'uni-123',
      filiereId: 'fil-123',
    };

    it('should create profile successfully', async () => {
      const mockProfil = {
        id: 'profil-123',
        utilisateurId: 'user-123',
        ...profilData,
      };
      prismaService.profil.create.mockResolvedValue(mockProfil as any);

      const result = await service.createProfil('user-123', profilData);

      expect(prismaService.profil.create).toHaveBeenCalledWith({
        data: {
          utilisateurId: 'user-123',
          prenom: 'John',
          nom: 'Doe',
          niveau: 'L1',
          universiteId: 'uni-123',
          filiereId: 'fil-123',
        },
      });
      expect(result).toEqual(mockProfil);
    });
  });
});
