import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(_req: Request, _res: Response, next: NextFunction): void {
    const start = Date.now();
    _res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${_req.method} ${_req.path} - ${duration}ms`);
    });
    next();
  }
}
