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
import { SetCanalMemberRoleDto } from './dto/set-member-role.dto';

// Les droits fins (moderateur/admin de canal) sont verifies dans le service
@Controller('canaux')
export class CanauxController {
  constructor(private canauxService: CanauxService) {}

  @Get('espace/:id')
  @UseGuards(AuthGuard)
  getCanauxByEspace(@Request() req, @Param('id') espaceId: string) {
    return this.canauxService.getCanauxByEspace(req.user, espaceId);
  }

  @Get(':id/membres')
  @UseGuards(AuthGuard)
  getCanalMembers(@Request() req, @Param('id') canalId: string) {
    return this.canauxService.getCanalMembers(req.user, canalId);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  getCanalById(@Request() req, @Param('id') canalId: string) {
    return this.canauxService.getCanalById(req.user, canalId);
  }

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

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'delegate')
  createCanal(@Request() req, @Body() dto: CreateCanalDto) {
    return this.canauxService.createCanal(req.user, dto);
  }

  @Patch(':id/membres/:userId/role')
  @UseGuards(AuthGuard)
  setMemberRole(
    @Request() req,
    @Param('id') canalId: string,
    @Param('userId') userId: string,
    @Body() dto: SetCanalMemberRoleDto,
  ) {
    return this.canauxService.setMemberRole(req.user, canalId, userId, dto.role);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  updateCanal(@Request() req, @Param('id') canalId: string, @Body() dto: UpdateCanalDto) {
    return this.canauxService.updateCanal(req.user, canalId, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  deleteCanal(@Request() req, @Param('id') canalId: string) {
    return this.canauxService.deleteCanal(req.user, canalId);
  }
}