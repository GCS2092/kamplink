import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || 'unknown';
    const userId = request.user?.id || 'anonymous';

    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          this.logger.log(
            `${method} ${url} ${userId} ${duration}ms - ${userAgent} ${ip}`,
          );
        },
        error: (err) => {
          const duration = Date.now() - start;
          this.logger.error(
            `${method} ${url} ${userId} ${duration}ms - ERROR: ${err.message}`,
            err.stack,
          );
        },
      }),
    );
  }
}
