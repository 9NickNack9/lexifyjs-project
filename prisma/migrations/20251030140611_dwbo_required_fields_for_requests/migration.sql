-- AlterTable
ALTER TABLE "public"."Request" ADD COLUMN     "acceptDeadlinePausedAt" TIMESTAMP(3),
ADD COLUMN     "acceptDeadlinePausedRemainingMs" INTEGER,
ADD COLUMN     "disqualifiedOfferIds" JSONB,
ADD COLUMN     "selectedOfferId" BIGINT;
