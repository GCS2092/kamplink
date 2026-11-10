import {
  Controller,
  Get,
  Post,
  Param,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { Throttle } from '../redis/redis-throttler.decorator';
import { UploadsService } from './uploads.service';

@UseGuards(AuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(
    private uploads: UploadsService,
    private prisma: PrismaService,
  ) {}

  // Etape 1 de la verification: televerser la photo, puis envoyer la reference rendue
  // dans POST /users/me/verification (champ photoCarteUrl)
  @Post('carte')
  @Throttle({ ttl: 60, limit: 10, blockDuration: 300 })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  async uploadCarte(@Request() req, @UploadedFile() file: any) {
    const ref = await this.uploads.saveCarte(req.user.id, file);
    return { photoCarteUrl: ref };
  }

  // Consultation reservee aux admins, tracee dans audit_logs
  @Get('admin/verification/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'superadmin')
  async viewCarte(@Request() req, @Param('id') id: string, @Res() res: any) {
    const v = await this.prisma.verification.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('Vérification introuvable');
    const { buffer, mime } = await this.uploads.read(v.photoCarteUrl);

    await this.prisma.auditLog.create({
      data: {
        utilisateurId: req.user.id,
        action: 'VIEW_CARTE_PHOTO',
        ressource: 'verification',
        ressourceId: id,
      },
    });

    res.set({
      'Content-Type': mime,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
    });
    res.send(buffer);
  }
}