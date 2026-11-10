import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/health (GET) - should return health status', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBeDefined();
        expect(res.body.timestamp).toBeDefined();
      });
  });

  it('/api/v1/auth/login (POST) - should reject invalid token format', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ idToken: 'invalid-token' })
      .expect(401);
  });

  it('/api/v1/users/universites (GET) - should return universities list', () => {
    return request(app.getHttpServer())
      .get('/api/v1/users/universites')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });
});
