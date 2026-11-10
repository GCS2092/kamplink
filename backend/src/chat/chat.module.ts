import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { SanitizationService } from '../common/services/sanitization.service';

@Module({
  imports: [PrismaModule, FirebaseModule],
  providers: [ChatGateway, ChatService, SanitizationService],
  exports: [ChatService],
})
export class ChatModule {}
