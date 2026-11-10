-- CreateEnum
CREATE TYPE "CanalRole" AS ENUM ('admin', 'moderateur', 'membre', 'invite');

-- CreateEnum
CREATE TYPE "DocumentAccessScope" AS ENUM ('public', 'restricted');

-- CreateEnum
CREATE TYPE "StatutCandidature" AS ENUM ('envoyee', 'vue', 'acceptee', 'refusee', 'retiree');

-- CreateEnum
CREATE TYPE "StatutEntreprise" AS ENUM ('pending', 'active', 'suspended', 'rejected');

-- CreateEnum
CREATE TYPE "TypeFavori" AS ENUM ('opportunite', 'message', 'document');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'company';
ALTER TYPE "Role" ADD VALUE 'content_admin';

-- AlterEnum
ALTER TYPE "StatutVerification" ADD VALUE 'not_submitted';

-- AlterTable
ALTER TABLE "canal_membres" ADD COLUMN     "est_archive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role" "CanalRole" NOT NULL DEFAULT 'membre';

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "access_scope" "DocumentAccessScope" NOT NULL DEFAULT 'public',
ADD COLUMN     "allowedNiveaux" "Niveau"[] DEFAULT ARRAY[]::"Niveau"[],
ADD COLUMN     "allowed_filiere_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "category_id" TEXT,
ADD COLUMN     "subcategory_id" TEXT;

-- AlterTable
ALTER TABLE "opportunites" ADD COLUMN     "entreprise_id" TEXT;

-- AlterTable
ALTER TABLE "profils" ADD COLUMN     "cv_url" TEXT;

-- CreateTable
CREATE TABLE "favoris" (
    "id" TEXT NOT NULL,
    "utilisateur_id" TEXT NOT NULL,
    "type" "TypeFavori" NOT NULL,
    "ressource_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favoris_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_reactions" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "auteur_id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidatures" (
    "id" TEXT NOT NULL,
    "opportunite_id" TEXT NOT NULL,
    "candidat_id" TEXT NOT NULL,
    "cv_url" TEXT,
    "lettre_motivation" TEXT,
    "statut" "StatutCandidature" NOT NULL DEFAULT 'envoyee',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_categories" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "est_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_subcategories" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "est_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entreprises" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "email_contact" TEXT NOT NULL,
    "telephone" TEXT,
    "site_web" TEXT,
    "adresse" TEXT,
    "siret" TEXT,
    "logo_url" TEXT,
    "document_verif" TEXT,
    "statut" "StatutEntreprise" NOT NULL DEFAULT 'pending',
    "representant_id" TEXT,
    "commentaire_admin" TEXT,
    "verified_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entreprises_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "favoris_utilisateur_id_type_ressource_id_key" ON "favoris"("utilisateur_id", "type", "ressource_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_reactions_message_id_auteur_id_emoji_key" ON "message_reactions"("message_id", "auteur_id", "emoji");

-- CreateIndex
CREATE UNIQUE INDEX "candidatures_opportunite_id_candidat_id_key" ON "candidatures"("opportunite_id", "candidat_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_categories_nom_key" ON "document_categories"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "document_subcategories_category_id_nom_key" ON "document_subcategories"("category_id", "nom");

-- CreateIndex
CREATE UNIQUE INDEX "entreprises_email_contact_key" ON "entreprises"("email_contact");

-- CreateIndex
CREATE UNIQUE INDEX "entreprises_siret_key" ON "entreprises"("siret");

-- CreateIndex
CREATE UNIQUE INDEX "entreprises_representant_id_key" ON "entreprises"("representant_id");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "document_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "document_subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunites" ADD CONSTRAINT "opportunites_entreprise_id_fkey" FOREIGN KEY ("entreprise_id") REFERENCES "entreprises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favoris" ADD CONSTRAINT "favoris_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_auteur_id_fkey" FOREIGN KEY ("auteur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidatures" ADD CONSTRAINT "candidatures_opportunite_id_fkey" FOREIGN KEY ("opportunite_id") REFERENCES "opportunites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidatures" ADD CONSTRAINT "candidatures_candidat_id_fkey" FOREIGN KEY ("candidat_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_subcategories" ADD CONSTRAINT "document_subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "document_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entreprises" ADD CONSTRAINT "entreprises_representant_id_fkey" FOREIGN KEY ("representant_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
