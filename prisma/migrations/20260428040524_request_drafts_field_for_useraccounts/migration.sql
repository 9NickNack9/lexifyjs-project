-- AlterTable
ALTER TABLE "UserAccount" ADD COLUMN     "requestDrafts" JSONB NOT NULL DEFAULT '[]';
