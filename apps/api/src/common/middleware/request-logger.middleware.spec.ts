import { EventEmitter } from 'node:events';
import { RequestLoggerMiddleware } from './request-logger.middleware';

describe('RequestLoggerMiddleware', () => {
  it('does not log verification tokens from query parameters', () => {
    const logger = new RequestLoggerMiddleware();
    const response = new EventEmitter();
    const log = jest.spyOn(console, 'log').mockImplementation();
    const next = jest.fn();
    logger.use({ method: 'GET', path: '/api/v1/auth/verify-email', url: '/api/v1/auth/verify-email?token=secret' } as never, response as never, next);
    response.emit('finish');
    expect(next).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/^GET \/api\/v1\/auth\/verify-email - \d+ms$/));
    expect(log).not.toHaveBeenCalledWith(expect.stringContaining('secret'));
    log.mockRestore();
  });
});
