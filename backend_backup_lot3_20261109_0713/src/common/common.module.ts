import { Global, Module } from '@nestjs/common';
import { SanitizationService } from './services/sanitization.service';
import { CanalAccessService } from './services/canal-access.service';

@Global()
@Module({
  providers: [SanitizationService, CanalAccessService],
  exports: [SanitizationService, CanalAccessService],
})
export class CommonModule {}