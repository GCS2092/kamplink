import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { RejectVerificationDto } from './dto/reject-verification.dto';
import { BanUserDto } from './dto/ban-user.dto';

// ─────────────────────────────────────────
// ROUTES PUBLIQUES (pas besoin d'être connecté)
// ─────────────────────────────────────────
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // Liste des universités — pour le formulaire d'inscription mobile
  @Get('universites')
  getUniversites() {
    return this.usersService.getUniversites();
  }

  // Filières d'une université — pour le formulaire d'inscription
  @Get('universites/:id/filieres')
  getFilieres(@Param('id') universiteId: string) {
    return this.usersService.getFilieresByUniversite(universiteId);
  }

  // Profil public d'un utilisateur (visible par tous)
  @Get(':id/public')
  getPublicProfile(@Param('id') userId: string) {
    return this.usersService.getPublicProfile(userId);
  }

  // ─────────────────────────────────────────
  // ROUTES PROTÉGÉES (connecté requis)
  // ─────────────────────────────────────────

  // Mon profil complet
  @Get('me')
  @UseGuards(AuthGuard)
  getMyProfile(@Request() req) {
    return this.usersService.getProfile(req.user.id);
  }

  // Créer mon profil académique (après première connexion)
  @Post('me/profile')
  @UseGuards(AuthGuard)
  createProfile(@Request() req, @Body() dto: CreateProfileDto) {
    return this.usersService.createProfile(req.user.id, dto);
  }

  // Modifier mon profil
  @Patch('me/profile')
  @UseGuards(AuthGuard)
  updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  // Soumettre ma carte étudiante pour vérification (UC-03)
  @Post('me/verification')
  @UseGuards(AuthGuard)
  submitVerification(@Request() req, @Body() dto: SubmitVerificationDto) {
    return this.usersService.submitVerification(req.user.id, dto);
  }

  // Voir le statut de ma vérification
  @Get('me/verification')
  @UseGuards(AuthGuard)
  getVerificationStatus(@Request() req) {
    return this.usersService.getVerificationStatus(req.user.id);
  }

  // ─────────────────────────────────────────
  // ROUTES ADMIN (role admin ou superadmin requis)
  // ─────────────────────────────────────────

  // Liste des demandes de vérification en attente (UC-23)
  @Get('admin/verifications')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  getPendingVerifications() {
    return this.usersService.getPendingVerifications();
  }

  // Approuver une vérification
  @Patch('admin/verifications/:id/approve')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  approveVerification(@Param('id') id: string, @Request() req) {
    return this.usersService.approveVerification(id, req.user.id);
  }

  // Rejeter une vérification avec motif
  @Patch('admin/verifications/:id/reject')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  rejectVerification(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: RejectVerificationDto,
  ) {
    return this.usersService.rejectVerification(id, req.user.id, dto.motifRejet);
  }

  // Bannir un utilisateur (UC-24)
  @Patch('admin/:id/ban')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  banUser(
    @Param('id') userId: string,
    @Request() req,
    @Body() dto: BanUserDto,
  ) {
    return this.usersService.banUser(userId, req.user.id, dto.raison);
  }

  // Débannir un utilisateur
  @Patch('admin/:id/unban')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  unbanUser(@Param('id') userId: string, @Request() req) {
    return this.usersService.unbanUser(userId, req.user.id);
  }
}