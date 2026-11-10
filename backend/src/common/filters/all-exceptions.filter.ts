import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/node';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Erreur interne du serveur';
    let error = 'InternalServerError';
    let extra: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
        error = exception.name;
      } else {
        const r = res as any;
        message = r.message ?? exception.message;
        error = r.error ?? exception.name;
        if (r.retryAfter !== undefined) extra = { retryAfter: r.retryAfter };
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'Cette ressource existe déjà';
          error = 'Conflict';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Ressource introuvable';
          error = 'NotFound';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Référence invalide';
          error = 'BadRequest';
          break;
      }
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status}`,
        exception instanceof Error ? exception.stack : 'Unknown error',
      );
      Sentry.captureException(exception);
    } else {
      this.logger.warn(`${request.method} ${request.url} - ${status}`);
    }

    response.status(status).json({
      success: false,
      message,
      error,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...extra,
    });
  }
}