import { Module } from '@nestjs/common';
import { ClearancesController } from './clearances.controller';
import { ClearancesService } from './clearances.service';

@Module({
  controllers: [ClearancesController],
  providers: [ClearancesService],
})
export class ClearancesModule {}
