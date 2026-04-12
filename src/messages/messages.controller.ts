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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { VoteMessageDto } from './dto/vote-message.dto';

@ApiTags('Messages')
@Controller('messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  // ─────────────────────────────────────────
  // LECTURE
  // ─────────────────────────────────────────

  @Get('canal/:id')
  @ApiOperation({ summary: 'Récupérer les messages d\'un canal' })
  @ApiParam({ name: 'id', description: 'ID du canal' })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de page', example: '1' })
  @ApiQuery({ name: 'limit', required: false, description: 'Messages par page', example: '50' })
  @ApiResponse({ status: 200, description: 'Liste des messages paginée' })
  @ApiResponse({ status: 404, description: 'Canal introuvable' })
  getMessagesByCanal(
    @Param('id') canalId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagesService.getMessagesByCanal(
      canalId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un message par ID' })
  @ApiParam({ name: 'id', description: 'ID du message' })
  @ApiResponse({ status: 200, description: 'Message trouvé' })
  @ApiResponse({ status: 404, description: 'Message introuvable' })
  getMessageById(@Param('id') messageId: string) {
    return this.messagesService.getMessageById(messageId);
  }

  @Get(':id/reponses')
  getReponses(@Param('id') messageId: string) {
    return this.messagesService.getReponses(messageId);
  }

  @Get('canal/:id/search')
  searchMessages(
    @Param('id') canalId: string,
    @Query('q') query: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagesService.searchMessages(
      canalId,
      query,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  // ─────────────────────────────────────────
  // CRÉATION / MODIFICATION
  // ─────────────────────────────────────────

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un nouveau message' })
  @ApiResponse({ status: 201, description: 'Message créé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès interdit au canal' })
  createMessage(@Request() req, @Body() dto: CreateMessageDto) {
    return this.messagesService.createMessage(req.user.id, dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  updateMessage(
    @Param('id') messageId: string,
    @Request() req,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.messagesService.updateMessage(req.user.id, messageId, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  deleteMessage(@Param('id') messageId: string, @Request() req) {
    return this.messagesService.deleteMessage(req.user.id, messageId);
  }

  // ─────────────────────────────────────────
  // VOTES
  // ─────────────────────────────────────────

  @Post(':id/vote')
  @UseGuards(AuthGuard)
  voteMessage(
    @Param('id') messageId: string,
    @Request() req,
    @Body() dto: VoteMessageDto,
  ) {
    return this.messagesService.voteMessage(req.user.id, messageId, dto.vote);
  }

  // ─────────────────────────────────────────
  // ADMIN / DELEGATE
  // ─────────────────────────────────────────

  @Post(':id/epingle')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'delegate')
  toggleEpingle(@Param('id') messageId: string) {
    return this.messagesService.toggleEpingle(messageId);
  }
}
