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
} from '@nestjs/common';
import { CanauxService } from './canaux.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateCanalDto } from './dto/create-canal.dto';
import { UpdateCanalDto } from './dto/update-canal.dto';

@Controller('canaux')
export class CanauxController {
  constructor(private canauxService: CanauxService) {}

  // ─────────────────────────────────────────
  // LECTURE PUBLIQUE
  // ─────────────────────────────────────────

  @Get('espace/:id')
  @UseGuards(AuthGuard)
  getCanauxByEspace(@Request() req, @Param('id') espaceId: string) {
    return this.canauxService.getCanauxByEspace(req.user, espaceId);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  getCanalById(@Request() req, @Param('id') canalId: string) {
    return this.canauxService.getCanalById(req.user, canalId);
  }

  // ─────────────────────────────────────────
  // ROUTES PROTÉGÉES
  // ─────────────────────────────────────────

  @Post(':id/join')
  @UseGuards(AuthGuard)
  joinCanal(@Param('id') canalId: string, @Request() req) {
    return this.canauxService.joinCanal(req.user.id, canalId);
  }

  @Post(':id/leave')
  @UseGuards(AuthGuard)
  leaveCanal(@Param('id') canalId: string, @Request() req) {
    return this.canauxService.leaveCanal(req.user.id, canalId);
  }

  // ─────────────────────────────────────────
  // ADMIN / DELEGATE
  // ─────────────────────────────────────────

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'delegate')
  createCanal(@Request() req, @Body() dto: CreateCanalDto) {
    return this.canauxService.createCanal(req.user.id, dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'delegate')
  updateCanal(@Param('id') canalId: string, @Body() dto: UpdateCanalDto) {
    return this.canauxService.updateCanal(canalId, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'delegate')
  deleteCanal(@Param('id') canalId: string) {
    return this.canauxService.deleteCanal(canalId);
  }

  @Get(':id/membres')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'delegate')
  getCanalMembers(@Param('id') canalId: string) {
    return this.canauxService.getCanalMembers(canalId);
  }
}
