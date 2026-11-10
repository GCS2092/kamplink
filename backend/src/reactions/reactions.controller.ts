import { Controller, Get, Post, Body, Param, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { ReactionsService } from './reactions.service';
import { ToggleReactionDto } from './dto/reaction.dto';

@UseGuards(AuthGuard)
@Controller('messages/:id/reactions')
export class ReactionsController {
  constructor(private reactionsService: ReactionsService) {}

  @Get()
  list(@Request() req, @Param('id') messageId: string) {
    return this.reactionsService.list(req.user, messageId);
  }

  @Post()
  toggle(@Request() req, @Param('id') messageId: string, @Body() dto: ToggleReactionDto) {
    return this.reactionsService.toggle(req.user, messageId, dto.emoji);
  }
}