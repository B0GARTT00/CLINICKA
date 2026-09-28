import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { LocalPrivateStorageAdapter } from './local-private-storage.adapter';
import { PRIVATE_STORAGE } from './private-storage';

@Module({
  // `ConfigService` is injected by `DocumentsService` and by the storage factory
  // below. Importing ConfigModule keeps this module resolvable on its own
  // instead of relying on AppModule registering it globally.
  imports: [ConfigModule, PrismaModule, AuditModule],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    LocalPrivateStorageAdapter,
    {
      provide: PRIVATE_STORAGE,
      inject: [ConfigService, LocalPrivateStorageAdapter],
      useFactory: (config: ConfigService, local: LocalPrivateStorageAdapter) => {
        const driver = config.get<string>('privateStorage.driver') || 'local';
        if (driver !== 'local') throw new Error(`Unsupported private storage driver: ${driver}`);
        return local;
      },
    },
  ],
  exports: [DocumentsService],
})
export class DocumentsModule {}
