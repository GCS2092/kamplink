-- AlterTable
ALTER TABLE "utilisateurs" ADD COLUMN     "numero_carte" TEXT;

-- AlterTable
ALTER TABLE "verifications" ADD COLUMN     "correspondance_liste" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "numero_carte" TEXT;

-- CreateTable
CREATE TABLE "liste_etudiants" (
    "id" TEXT NOT NULL,
    "universite_id" TEXT NOT NULL,
    "numero_carte" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "filiere" TEXT,
    "niveau" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liste_etudiants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "liste_etudiants_universite_id_numero_carte_key" ON "liste_etudiants"("universite_id", "numero_carte");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_numero_carte_key" ON "utilisateurs"("numero_carte");

-- CreateIndex
CREATE INDEX "verifications_numero_carte_idx" ON "verifications"("numero_carte");

-- AddForeignKey
ALTER TABLE "liste_etudiants" ADD CONSTRAINT "liste_etudiants_universite_id_fkey" FOREIGN KEY ("universite_id") REFERENCES "universites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

