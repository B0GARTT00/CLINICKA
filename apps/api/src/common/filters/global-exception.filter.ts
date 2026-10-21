import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { redact, redactString } from '../logging/redact';
import { safeRequestPath } from '../middleware/request-logger.middleware';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Authentication and validation failures are expected HTTP responses, not
    // unhandled server faults. Reserve stack traces for actual server errors.
    //
    // The exception is redacted before it is logged: driver errors and thrown
    // config objects can carry connection strings, request bodies, or headers.
    if (!(exception instanceof HttpException) || status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const production = process.env.NODE_ENV === 'production';
      console.error('Unhandled exception:', production
        ? {
            name: exception instanceof Error ? exception.name : 'UnknownError',
            statusCode: status,
            path: safeRequestPath(request),
          }
        : redact(exception));
    }

    const message =
      exception instanceof HttpException && status < HttpStatus.INTERNAL_SERVER_ERROR
        // Do not reflect a credential embedded in an application-generated
        // HttpException back to a client. This also keeps the response safe if
        // a downstream library puts a connection string in its message.
        ? redactString(exception.message)
        : 'Internal server error';

    // Preserve the structured error code from `cause` (e.g. EMAIL_NOT_VERIFIED,
    // ACCOUNT_DISABLED) so clients can distinguish error types without parsing
    // human-readable messages.
    const causeCode =
      exception instanceof Error && exception.cause && typeof exception.cause === 'object'
        ? (exception.cause as { code?: string }).code
        : undefined;

    const errorResponse = {
      success: false,
      statusCode: status,
      ...(causeCode ? { code: causeCode } : {}),
      message,
      timestamp: new Date().toISOString(),
      path: safeRequestPath(request),
    };

    response.status(status).json(errorResponse);
  }
}
