import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export const MODERATOR_ROLES = ['delegate', 'admin', 'superadmin'];
const GLOBAL_ADMINS = ['admin', 'superadmin'];

type Actor = { id: string; role: string };

@Injectable()
export class CanalAccessService {
  constructor(private prisma: PrismaService) {}

  // Canal public: tout utilisateur connecte. Canal prive: membres et admins.
  async assertCanAccess(user: Actor, canalId: string) {
    const canal = await this.prisma.canal.findUnique({ where: { id: canalId } });
    if (!canal || !canal.estActif) throw new NotFoundException('Canal introuvable');
    if (canal.estPublic) return canal;
    if (GLOBAL_ADMINS.includes(user.role)) return canal;

    const membre = await this.prisma.canalMembre.findUnique({
      where: { canalId_utilisateurId: { canalId, utilisateurId: user.id } },
    });
    if (!membre) throw new ForbiddenException('Canal privé - accès réservé aux membres');
    return canal;
  }

  // Moderation: admin global, ou admin/moderateur de CE canal
  async canModerate(user: Actor, canalId: string | null): Promise<boolean> {
    if (GLOBAL_ADMINS.includes(user.role)) return true;
    if (!canalId) return false;
    const m = await this.prisma.canalMembre.findUnique({
      where: { canalId_utilisateurId: { canalId, utilisateurId: user.id } },
    });
    return !!m && !m.estArchive && (m.role === 'admin' || m.role === 'moderateur');
  }

  async assertCanModerate(user: Actor, canalId: string | null) {
    if (!(await this.canModerate(user, canalId))) {
      throw new ForbiddenException('Permissions insuffisantes sur ce canal');
    }
  }

  // Administration du canal: admin global, ou admin de CE canal
  async assertCanAdminCanal(user: Actor, canalId: string) {
    if (GLOBAL_ADMINS.includes(user.role)) return;
    const m = await this.prisma.canalMembre.findUnique({
      where: { canalId_utilisateurId: { canalId, utilisateurId: user.id } },
    });
    if (!m || m.estArchive || m.role !== 'admin') {
      throw new ForbiddenException('Réservé aux administrateurs du canal');
    }
  }
}