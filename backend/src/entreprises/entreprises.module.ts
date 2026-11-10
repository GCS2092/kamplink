import { Module } from '@nestjs/common';
import { EntreprisesController } from './entreprises.controller';
import { EntreprisesService } from './entreprises.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [EntreprisesController],
  providers: [EntreprisesService],
})
export class EntreprisesModule {}