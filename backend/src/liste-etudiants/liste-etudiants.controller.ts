import { Controller, Get, Post, Body, Param, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ListeEtudiantsService } from './liste-etudiants.service';
import { ImportListeDto } from './dto/liste.dto';

// Donnees personnelles: administrateurs uniquement
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'superadmin')
@Controller('admin/liste-etudiants')
export class ListeEtudiantsController {
  constructor(private service: ListeEtudiantsService) {}

  @Post(':universiteId')
  importer(@Request() req, @Param('universiteId') universiteId: string, @Body() dto: ImportListeDto) {
    return this.service.importer(req.user.id, universiteId, dto.rows);
  }

  @Get(':universiteId/count')
  compter(@Param('universiteId') universiteId: string) {
    return this.service.compter(universiteId);
  }
}