-- CreateEnum
CREATE TYPE "StatutTentative" AS ENUM ('reussi', 'echoue', 'bloque');

-- AlterTable
ALTER TABLE "ips_bloques" ADD COLUMN     "derniere_requete" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "nb_requetes" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "tentatives_connexion" (
    "id" TEXT NOT NULL,
    "utilisateur_id" TEXT,
    "telephone" TEXT,
    "ip" TEXT NOT NULL,
    "user_agent" TEXT,
    "statut" "StatutTentative" NOT NULL,
    "nb_echecs" INTEGER NOT NULL DEFAULT 1,
    "bloque_jusqua" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tentatives_connexion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_reset_password" (
    "id" TEXT NOT NULL,
    "utilisateur_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expire_le" TIMESTAMP(3) NOT NULL,
    "utilise_le" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_reset_password_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tentatives_connexion_utilisateur_id_idx" ON "tentatives_connexion"("utilisateur_id");

-- CreateIndex
CREATE INDEX "tentatives_connexion_telephone_idx" ON "tentatives_connexion"("telephone");

-- CreateIndex
CREATE INDEX "tentatives_connexion_ip_idx" ON "tentatives_connexion"("ip");

-- CreateIndex
CREATE INDEX "tentatives_connexion_statut_idx" ON "tentatives_connexion"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_reset_password_token_key" ON "tokens_reset_password"("token");

-- CreateIndex
CREATE INDEX "tokens_reset_password_utilisateur_id_idx" ON "tokens_reset_password"("utilisateur_id");

-- CreateIndex
CREATE INDEX "tokens_reset_password_token_idx" ON "tokens_reset_password"("token");

-- AddForeignKey
ALTER TABLE "tentatives_connexion" ADD CONSTRAINT "tentatives_connexion_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens_reset_password" ADD CONSTRAINT "tokens_reset_password_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
