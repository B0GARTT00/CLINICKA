import { EventEmitter } from 'node:events';
import { RequestLoggerMiddleware } from './request-logger.middleware';

describe('RequestLoggerMiddleware', () => {
  it('does not log verification tokens from query parameters', () => {
    const logger = new RequestLoggerMiddleware();
    const response = Object.assign(new EventEmitter(), { statusCode: 200 });
    const log = jest.spyOn(console, 'log').mockImplementation();
    const next = jest.fn();
    logger.use({ method: 'GET', path: '/api/v1/auth/verify-email', url: '/api/v1/auth/verify-email?token=secret' } as never, response as never, next);
    response.emit('finish');
    expect(next).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/^GET \/api\/v1\/auth\/verify-email 200 - \d+ms$/));
    expect(log).not.toHaveBeenCalledWith(expect.stringContaining('secret'));
    log.mockRestore();
  });

  it('logs the route template without identifiers, query values, headers, or bodies', () => {
    const logger = new RequestLoggerMiddleware();
    const response = Object.assign(new EventEmitter(), { statusCode: 403 });
    const log = jest.spyOn(console, 'log').mockImplementation();
    const request = {
      method: 'GET',
      path: '/api/v1/documents/123e4567-e89b-42d3-a456-426614174000',
      url: '/api/v1/documents/123e4567-e89b-42d3-a456-426614174000?token=secret',
      baseUrl: '/api/v1/documents',
      route: { path: '/:id' },
      headers: { authorization: 'Bearer private-token' },
      body: { diagnosis: 'private diagnosis', password: 'hunter2' },
    };

    logger.use(request as never, response as never, jest.fn());
    response.emit('finish');

    const output = JSON.stringify(log.mock.calls);
    expect(output).toContain('/api/v1/documents/:id');
    for (const privateValue of ['123e4567', 'secret', 'private-token', 'private diagnosis', 'hunter2']) {
      expect(output).not.toContain(privateValue);
    }
    log.mockRestore();
  });
});
