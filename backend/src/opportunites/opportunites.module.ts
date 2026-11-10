import { Module } from '@nestjs/common';
import { OpportunitesController } from './opportunites.controller';
import { OpportunitesService } from './opportunites.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [OpportunitesController],
  providers: [OpportunitesService],
  exports: [OpportunitesService],
})
export class OpportunitesModule {}