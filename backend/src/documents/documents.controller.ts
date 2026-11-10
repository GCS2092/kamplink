import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  Query,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { AuthGuard } from '../auth/auth.guard';
import { VerifiedGuard } from '../common/guards/verified.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

// Toutes les routes exigent d'etre connecte (le garde de classe s'execute avant RolesGuard)
@UseGuards(AuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Get('canal/:id')
  getDocumentsByCanal(
    @Request() req,
    @Param('id') canalId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.documentsService.getDocumentsByCanal(
      req.user,
      canalId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      categoryId,
    );
  }

  @Get('user/me')
  getMyDocuments(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.documentsService.getDocumentsByUser(
      req.user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('search/global')
  searchDocuments(
    @Query('q') query: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.documentsService.searchDocuments(
      query,
      type,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get(':id')
  getDocumentById(@Request() req, @Param('id') documentId: string) {
    return this.documentsService.getDocumentById(req.user, documentId);
  }

  @Post()
  @UseGuards(VerifiedGuard)
  createDocument(@Request() req, @Body() dto: CreateDocumentDto) {
    return this.documentsService.createDocument(req.user, dto);
  }

  @Patch(':id')
  updateDocument(
    @Param('id') documentId: string,
    @Request() req,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.updateDocument(req.user.id, documentId, dto);
  }

  @Delete(':id')
  deleteDocument(@Param('id') documentId: string, @Request() req) {
    return this.documentsService.deleteDocument(req.user.id, documentId);
  }

  @Post(':id/hide')
  hideDocument(@Request() req, @Param('id') documentId: string) {
    return this.documentsService.hideDocument(req.user, documentId);
  }

  @Post(':id/unhide')
  unhideDocument(@Request() req, @Param('id') documentId: string) {
    return this.documentsService.unhideDocument(req.user, documentId);
  }
}