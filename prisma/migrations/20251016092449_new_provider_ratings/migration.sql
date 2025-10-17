-- AlterTable
ALTER TABLE "public"."AppUser" ADD COLUMN     "providerBillingRating" DECIMAL DEFAULT 5,
ADD COLUMN     "providerCommunicationRating" DECIMAL DEFAULT 5,
ADD COLUMN     "providerQualityRating" DECIMAL DEFAULT 5,
ALTER COLUMN "providerTotalRating" SET DEFAULT 5;
