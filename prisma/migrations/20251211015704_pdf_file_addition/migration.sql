-- AlterTable
ALTER TABLE "public"."Contract" ADD COLUMN     "contractPdfFile" JSONB NOT NULL DEFAULT '[]';
