import { Module } from '@nestjs/common';
import { CanauxController } from './canaux.controller';
import { CanauxService } from './canaux.service';

@Module({
  controllers: [CanauxController],
  providers: [CanauxService],
  exports: [CanauxService],
})
export class CanauxModule {}
