import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export const MODERATOR_ROLES = ['delegate', 'admin', 'superadmin'];

@Injectable()
export class CanalAccessService {
  constructor(private prisma: PrismaService) {}

  // Canal public: tout utilisateur connecte. Canal prive: membres et admins.
  async assertCanAccess(user: { id: string; role: string }, canalId: string) {
    const canal = await this.prisma.canal.findUnique({ where: { id: canalId } });
    if (!canal || !canal.estActif) throw new NotFoundException('Canal introuvable');
    if (canal.estPublic) return canal;
    if (['admin', 'superadmin'].includes(user.role)) return canal;

    const membre = await this.prisma.canalMembre.findUnique({
      where: { canalId_utilisateurId: { canalId, utilisateurId: user.id } },
    });
    if (!membre) throw new ForbiddenException('Canal privé - accès réservé aux membres');
    return canal;
  }
}