import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';

async function bootstrap() {
  // Initialize Sentry
  const sentryDsn = process.env.SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 1.0,
      profilesSampleRate: 1.0,
    });
  }

  const app = await NestFactory.create(AppModule);

  // Derriere un reverse proxy (Render, Railway, Nginx...), definir TRUST_PROXY=1 dans .env
  // pour que req.ip soit la vraie IP du client (sinon toutes les requetes partagent l'IP du proxy)
  if (process.env.TRUST_PROXY) {
    app.getHttpAdapter().getInstance().set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
  }

  // ─────────────────────────────────────────
  // SÉCURITÉ
  // ─────────────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  // CORS configuré pour le frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });

  // ─────────────────────────────────────────
  // API VERSIONING
  // ─────────────────────────────────────────
  app.setGlobalPrefix('api/v1');
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // ─────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─────────────────────────────────────────
  // EXCEPTION FILTER GLOBAL
  // ─────────────────────────────────────────
  app.useGlobalFilters(new AllExceptionsFilter());

  // ─────────────────────────────────────────
  // LOGGING INTERCEPTOR
  // ─────────────────────────────────────────
  app.useGlobalInterceptors(new LoggingInterceptor());

  // ─────────────────────────────────────────
  // RESPONSE TRANSFORM INTERCEPTOR
  // ─────────────────────────────────────────
  app.useGlobalInterceptors(new ResponseTransformInterceptor());

  // ─────────────────────────────────────────
  // SWAGGER DOCUMENTATION
  // ─────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('CampusLink API')
    .setDescription('API pour la plateforme sociale académique CampusLink')
    .setVersion('1.0.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Entrez votre token Firebase',
    })
    .addTag('Auth', 'Authentification Firebase')
    .addTag('Users', 'Gestion des utilisateurs et profils')
    .addTag('Espaces', 'Espaces communautaires')
    .addTag('Canaux', 'Canaux de discussion')
    .addTag('Messages', 'Messages et discussions')
    .addTag('Documents', 'Partage de documents')
    .addTag('Opportunites', 'Opportunités professionnelles')
    .addTag('Notifications', 'Notifications utilisateur')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // ─────────────────────────────────────────
  // DÉMARRAGE
  // ─────────────────────────────────────────
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  
  const logger = new Logger('Bootstrap');
  logger.log(`🚀 CampusLink API démarrée sur http://localhost:${port}`);
  logger.log(`📚 Documentation Swagger: http://localhost:${port}/api/docs`);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received - closing server gracefully');
    await app.close();
    process.exit(0);
  });
}
bootstrap();