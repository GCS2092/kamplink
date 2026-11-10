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
import { OpportunitesService } from './opportunites.service';
import { AuthGuard } from '../auth/auth.guard';
import { VerifiedGuard } from '../common/guards/verified.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateOpportuniteDto } from './dto/create-opportunite.dto';
import { UpdateOpportuniteDto } from './dto/update-opportunite.dto';

@Controller('opportunites')
export class OpportunitesController {
  constructor(private opportunitesService: OpportunitesService) {}

  // ─────────────────────────────────────────
  // LECTURE PUBLIQUE
  // ─────────────────────────────────────────

  @Get()
  getAllOpportunites(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('domaine') domaine?: string,
    @Query('niveau') niveau?: string,
    @Query('active') active?: string,
  ) {
    return this.opportunitesService.getAllOpportunites(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      {
        typeOffre: type,
        domaine,
        niveauRequis: niveau,
        estExpiree: active === 'true' ? false : undefined,
      },
    );
  }

  @Get(':id')
  getOpportuniteById(@Param('id') opportuniteId: string) {
    return this.opportunitesService.getOpportuniteById(opportuniteId);
  }

  @Get('search/global')
  searchOpportunites(
    @Query('q') query: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.opportunitesService.searchOpportunites(
      query,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  // ─────────────────────────────────────────
  // ROUTES PROTÉGÉES
  // ─────────────────────────────────────────

  @Get('me/list')
  @UseGuards(AuthGuard)
  getMyOpportunites(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.opportunitesService.getMyOpportunites(
      req.user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Post()
  @UseGuards(AuthGuard, VerifiedGuard)
  createOpportunite(@Request() req, @Body() dto: CreateOpportuniteDto) {
    return this.opportunitesService.createOpportunite(req.user.id, dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  updateOpportunite(
    @Param('id') opportuniteId: string,
    @Request() req,
    @Body() dto: UpdateOpportuniteDto,
  ) {
    return this.opportunitesService.updateOpportunite(req.user.id, opportuniteId, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  deleteOpportunite(@Param('id') opportuniteId: string, @Request() req) {
    return this.opportunitesService.deleteOpportunite(req.user.id, opportuniteId);
  }

  // ─────────────────────────────────────────
  // ADMIN / MODÉRATION
  // ─────────────────────────────────────────

  @Post(':id/approve')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'content_admin')
  approveOpportunite(@Param('id') opportuniteId: string) {
    return this.opportunitesService.approveOpportunite(opportuniteId);
  }

  @Post(':id/reject')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'content_admin')
  rejectOpportunite(@Param('id') opportuniteId: string) {
    return this.opportunitesService.rejectOpportunite(opportuniteId);
  }

  @Post(':id/expire')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'content_admin')
  markAsExpired(@Param('id') opportuniteId: string) {
    return this.opportunitesService.markAsExpired(opportuniteId);
  }
}
