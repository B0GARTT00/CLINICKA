import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvValidation {
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV?: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(1)
  PORT?: number = 3000;

  @IsString()
  @IsNotEmpty()
  API_PREFIX?: string = 'api/v1';

  @IsString()
  @IsNotEmpty()
  DATABASE_HOST?: string = 'localhost';

  @IsInt()
  DATABASE_PORT?: number = 3306;

  @IsString()
  @IsNotEmpty()
  DATABASE_NAME?: string = 'bchealth';

  @IsString()
  DATABASE_USER?: string = 'root';

  @IsString()
  @IsOptional()
  DATABASE_PASSWORD?: string = '';

  @IsString()
  @IsNotEmpty()
  JWT_SECRET?: string;

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRES_IN?: string = '15m';

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET?: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_EXPIRES_IN?: string = '7d';

  @IsInt()
  THROTTLE_TTL?: number = 60000;

  @IsInt()
  THROTTLE_LIMIT?: number = 60;

  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string = 'http://localhost:5173';
}
