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
import { VerifiedGuard } from '../common/guards/verified.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { VoteMessageDto } from './dto/vote-message.dto';

// Toutes les routes exigent d'etre connecte (le garde de classe s'execute avant RolesGuard)
@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get('canal/:id')
  @ApiOperation({ summary: "Récupérer les messages d'un canal" })
  @ApiParam({ name: 'id', description: 'ID du canal' })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de page', example: '1' })
  @ApiQuery({ name: 'limit', required: false, description: 'Messages par page (max 100)', example: '50' })
  @ApiResponse({ status: 200, description: 'Liste des messages paginée' })
  @ApiResponse({ status: 403, description: 'Canal privé' })
  @ApiResponse({ status: 404, description: 'Canal introuvable' })
  getMessagesByCanal(
    @Request() req,
    @Param('id') canalId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagesService.getMessagesByCanal(
      req.user,
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
  getMessageById(@Request() req, @Param('id') messageId: string) {
    return this.messagesService.getMessageById(req.user, messageId);
  }

  @Get(':id/reponses')
  getReponses(@Request() req, @Param('id') messageId: string) {
    return this.messagesService.getReponses(req.user, messageId);
  }

  @Get('canal/:id/search')
  searchMessages(
    @Request() req,
    @Param('id') canalId: string,
    @Query('q') query: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagesService.searchMessages(
      req.user,
      canalId,
      query,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Post()
  @UseGuards(VerifiedGuard)
  @ApiOperation({ summary: 'Créer un nouveau message' })
  @ApiResponse({ status: 201, description: 'Message créé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès interdit au canal' })
  createMessage(@Request() req, @Body() dto: CreateMessageDto) {
    return this.messagesService.createMessage(req.user, dto);
  }

  @Patch(':id')
  updateMessage(
    @Param('id') messageId: string,
    @Request() req,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.messagesService.updateMessage(req.user, messageId, dto);
  }

  @Delete(':id')
  deleteMessage(@Param('id') messageId: string, @Request() req) {
    return this.messagesService.deleteMessage(req.user, messageId);
  }

  @Post(':id/vote')
  @UseGuards(VerifiedGuard)
  voteMessage(
    @Param('id') messageId: string,
    @Request() req,
    @Body() dto: VoteMessageDto,
  ) {
    return this.messagesService.voteMessage(req.user, messageId, dto.vote);
  }

  // Droits verifies dans le service: admin global ou moderateur/admin du canal
  @Post(':id/epingle')
  toggleEpingle(@Request() req, @Param('id') messageId: string) {
    return this.messagesService.toggleEpingle(req.user, messageId);
  }
}