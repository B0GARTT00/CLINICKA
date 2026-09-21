import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return new Observable((observer) => {
      const subscription = next.handle().subscribe({
        next: (data) => observer.next({ success: true, data }),
        error: (err) => observer.error(err),
        complete: () => observer.complete(),
      });
      return { unsubscribe: () => subscription.unsubscribe() };
    });
  }
}
