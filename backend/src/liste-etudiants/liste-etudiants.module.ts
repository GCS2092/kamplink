import { Module } from '@nestjs/common';
import { ListeEtudiantsController } from './liste-etudiants.controller';
import { ListeEtudiantsService } from './liste-etudiants.service';

@Module({
  controllers: [ListeEtudiantsController],
  providers: [ListeEtudiantsService],
})
export class ListeEtudiantsModule {}