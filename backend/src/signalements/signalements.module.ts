import { Module } from '@nestjs/common';
import { SignalementsController } from './signalements.controller';
import { SignalementsService } from './signalements.service';

@Module({
  controllers: [SignalementsController],
  providers: [SignalementsService],
  exports: [SignalementsService],
})
export class SignalementsModule {}
