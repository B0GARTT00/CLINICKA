import { describeError } from './email.service';

describe('describeError', () => {
  it('surfaces the code and every cause of an empty-message AggregateError', () => {
    const error = new AggregateError(
      [
        new Error('connect ECONNREFUSED ::1:587'),
        new Error('connect ECONNREFUSED 127.0.0.1:587'),
      ],
      '',
    );
    (error as { code?: string }).code = 'ESOCKET';

    expect(error.message).toBe('');
    expect(describeError(error)).toBe(
      '(code: ESOCKET) causes: connect ECONNREFUSED ::1:587; connect ECONNREFUSED 127.0.0.1:587',
    );
  });

  it('includes the code alongside an ordinary error message', () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:1');
    (error as { code?: string }).code = 'ESOCKET';

    expect(describeError(error)).toBe('connect ECONNREFUSED 127.0.0.1:1 (code: ESOCKET)');
  });

  it('falls back to the error name when the message is empty', () => {
    expect(describeError(new Error())).toBe('Error');
  });

  it('stringifies values that are not errors', () => {
    expect(describeError('boom')).toBe('boom');
  });
});
