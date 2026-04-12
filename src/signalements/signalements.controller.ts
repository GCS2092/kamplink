import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Request,
  UseGuards,
  Query,
} from '@nestjs/common';
import { SignalementsService } from './signalements.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateSignalementDto } from './dto/create-signalement.dto';
import { UpdateSignalementDto } from './dto/update-signalement.dto';

@Controller('signalements')
export class SignalementsController {
  constructor(private signalementsService: SignalementsService) {}

  // ─────────────────────────────────────────
  // ROUTES UTILISATEUR
  // ─────────────────────────────────────────

  @Post()
  @UseGuards(AuthGuard)
  createSignalement(@Request() req, @Body() dto: CreateSignalementDto) {
    return this.signalementsService.createSignalement(req.user.id, dto);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  getMySignalements(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.signalementsService.getMySignalements(
      req.user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  // ─────────────────────────────────────────
  // ROUTES ADMIN / MODÉRATION
  // ─────────────────────────────────────────

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'delegate')
  getAllSignalements(
    @Query('statut') statut?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.signalementsService.getAllSignalements(
      statut,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('stats')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  getStats() {
    return this.signalementsService.getStats();
  }

  @Get(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'delegate')
  getSignalementById(@Param('id') signalementId: string) {
    return this.signalementsService.getSignalementById(signalementId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'delegate')
  updateSignalement(
    @Param('id') signalementId: string,
    @Request() req,
    @Body() dto: UpdateSignalementDto,
  ) {
    return this.signalementsService.updateSignalement(signalementId, dto, req.user.id);
  }
}
