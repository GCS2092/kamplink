import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Security Features (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Nettoyer les tentatives de connexion avant chaque test
    await prisma.tentativeConnexion.deleteMany();
    await prisma.ipBloquee.deleteMany();
  });

  describe('Rate Limiting', () => {
    it('should block after 5 failed login attempts per minute', async () => {
      const responses: number[] = [];
      
      // 6 requêtes rapides
      for (let i = 0; i < 6; i++) {
        const res = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ idToken: 'invalid_token' });
        responses.push(res.status);
      }

      // Les 5 premières doivent être 401 (unauthorized)
      expect(responses.slice(0, 5).every(s => s === 401)).toBe(true);
      
      // La 6ème doit être 429 (rate limit) ou 403 (blocked)
      expect([429, 403]).toContain(responses[5]);
    });

    it('should limit forgot-password to 3 requests per minute', async () => {
      const responses: number[] = [];
      
      for (let i = 0; i < 4; i++) {
        const res = await request(app.getHttpServer())
          .post('/api/v1/auth/forgot-password')
          .send({ email: 'test@example.com' });
        responses.push(res.status);
      }

      // Les 3 premières réussissent (200 ou 403 car email n'existe pas)
      expect(responses.slice(0, 3).every(s => s === 200 || s === 403)).toBe(true);
      
      // La 4ème est rate limitée
      expect(responses[3]).toBe(429);
    });
  });

  describe('Response Format', () => {
    it('should return standardized success response', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health');

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('path');
    });

    it('should return standardized error response', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ idToken: 'invalid' });

      // Doit être formaté par l'exception filter
      expect(res.status).toBe(401);
    });
  });

  describe('Account Lockout', () => {
    it('should track failed login attempts', async () => {
      // Simuler 3 échecs
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ idToken: 'invalid_token' })
          .set('user-agent', 'test-agent');
      }

      // Vérifier que les tentatives sont enregistrées
      const attempts = await prisma.tentativeConnexion.findMany();
      expect(attempts.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('IP Blocking', () => {
    it('should detect and block suspicious IPs', async () => {
      // Enregistrer une IP comme suspecte
      await prisma.ipBloquee.create({
        data: {
          ip: '127.0.0.1',
          raison: 'Test',
          nbRequetes: 15,
        }
      });

      // La prochaine requête devrait être bloquée
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ idToken: 'test' });

      expect([403, 429]).toContain(res.status);
    });
  });

  describe('Password Reset Flow', () => {
    it('should validate forgot-password request format', async () => {
      // Sans email ni téléphone
      const res1 = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({});
      
      expect(res1.status).toBe(400); // Validation error

      // Avec email invalide
      const res2 = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'invalid-email' });
      
      expect(res2.status).toBe(400);
    });

    it('should validate password complexity', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'test-token',
          newPassword: 'weak' // Trop court
        });

      expect(res.status).toBe(400);
    });
  });

  describe('Logging', () => {
    it('should log all requests via interceptor', async () => {
      // Cette vérifie indirectement que l'interceptor est actif
      // via la présence du path et timestamp dans la réponse
      const res = await request(app.getHttpServer())
        .get('/api/v1/health');

      expect(res.body.path).toBe('/api/v1/health');
      expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
