import { Module } from '@nestjs/common';
import { SecurityService } from './security.service';
import { IpBlockerGuard } from './ip-blocker.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SecurityService, IpBlockerGuard],
  exports: [SecurityService, IpBlockerGuard],
})
export class SecurityModule {}
