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
import { EspacesService } from './espaces.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateEspaceDto } from './dto/create-espace.dto';
import { UpdateEspaceDto } from './dto/update-espace.dto';

@Controller('espaces')
export class EspacesController {
  constructor(private espacesService: EspacesService) {}

  // ─────────────────────────────────────────
  // ROUTES PUBLIQUES
  // ─────────────────────────────────────────

  @Get()
  getAllEspaces() {
    return this.espacesService.getAllEspaces();
  }

  @Get(':id')
  getEspaceById(@Param('id') id: string) {
    return this.espacesService.getEspaceById(id);
  }

  // ─────────────────────────────────────────
  // ROUTES PROTÉGÉES
  // ─────────────────────────────────────────

  @Get('me/list')
  @UseGuards(AuthGuard)
  getMyEspaces(@Request() req) {
    return this.espacesService.getMyEspaces(req.user.id);
  }

  @Post(':id/join')
  @UseGuards(AuthGuard)
  joinEspace(@Param('id') espaceId: string, @Request() req) {
    return this.espacesService.joinEspace(req.user.id, espaceId);
  }

  @Post(':id/leave')
  @UseGuards(AuthGuard)
  leaveEspace(@Param('id') espaceId: string, @Request() req) {
    return this.espacesService.leaveEspace(req.user.id, espaceId);
  }

  // ─────────────────────────────────────────
  // ROUTES ADMIN / DELEGATE
  // ─────────────────────────────────────────

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'delegate')
  createEspace(@Request() req, @Body() dto: CreateEspaceDto) {
    return this.espacesService.createEspace(req.user.id, dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'delegate')
  updateEspace(@Param('id') espaceId: string, @Body() dto: UpdateEspaceDto) {
    return this.espacesService.updateEspace(espaceId, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  deleteEspace(@Param('id') espaceId: string) {
    return this.espacesService.deleteEspace(espaceId);
  }

  @Get(':id/membres')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'delegate')
  getEspaceMembers(@Param('id') espaceId: string) {
    return this.espacesService.getEspaceMembers(espaceId);
  }
}
