import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';
import { RedisThrottlerGuard } from './redis-throttler.guard';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisService, RedisThrottlerGuard],
  exports: [RedisService, RedisThrottlerGuard],
})
export class RedisModule {}
