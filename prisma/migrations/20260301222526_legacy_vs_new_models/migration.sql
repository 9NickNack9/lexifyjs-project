/*
  Warnings:

  - A unique constraint covering the columns `[requestId,providerUserId]` on the table `Offer` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Offer_requestId_providerId_key";

-- AlterTable
ALTER TABLE "public"."Contract" ADD COLUMN     "clientUserId" BIGINT,
ADD COLUMN     "providerUserId" BIGINT,
ALTER COLUMN "clientId" DROP NOT NULL,
ALTER COLUMN "providerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Offer" ADD COLUMN     "providerUserId" BIGINT,
ALTER COLUMN "providerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Request" ADD COLUMN     "clientUserId" BIGINT,
ALTER COLUMN "clientId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Contract_clientUserId_idx" ON "public"."Contract"("clientUserId");

-- CreateIndex
CREATE INDEX "Contract_providerUserId_idx" ON "public"."Contract"("providerUserId");

-- CreateIndex
CREATE INDEX "Offer_providerUserId_idx" ON "public"."Offer"("providerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_requestId_providerUserId_key" ON "public"."Offer"("requestId", "providerUserId");

-- CreateIndex
CREATE INDEX "Request_clientUserId_idx" ON "public"."Request"("clientUserId");

-- AddForeignKey
ALTER TABLE "public"."Request" ADD CONSTRAINT "Request_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "public"."UserAccount"("userPkId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Offer" ADD CONSTRAINT "Offer_providerUserId_fkey" FOREIGN KEY ("providerUserId") REFERENCES "public"."UserAccount"("userPkId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "public"."UserAccount"("userPkId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_providerUserId_fkey" FOREIGN KEY ("providerUserId") REFERENCES "public"."UserAccount"("userPkId") ON DELETE RESTRICT ON UPDATE CASCADE;
