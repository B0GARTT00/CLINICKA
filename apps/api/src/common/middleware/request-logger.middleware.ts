import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { redactString } from '../logging/redact';

const UUID_SEGMENT = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const OPAQUE_SEGMENT = /\/[A-Za-z0-9_-]{24,}(?=\/|$)/g;

export function safeRequestPath(request: Partial<Pick<Request, 'path' | 'route' | 'baseUrl' | 'url'>>): string {
  const routePath = typeof request.route?.path === 'string' ? request.route.path : undefined;
  const path = routePath
    ? `${request.baseUrl || ''}${routePath}`
    : request.path || request.url?.split('?')[0] || '/';
  return redactString(path.replace(UUID_SEGMENT, ':id').replace(OPAQUE_SEGMENT, '/:id'));
}

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(_req: Request, _res: Response, next: NextFunction): void {
    const start = Date.now();
    _res.on('finish', () => {
      const duration = Date.now() - start;
      // Deliberately omit headers, query parameters, route parameters and the
      // request body. Only the route template (or a normalised fallback path)
      // is useful for operational telemetry.
      console.log(`${_req.method} ${safeRequestPath(_req)} ${_res.statusCode} - ${duration}ms`);
    });
    next();
  }
}
