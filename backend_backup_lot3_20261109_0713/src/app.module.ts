import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { HttpThrottlerGuard } from './common/guards/http-throttler.guard';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { EspacesModule } from './espaces/espaces.module';
import { CanauxModule } from './canaux/canaux.module';
import { MessagesModule } from './messages/messages.module';
import { DocumentsModule } from './documents/documents.module';
import { OpportunitesModule } from './opportunites/opportunites.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SignalementsModule } from './signalements/signalements.module';
import { HealthModule } from './health/health.module';
import { SecurityModule } from './security/security.module';
import { ChatModule } from './chat/chat.module';
import { QueueModule } from './queue/queue.module';
import { SearchModule } from './search/search.module';
import { CommonModule } from './common/common.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate Limiting - 100 requêtes par minute par IP
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000, // 1 minute
          limit: 100,
        },
      ],
    }),

    // Modules Globaux
    FirebaseModule,
    PrismaModule,
    RedisModule,        // Redis Upstash - cache + sécurité
    SecurityModule,
    CommonModule,
    SearchModule,
    QueueModule,

    // Modules Métier
    AuthModule,
    UsersModule,
    EspacesModule,
    CanauxModule,
    MessagesModule,
    DocumentsModule,
    OpportunitesModule,
    NotificationsModule,
    SignalementsModule,
    ChatModule,

    // Monitoring
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: HttpThrottlerGuard }],
})
export class AppModule {}