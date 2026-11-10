import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normaliserCarte } from '../users/verification.utils';
import { ListeRowDto } from './dto/liste.dto';

@Injectable()
export class ListeEtudiantsService {
  constructor(private prisma: PrismaService) {}

  async importer(adminId: string, universiteId: string, rows: ListeRowDto[]) {
    const uni = await this.prisma.universite.findUnique({ where: { id: universiteId } });
    if (!uni) throw new NotFoundException('Université introuvable');

    // Un seul enregistrement par numero de carte (le dernier gagne)
    const uniques = new Map<string, ListeRowDto>();
    for (const r of rows) {
      const num = normaliserCarte(r.numeroCarte);
      if (num.length >= 4) uniques.set(num, r);
    }
    const entries = [...uniques.entries()];

    for (let i = 0; i < entries.length; i += 200) {
      const chunk = entries.slice(i, i + 200);
      await this.prisma.$transaction(
        chunk.map(([num, r]) =>
          this.prisma.listeEtudiant.upsert({
            where: { universiteId_numeroCarte: { universiteId, numeroCarte: num } },
            update: { nom: r.nom.trim(), prenom: r.prenom.trim(), filiere: r.filiere, niveau: r.niveau },
            create: {
              universiteId,
              numeroCarte: num,
              nom: r.nom.trim(),
              prenom: r.prenom.trim(),
              filiere: r.filiere,
              niveau: r.niveau,
            },
          }),
        ),
      );
    }

    await this.prisma.auditLog.create({
      data: {
        utilisateurId: adminId,
        action: 'IMPORT_LISTE_ETUDIANTS',
        ressource: 'universite',
        ressourceId: universiteId,
        metadata: { recus: rows.length, importes: entries.length },
      },
    });

    return { recus: rows.length, importes: entries.length, ignores: rows.length - entries.length };
  }

  async compter(universiteId: string) {
    const total = await this.prisma.listeEtudiant.count({ where: { universiteId } });
    return { universiteId, total };
  }
}