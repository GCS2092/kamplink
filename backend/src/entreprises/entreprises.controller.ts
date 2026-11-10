import { Controller, Get, Post, Patch, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { EntreprisesService } from './entreprises.service';
import { CreateEntrepriseDto, UpdateEntrepriseDto, EntrepriseDecisionDto } from './dto/entreprise.dto';

// L'ordre des routes compte: les chemins fixes (me, admin/...) avant ':id'
@UseGuards(AuthGuard)
@Controller('entreprises')
export class EntreprisesController {
  constructor(private service: EntreprisesService) {}

  @Get()
  list(@Query('q') q?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.listActives(q, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
  }

  @Get('me')
  me(@Request() req) {
    return this.service.me(req.user);
  }

  @Post()
  create(@Request() req, @Body() dto: CreateEntrepriseDto) {
    return this.service.create(req.user, dto);
  }

  @Patch('me')
  updateMe(@Request() req, @Body() dto: UpdateEntrepriseDto) {
    return this.service.updateMe(req.user, dto);
  }

  @Get('admin/list')
  @UseGuards(RolesGuard)
  @Roles('admin', 'superadmin')
  adminList(
    @Query('statut') statut?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.adminList(statut, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
  }

  @Patch('admin/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('admin', 'superadmin')
  approve(@Request() req, @Param('id') id: string) {
    return this.service.decide(id, req.user, 'approve');
  }

  @Patch('admin/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('admin', 'superadmin')
  reject(@Request() req, @Param('id') id: string, @Body() dto: EntrepriseDecisionDto) {
    return this.service.decide(id, req.user, 'reject', dto.commentaireAdmin);
  }

  @Patch('admin/:id/suspend')
  @UseGuards(RolesGuard)
  @Roles('admin', 'superadmin')
  suspend(@Request() req, @Param('id') id: string, @Body() dto: EntrepriseDecisionDto) {
    return this.service.decide(id, req.user, 'suspend', dto.commentaireAdmin);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getActive(id);
  }
}