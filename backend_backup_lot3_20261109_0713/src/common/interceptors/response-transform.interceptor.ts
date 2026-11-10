import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  statusCode: number;
  timestamp: string;
  path: string;
}

@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const path = request.url;
    const statusCode = context.switchToHttp().getResponse().statusCode;

    return next.handle().pipe(
      map((data) => {
        // Détecter si c'est une réponse paginée
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          return {
            success: true,
            message: 'Opération réussie',
            data: data.data,
            meta: data.meta,
            statusCode,
            timestamp: new Date().toISOString(),
            path,
          };
        }

        // Réponse standard
        return {
          success: true,
          message: this.getSuccessMessage(statusCode),
          data: data || null,
          statusCode,
          timestamp: new Date().toISOString(),
          path,
        };
      }),
    );
  }

  private getSuccessMessage(statusCode: number): string {
    switch (statusCode) {
      case 201:
        return 'Ressource créée avec succès';
      case 204:
        return 'Ressource supprimée avec succès';
      default:
        return 'Opération réussie';
    }
  }
}
