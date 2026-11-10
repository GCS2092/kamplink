-- CreateEnum
CREATE TYPE "Role" AS ENUM ('student', 'delegate', 'admin', 'superadmin');

-- CreateEnum
CREATE TYPE "Niveau" AS ENUM ('L1', 'L2', 'L3', 'M1', 'M2');

-- CreateEnum
CREATE TYPE "NiveauRequis" AS ENUM ('L1', 'L2', 'L3', 'M1', 'M2', 'tous');

-- CreateEnum
CREATE TYPE "StatutVerification" AS ENUM ('pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "TypeFichier" AS ENUM ('cours', 'exam', 'resume', 'exercice', 'autre');

-- CreateEnum
CREATE TYPE "TypeMessage" AS ENUM ('annonce', 'question', 'ressource', 'discussion');

-- CreateEnum
CREATE TYPE "TypeOffre" AS ENUM ('stage', 'emploi', 'bourse', 'concours', 'evenement');

-- CreateEnum
CREATE TYPE "TypeNotification" AS ENUM ('opportunite', 'message', 'document', 'mention', 'systeme', 'moderation');

-- CreateEnum
CREATE TYPE "RaisonSignalement" AS ENUM ('spam', 'inapproprie', 'harcelement', 'desinformation', 'autre');

-- CreateEnum
CREATE TYPE "StatutSignalement" AS ENUM ('ouvert', 'en_cours', 'resolu', 'classe');

-- CreateEnum
CREATE TYPE "ActionModeration" AS ENUM ('avertissement', 'masquer', 'supprimer', 'suspendre', 'bannir');

-- CreateEnum
CREATE TYPE "TypeJob" AS ENUM ('push', 'email', 'sms', 'expiration', 'nettoyage', 'rappel');

-- CreateEnum
CREATE TYPE "StatutJob" AS ENUM ('pending', 'processing', 'done', 'failed');

-- CreateEnum
CREATE TYPE "CategorieMarche" AS ENUM ('service', 'materiel', 'tutorat', 'autre');

-- CreateEnum
CREATE TYPE "StatutArticle" AS ENUM ('actif', 'vendu', 'archive');

-- CreateTable
CREATE TABLE "universites" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "pays" TEXT NOT NULL DEFAULT 'Senegal',
    "logo_url" TEXT,
    "est_actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "universites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filieres" (
    "id" TEXT NOT NULL,
    "universite_id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "code" TEXT,
    "est_actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "filieres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" TEXT NOT NULL,
    "firebase_uid" TEXT NOT NULL,
    "telephone" TEXT,
    "email" TEXT,
    "role" "Role" NOT NULL DEFAULT 'student',
    "est_actif" BOOLEAN NOT NULL DEFAULT true,
    "est_banni" BOOLEAN NOT NULL DEFAULT false,
    "banni_le" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profils" (
    "id" TEXT NOT NULL,
    "utilisateur_id" TEXT NOT NULL,
    "universite_id" TEXT,
    "filiere_id" TEXT,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "avatar_url" TEXT,
    "niveau" "Niveau",
    "photo_carte_url" TEXT,
    "statut_verification" "StatutVerification" NOT NULL DEFAULT 'pending',
    "verifie_le" TIMESTAMP(3),
    "score_reputation" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profils_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "espaces" (
    "id" TEXT NOT NULL,
    "universite_id" TEXT,
    "filiere_id" TEXT,
    "nom" TEXT NOT NULL,
    "type_espace" TEXT NOT NULL,
    "niveau" TEXT,
    "est_public" BOOLEAN NOT NULL DEFAULT true,
    "est_actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "espaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "espace_membres" (
    "id" TEXT NOT NULL,
    "espace_id" TEXT NOT NULL,
    "utilisateur_id" TEXT NOT NULL,
    "rejoint_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "espace_membres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canaux" (
    "id" TEXT NOT NULL,
    "espace_id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "est_public" BOOLEAN NOT NULL DEFAULT true,
    "est_actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canaux_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canal_membres" (
    "id" TEXT NOT NULL,
    "canal_id" TEXT NOT NULL,
    "utilisateur_id" TEXT NOT NULL,
    "rejoint_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canal_membres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "canal_id" TEXT NOT NULL,
    "auteur_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "type" "TypeMessage" NOT NULL,
    "contenu" TEXT NOT NULL,
    "est_epingle" BOOLEAN NOT NULL DEFAULT false,
    "est_masque" BOOLEAN NOT NULL DEFAULT false,
    "votes_positifs" INTEGER NOT NULL DEFAULT 0,
    "est_anonyme" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "canal_id" TEXT,
    "uploader_id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "type_fichier" "TypeFichier" NOT NULL,
    "url_fichier" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "taille_octets" INTEGER NOT NULL,
    "nb_telechargements" INTEGER NOT NULL DEFAULT 0,
    "est_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunites" (
    "id" TEXT NOT NULL,
    "auteur_id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "entreprise" TEXT,
    "type_offre" "TypeOffre" NOT NULL,
    "domaine" TEXT,
    "niveau_requis" "NiveauRequis" NOT NULL DEFAULT 'tous',
    "date_limite" TIMESTAMP(3),
    "localisation" TEXT,
    "url_externe" TEXT,
    "est_active" BOOLEAN NOT NULL DEFAULT true,
    "est_expiree" BOOLEAN NOT NULL DEFAULT false,
    "nb_vues" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "opportunites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunite_tags" (
    "id" TEXT NOT NULL,
    "opportunite_id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "opportunite_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "utilisateur_id" TEXT NOT NULL,
    "photo_carte_url" TEXT NOT NULL,
    "statut" "StatutVerification" NOT NULL DEFAULT 'pending',
    "soumis_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decide_le" TIMESTAMP(3),
    "admin_id" TEXT,
    "motif_rejet" TEXT,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signalements" (
    "id" TEXT NOT NULL,
    "rapporteur_id" TEXT NOT NULL,
    "cible_user_id" TEXT,
    "message_id" TEXT,
    "document_id" TEXT,
    "opportunite_id" TEXT,
    "raison" "RaisonSignalement" NOT NULL,
    "details" TEXT,
    "statut" "StatutSignalement" NOT NULL DEFAULT 'ouvert',
    "resolu_le" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signalements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actions_moderation" (
    "id" TEXT NOT NULL,
    "moderateur_id" TEXT NOT NULL,
    "cible_id" TEXT NOT NULL,
    "action" "ActionModeration" NOT NULL,
    "raison" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actions_moderation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "utilisateur_id" TEXT NOT NULL,
    "type" "TypeNotification" NOT NULL,
    "titre" TEXT NOT NULL,
    "corps" TEXT NOT NULL,
    "donnees" JSONB,
    "est_lue" BOOLEAN NOT NULL DEFAULT false,
    "lue_le" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_appareil" (
    "id" TEXT NOT NULL,
    "utilisateur_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "plateforme" TEXT NOT NULL,
    "est_actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tokens_appareil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "type" "TypeJob" NOT NULL,
    "statut" "StatutJob" NOT NULL DEFAULT 'pending',
    "payload" JSONB NOT NULL,
    "tentatives" INTEGER NOT NULL DEFAULT 0,
    "max_tentatives" INTEGER NOT NULL DEFAULT 3,
    "derniere_erreur" TEXT,
    "prevu_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traite_le" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "utilisateur_id" TEXT,
    "action" TEXT NOT NULL,
    "ressource" TEXT NOT NULL,
    "ressource_id" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ips_bloques" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "raison" TEXT,
    "bloque_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expire_le" TIMESTAMP(3),

    CONSTRAINT "ips_bloques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles_marche" (
    "id" TEXT NOT NULL,
    "vendeur_id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "prix" DECIMAL(65,30),
    "categorie" "CategorieMarche" NOT NULL,
    "statut" "StatutArticle" NOT NULL DEFAULT 'actif',
    "images_urls" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "articles_marche_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "universites_nom_key" ON "universites"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "filieres_nom_universite_id_key" ON "filieres"("nom", "universite_id");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_firebase_uid_key" ON "utilisateurs"("firebase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_telephone_key" ON "utilisateurs"("telephone");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_email_key" ON "utilisateurs"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profils_utilisateur_id_key" ON "profils"("utilisateur_id");

-- CreateIndex
CREATE UNIQUE INDEX "espace_membres_espace_id_utilisateur_id_key" ON "espace_membres"("espace_id", "utilisateur_id");

-- CreateIndex
CREATE UNIQUE INDEX "canal_membres_canal_id_utilisateur_id_key" ON "canal_membres"("canal_id", "utilisateur_id");

-- CreateIndex
CREATE INDEX "opportunite_tags_opportunite_id_idx" ON "opportunite_tags"("opportunite_id");

-- CreateIndex
CREATE INDEX "opportunite_tags_tag_idx" ON "opportunite_tags"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "verifications_utilisateur_id_key" ON "verifications"("utilisateur_id");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_appareil_token_key" ON "tokens_appareil"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ips_bloques_ip_key" ON "ips_bloques"("ip");

-- AddForeignKey
ALTER TABLE "filieres" ADD CONSTRAINT "filieres_universite_id_fkey" FOREIGN KEY ("universite_id") REFERENCES "universites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profils" ADD CONSTRAINT "profils_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profils" ADD CONSTRAINT "profils_universite_id_fkey" FOREIGN KEY ("universite_id") REFERENCES "universites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profils" ADD CONSTRAINT "profils_filiere_id_fkey" FOREIGN KEY ("filiere_id") REFERENCES "filieres"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "espaces" ADD CONSTRAINT "espaces_universite_id_fkey" FOREIGN KEY ("universite_id") REFERENCES "universites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "espaces" ADD CONSTRAINT "espaces_filiere_id_fkey" FOREIGN KEY ("filiere_id") REFERENCES "filieres"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "espace_membres" ADD CONSTRAINT "espace_membres_espace_id_fkey" FOREIGN KEY ("espace_id") REFERENCES "espaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "espace_membres" ADD CONSTRAINT "espace_membres_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canaux" ADD CONSTRAINT "canaux_espace_id_fkey" FOREIGN KEY ("espace_id") REFERENCES "espaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canal_membres" ADD CONSTRAINT "canal_membres_canal_id_fkey" FOREIGN KEY ("canal_id") REFERENCES "canaux"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canal_membres" ADD CONSTRAINT "canal_membres_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_canal_id_fkey" FOREIGN KEY ("canal_id") REFERENCES "canaux"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_auteur_id_fkey" FOREIGN KEY ("auteur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_canal_id_fkey" FOREIGN KEY ("canal_id") REFERENCES "canaux"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunites" ADD CONSTRAINT "opportunites_auteur_id_fkey" FOREIGN KEY ("auteur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunite_tags" ADD CONSTRAINT "opportunite_tags_opportunite_id_fkey" FOREIGN KEY ("opportunite_id") REFERENCES "opportunites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signalements" ADD CONSTRAINT "signalements_rapporteur_id_fkey" FOREIGN KEY ("rapporteur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signalements" ADD CONSTRAINT "signalements_cible_user_id_fkey" FOREIGN KEY ("cible_user_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signalements" ADD CONSTRAINT "signalements_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signalements" ADD CONSTRAINT "signalements_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signalements" ADD CONSTRAINT "signalements_opportunite_id_fkey" FOREIGN KEY ("opportunite_id") REFERENCES "opportunites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions_moderation" ADD CONSTRAINT "actions_moderation_moderateur_id_fkey" FOREIGN KEY ("moderateur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions_moderation" ADD CONSTRAINT "actions_moderation_cible_id_fkey" FOREIGN KEY ("cible_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens_appareil" ADD CONSTRAINT "tokens_appareil_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles_marche" ADD CONSTRAINT "articles_marche_vendeur_id_fkey" FOREIGN KEY ("vendeur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
