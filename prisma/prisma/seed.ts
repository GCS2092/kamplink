import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seed...');

  // ============================================================
  // 1. UNIVERSITÉS
  // ============================================================
  const ucad = await prisma.universite.create({
    data: {
      nom: 'UCAD',
      ville: 'Dakar',
      pays: 'Senegal',
    },
  });

  const ugb = await prisma.universite.create({
    data: {
      nom: 'UGB',
      ville: 'Saint-Louis',
      pays: 'Senegal',
    },
  });

  console.log('🏫 Universités créées');

  // ============================================================
  // 2. FILIÈRES
  // ============================================================
  const filieres = await prisma.filiere.createMany({
    data: [
      { nom: 'Informatique', universiteId: ucad.id },
      { nom: 'Droit', universiteId: ucad.id },
      { nom: 'Médecine', universiteId: ucad.id },
      { nom: 'Informatique', universiteId: ugb.id },
      { nom: 'Économie', universiteId: ugb.id },
    ],
  });

  console.log('🎓 Filières créées');

  // ============================================================
  // 3. USER TEST
  // ============================================================
  const user = await prisma.utilisateur.create({
    data: {
      firebaseUid: 'dev-user-1',
      telephone: '+221700000000',
      role: 'student',
      estActif: true,
    },
  });

  console.log('👤 User test créé:', user.id);

  console.log('✅ Seed terminé avec succès');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });