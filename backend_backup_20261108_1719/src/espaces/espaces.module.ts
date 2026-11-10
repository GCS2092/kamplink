import { Module } from '@nestjs/common';
import { EspacesController } from './espaces.controller';
import { EspacesService } from './espaces.service';

@Module({
  controllers: [EspacesController],
  providers: [EspacesService],
  exports: [EspacesService],
})
export class EspacesModule {}
