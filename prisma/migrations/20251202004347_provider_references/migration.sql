-- AlterTable
ALTER TABLE "public"."AppUser" ALTER COLUMN "notificationPreferences" SET DEFAULT '["no_offers", "over_max_price", "pending_offer_selection", "no-winning-offer", "winner-conflict-check", "request-cancelled", "new-available-request"]';

-- AlterTable
ALTER TABLE "public"."Offer" ADD COLUMN     "providerReferenceFiles" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "public"."Request" ADD COLUMN     "providerReferences" TEXT NOT NULL DEFAULT '';
