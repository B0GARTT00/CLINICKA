import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { clearRegisteredSecrets, registerSecretValue } from '../logging/redact';
import { GlobalExceptionFilter } from './global-exception.filter';

function hostFor(url = '/api/v1/patients') {
  const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const request = { url };
  return {
    host: { switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }) } as unknown as ArgumentsHost,
    response,
  };
}

function adapterHost() {
  return {} as HttpAdapterHost;
}

describe('GlobalExceptionFilter', () => {
  let error: jest.SpyInstance;

  beforeEach(() => {
    error = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    error.mockRestore();
    clearRegisteredSecrets();
  });

  it('answers 500 with a generic message for an unexpected failure', () => {
    const { host, response } = hostFor();
    new GlobalExceptionFilter(adapterHost()).catch(new Error('boom'), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, statusCode: 500, message: 'Internal server error' }),
    );
  });

  it('does not log an expected client error as a server fault', () => {
    const { host } = hostFor();
    new GlobalExceptionFilter(adapterHost()).catch(new HttpException('nope', 400), host);

    expect(error).not.toHaveBeenCalled();
  });

  it('redacts a configured signing secret carried on an unhandled exception', () => {
    // `JwtSecrets` registers the live secrets with the redactor at startup, so a
    // secret that reaches an error message in plain prose is still masked.
    const secret = 'kQ7#vZ2!pR9@xW4$mB6&nH3*jL8^dF5%';
    registerSecretValue(secret);
    const { host } = hostFor();

    new GlobalExceptionFilter(adapterHost()).catch(
      Object.assign(new Error(`failed using secret ${secret}`), { apiKey: secret, password: 'hunter2' }),
      host,
    );

    const logged = JSON.stringify(error.mock.calls);
    expect(logged).not.toContain(secret);
    expect(logged).not.toContain('hunter2');
    expect(error).toHaveBeenCalled();
  });

  it('never echoes a configured secret in the response body', () => {
    const secret = 'kQ7#vZ2!pR9@xW4$mB6&nH3*jL8^dF5%';
    registerSecretValue(secret);
    const { host, response } = hostFor();

    new GlobalExceptionFilter(adapterHost()).catch(new Error(`db rejected ${secret}`), host);

    expect(JSON.stringify(response.json.mock.calls)).not.toContain(secret);
  });
});
