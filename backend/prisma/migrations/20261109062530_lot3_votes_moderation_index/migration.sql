-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "est_masque" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "opportunites" ADD COLUMN     "est_masque" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "votes_message" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "utilisateur_id" TEXT NOT NULL,
    "valeur" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "votes_message_utilisateur_id_idx" ON "votes_message"("utilisateur_id");

-- CreateIndex
CREATE UNIQUE INDEX "votes_message_message_id_utilisateur_id_key" ON "votes_message"("message_id", "utilisateur_id");

-- CreateIndex
CREATE INDEX "documents_canal_id_created_at_idx" ON "documents"("canal_id", "created_at");

-- CreateIndex
CREATE INDEX "documents_uploader_id_idx" ON "documents"("uploader_id");

-- CreateIndex
CREATE INDEX "messages_canal_id_created_at_idx" ON "messages"("canal_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_parent_id_idx" ON "messages"("parent_id");

-- CreateIndex
CREATE INDEX "notifications_utilisateur_id_est_lue_idx" ON "notifications"("utilisateur_id", "est_lue");

-- CreateIndex
CREATE INDEX "notifications_utilisateur_id_created_at_idx" ON "notifications"("utilisateur_id", "created_at");

-- CreateIndex
CREATE INDEX "opportunites_est_active_created_at_idx" ON "opportunites"("est_active", "created_at");

-- CreateIndex
CREATE INDEX "signalements_statut_idx" ON "signalements"("statut");

-- CreateIndex
CREATE INDEX "signalements_rapporteur_id_idx" ON "signalements"("rapporteur_id");

-- AddForeignKey
ALTER TABLE "votes_message" ADD CONSTRAINT "votes_message_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes_message" ADD CONSTRAINT "votes_message_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
