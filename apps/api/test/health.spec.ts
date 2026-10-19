import { Test } from '@nestjs/testing';
import { HealthController } from '../src/health/health.controller';

describe('HealthController', () => {
  it('returns service health', () => {
    const controller = new HealthController();
    expect(controller.check()).toMatchObject({ status: 'ok', service: 'clinicka-api' });
  });
});

