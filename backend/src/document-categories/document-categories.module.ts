import { Module } from '@nestjs/common';
import { DocumentCategoriesController } from './document-categories.controller';
import { DocumentCategoriesService } from './document-categories.service';

@Module({
  controllers: [DocumentCategoriesController],
  providers: [DocumentCategoriesService],
})
export class DocumentCategoriesModule {}