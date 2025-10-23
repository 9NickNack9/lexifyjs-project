-- AlterTable
ALTER TABLE "public"."AppUser" ADD COLUMN     "companyAge" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "providerType" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "notificationPreferences" SET DEFAULT '[]';
