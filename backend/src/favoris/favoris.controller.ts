import { Controller, Get, Post, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { FavorisService } from './favoris.service';
import { AddFavoriDto } from './dto/favori.dto';

@UseGuards(AuthGuard)
@Controller('favoris')
export class FavorisController {
  constructor(private favorisService: FavorisService) {}

  @Get()
  list(
    @Request() req,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.favorisService.list(
      req.user,
      type,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Post()
  add(@Request() req, @Body() dto: AddFavoriDto) {
    return this.favorisService.add(req.user, dto);
  }

  @Delete(':type/:ressourceId')
  remove(@Request() req, @Param('type') type: string, @Param('ressourceId') ressourceId: string) {
    return this.favorisService.remove(req.user.id, type, ressourceId);
  }
}