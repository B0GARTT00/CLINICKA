import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { redactString } from '../logging/redact';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(_req: Request, _res: Response, next: NextFunction): void {
    const start = Date.now();
    _res.on('finish', () => {
      const duration = Date.now() - start;
      // `path` normally excludes query values, but redact it anyway: a route
      // parameter can still contain a credential in an accidental request.
      console.log(redactString(`${_req.method} ${_req.path} - ${duration}ms`));
    });
    next();
  }
}
