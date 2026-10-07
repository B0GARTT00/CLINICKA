import { Module } from '@nestjs/common';
import { CommunicationsController } from './communications.controller';
import { CommunicationsService } from './communications.service';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [DocumentsModule],
  controllers: [CommunicationsController],
  providers: [CommunicationsService],
})
export class CommunicationsModule {}
