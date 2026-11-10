import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { VerifiedGuard } from '../common/guards/verified.guard';
import { CandidaturesService } from './candidatures.service';
import { ApplyDto, SetStatutCandidatureDto } from './dto/candidature.dto';

@UseGuards(AuthGuard)
@Controller()
export class CandidaturesController {
  constructor(private candidaturesService: CandidaturesService) {}

  @Post('opportunites/:id/candidatures')
  @UseGuards(VerifiedGuard)
  apply(@Request() req, @Param('id') opportuniteId: string, @Body() dto: ApplyDto) {
    return this.candidaturesService.apply(req.user, opportuniteId, dto);
  }

  @Get('opportunites/:id/candidatures')
  listForOpportunite(
    @Request() req,
    @Param('id') opportuniteId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.candidaturesService.listForOpportunite(
      req.user,
      opportuniteId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('candidatures/me')
  mine(@Request() req, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.candidaturesService.mine(
      req.user,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Patch('candidatures/:id/statut')
  setStatut(@Request() req, @Param('id') id: string, @Body() dto: SetStatutCandidatureDto) {
    return this.candidaturesService.setStatut(req.user, id, dto.statut);
  }

  @Delete('candidatures/:id')
  withdraw(@Request() req, @Param('id') id: string) {
    return this.candidaturesService.withdraw(req.user, id);
  }
}