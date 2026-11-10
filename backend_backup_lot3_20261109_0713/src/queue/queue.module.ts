import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueService } from './queue.service';
import { NotificationProcessor } from './processors/notification.processor';
import { EmailProcessor } from './processors/email.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [
    // Using in-memory Bull queue (no Redis required)
    BullModule.forRoot({
      redis: undefined, // In-memory mode
    }),
    BullModule.registerQueue({
      name: 'notifications',
    }),
    BullModule.registerQueue({
      name: 'emails',
    }),
    BullModule.registerQueue({
      name: 'exports',
    }),
    PrismaModule,
    FirebaseModule,
  ],
  providers: [QueueService, NotificationProcessor, EmailProcessor],
  exports: [QueueService],
})
export class QueueModule {}
