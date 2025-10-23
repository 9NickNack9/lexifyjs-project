-- AlterTable
ALTER TABLE "public"."AppUser" ADD COLUMN     "companyFoundingYear" INTEGER,
ALTER COLUMN "companyAge" DROP NOT NULL,
ALTER COLUMN "providerType" DROP NOT NULL;
