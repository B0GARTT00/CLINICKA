import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { json } from 'express';

function ensureDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    const host = process.env.DATABASE_HOST || 'localhost';
    const port = process.env.DATABASE_PORT || '3306';
    const name = process.env.DATABASE_NAME || 'bchealth';
    const user = process.env.DATABASE_USER || 'root';
    const password = process.env.DATABASE_PASSWORD || '';
    process.env.DATABASE_URL = `mysql://${user}:${password}@${host}:${port}/${name}`;
  }
}

async function bootstrap() {
  ensureDatabaseUrl();
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);
  const httpAdapterHost = app.get(HttpAdapterHost);

  app.use(json({ limit: '6mb' }));

  app.setGlobalPrefix(config.get<string>('apiPrefix') || 'api/v1');
  app.use(new RequestLoggerMiddleware().use.bind(RequestLoggerMiddleware));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter(httpAdapterHost));

  app.enableCors({
    origin: config.get<string>('corsOrigin') || 'http://localhost:5173',
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('BCHealth API')
    .setDescription('BCHealth clinic information and records management system API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('port') || 3000;
  await app.listen(port);
}

bootstrap();
