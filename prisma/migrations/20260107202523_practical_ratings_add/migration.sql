-- AlterTable
ALTER TABLE "public"."AppUser" ADD COLUMN     "providerPracticalRatings" JSONB NOT NULL DEFAULT '[]';
