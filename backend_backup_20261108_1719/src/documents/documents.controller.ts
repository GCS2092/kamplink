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
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Controller('documents')
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  // ─────────────────────────────────────────
  // LECTURE
  // ─────────────────────────────────────────

  @Get('canal/:id')
  getDocumentsByCanal(
    @Param('id') canalId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.documentsService.getDocumentsByCanal(
      canalId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get(':id')
  getDocumentById(@Param('id') documentId: string) {
    return this.documentsService.getDocumentById(documentId);
  }

  @Get('user/me')
  @UseGuards(AuthGuard)
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

  // ─────────────────────────────────────────
  // CRÉATION / MODIFICATION
  // ─────────────────────────────────────────

  @Post()
  @UseGuards(AuthGuard)
  createDocument(@Request() req, @Body() dto: CreateDocumentDto) {
    return this.documentsService.createDocument(req.user.id, dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  updateDocument(
    @Param('id') documentId: string,
    @Request() req,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.updateDocument(req.user.id, documentId, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  deleteDocument(@Param('id') documentId: string, @Request() req) {
    return this.documentsService.deleteDocument(req.user.id, documentId);
  }

  // ─────────────────────────────────────────
  // MODÉRATION
  // ─────────────────────────────────────────

  @Post(':id/hide')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'delegate')
  hideDocument(@Param('id') documentId: string) {
    return this.documentsService.hideDocument(documentId);
  }

  @Post(':id/unhide')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'delegate')
  unhideDocument(@Param('id') documentId: string) {
    return this.documentsService.unhideDocument(documentId);
  }
}
