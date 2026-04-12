import { Module } from '@nestjs/common';
import { SanitizationService } from './services/sanitization.service';

@Module({
  providers: [SanitizationService],
  exports: [SanitizationService],
})
export class CommonModule {}
