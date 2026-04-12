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
import { MessagesService } from './messages.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { VoteMessageDto } from './dto/vote-message.dto';

@Controller('messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  // ─────────────────────────────────────────
  // LECTURE
  // ─────────────────────────────────────────

  @Get('canal/:id')
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
