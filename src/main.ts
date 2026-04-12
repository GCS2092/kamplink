import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ─────────────────────────────────────────
  // SÉCURITÉ
  // ─────────────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  // CORS configuré pour le frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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
  console.log(`🚀 CampusLink API démarrée sur http://localhost:${port}`);
  console.log(`📚 Documentation Swagger: http://localhost:${port}/api/docs`);
}
bootstrap();