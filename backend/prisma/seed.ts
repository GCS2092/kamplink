import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed: debut');

  const data = [
    { nom: 'UCAD', ville: 'Dakar', filieres: ['Informatique', 'Droit', 'Médecine'] },
    { nom: 'UGB', ville: 'Saint-Louis', filieres: ['Informatique', 'Économie'] },
  ];

  for (const u of data) {
    const uni = await prisma.universite.upsert({
      where: { nom: u.nom },
      update: {},
      create: { nom: u.nom, ville: u.ville, pays: 'Senegal' },
    });
    for (const f of u.filieres) {
      await prisma.filiere.upsert({
        where: { nom_universiteId: { nom: f, universiteId: uni.id } },
        update: {},
        create: { nom: f, universiteId: uni.id },
      });
    }
  }
  console.log('Universites et filieres OK');

  // Premier admin: renseigner SEED_ADMIN_FIREBASE_UID (uid du compte Firebase) dans .env
  const adminUid = process.env.SEED_ADMIN_FIREBASE_UID;
  if (adminUid) {
    const admin = await prisma.utilisateur.upsert({
      where: { firebaseUid: adminUid },
      update: { role: 'superadmin' },
      create: {
        firebaseUid: adminUid,
        telephone: process.env.SEED_ADMIN_PHONE || null,
        role: 'superadmin',
      },
    });
    console.log('Superadmin OK:', admin.id);
  } else {
    console.log('SEED_ADMIN_FIREBASE_UID absent: aucun admin cree');
  }

  console.log('Seed: termine');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });