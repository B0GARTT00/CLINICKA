import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Returns the current health status of the API service.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy.',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'bchealth-api' },
        timestamp: { type: 'string', example: '2024-12-01T12:00:00.000Z' },
      },
    },
  })
  check() {
    return {
      status: 'ok',
      service: 'bchealth-api',
      timestamp: new Date().toISOString(),
    };
  }
}
