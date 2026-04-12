import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { FirebaseService } from '../firebase/firebase.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
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
    profil: {
      prenom: 'John',
      nom: 'Doe',
    },
  };

  const mockDecodedToken = {
    uid: 'firebase-123',
    phone_number: '+221771234567',
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
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
            },
          },
        },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    firebaseService = module.get(FirebaseService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access with valid token', async () => {
      const mockContext = createMockContext('Bearer valid-token');
      firebaseService.verifyToken.mockResolvedValue(mockDecodedToken);
      prismaService.utilisateur.findUnique.mockResolvedValue(mockUser as any);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockContext.switchToHttp().getRequest().user).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when no authorization header', async () => {
      const mockContext = createMockContext(null);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when invalid token format', async () => {
      const mockContext = createMockContext('InvalidFormat token');

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token verification fails', async () => {
      const mockContext = createMockContext('Bearer invalid-token');
      firebaseService.verifyToken.mockRejectedValue(new Error('Invalid token'));

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const mockContext = createMockContext('Bearer valid-token');
      firebaseService.verifyToken.mockResolvedValue(mockDecodedToken);
      prismaService.utilisateur.findUnique.mockResolvedValue(null);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is banned', async () => {
      const mockContext = createMockContext('Bearer valid-token');
      firebaseService.verifyToken.mockResolvedValue(mockDecodedToken);
      prismaService.utilisateur.findUnique.mockResolvedValue({
        ...mockUser,
        estBanni: true,
      } as any);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});

function createMockContext(authHeader: string | null): ExecutionContext {
  const mockRequest = {
    headers: authHeader ? { authorization: authHeader } : {},
    user: null,
  };

  return {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
  } as ExecutionContext;
}
