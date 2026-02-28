-- CreateEnum
CREATE TYPE "public"."CompanyRole" AS ENUM ('PURCHASER', 'PROVIDER');

-- AlterTable
ALTER TABLE "public"."Contract" ADD COLUMN     "clientCompanyId" BIGINT,
ADD COLUMN     "providerCompanyId" BIGINT;

-- AlterTable
ALTER TABLE "public"."Offer" ADD COLUMN     "createdByUserId" BIGINT,
ADD COLUMN     "providerCompanyId" BIGINT;

-- AlterTable
ALTER TABLE "public"."Request" ADD COLUMN     "clientCompanyId" BIGINT,
ADD COLUMN     "createdByUserId" BIGINT;

-- CreateTable
CREATE TABLE "public"."Company" (
    "companyPkId" BIGSERIAL NOT NULL,
    "role" "public"."CompanyRole" NOT NULL,
    "registerStatus" TEXT NOT NULL DEFAULT 'pending',
    "companyName" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "companyAddress" TEXT NOT NULL,
    "companyPostalCode" TEXT NOT NULL,
    "companyCity" TEXT NOT NULL,
    "companyCountry" TEXT NOT NULL,
    "companyWebsite" TEXT NOT NULL,
    "companyProfessionals" INTEGER,
    "companyFoundingYear" INTEGER,
    "companyAge" INTEGER DEFAULT 0,
    "providerType" TEXT DEFAULT '',
    "providerTotalRating" DECIMAL DEFAULT 5,
    "providerQualityRating" DECIMAL DEFAULT 5,
    "providerCommunicationRating" DECIMAL DEFAULT 5,
    "providerBillingRating" DECIMAL DEFAULT 5,
    "providerIndividualRating" JSONB NOT NULL DEFAULT '[]',
    "providerPracticalRatings" JSONB NOT NULL DEFAULT '[]',
    "invoiceFee" DECIMAL NOT NULL DEFAULT 0,
    "companyInvoiceContactPersons" JSONB NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("companyPkId")
);

-- CreateTable
CREATE TABLE "public"."UserAccount" (
    "userPkId" BIGSERIAL NOT NULL,
    "companyId" BIGINT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "telephone" TEXT,
    "position" TEXT,
    "isCompanyAdmin" BOOLEAN NOT NULL DEFAULT false,
    "notificationPreferences" JSONB NOT NULL DEFAULT '["no_offers", "over_max_price", "pending_offer_selection", "no-winning-offer", "winner-conflict-check", "request-cancelled", "new-available-request"]',
    "blockedServiceProviders" JSONB NOT NULL DEFAULT '[]',
    "preferredLegalServiceProviders" JSONB NOT NULL DEFAULT '[]',
    "legalPanelServiceProviders" JSONB NOT NULL DEFAULT '[]',
    "winningOfferSelection" TEXT NOT NULL DEFAULT 'manual',
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,

    CONSTRAINT "UserAccount_pkey" PRIMARY KEY ("userPkId")
);

-- CreateTable
CREATE TABLE "public"."PasswordResetTokenUser" (
    "id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetTokenUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_companyName_key" ON "public"."Company"("companyName");

-- CreateIndex
CREATE UNIQUE INDEX "Company_businessId_key" ON "public"."Company"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccount_username_key" ON "public"."UserAccount"("username");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccount_email_key" ON "public"."UserAccount"("email");

-- CreateIndex
CREATE INDEX "UserAccount_companyId_idx" ON "public"."UserAccount"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetTokenUser_token_key" ON "public"."PasswordResetTokenUser"("token");

-- CreateIndex
CREATE INDEX "PasswordResetTokenUser_userId_idx" ON "public"."PasswordResetTokenUser"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetTokenUser_expiresAt_idx" ON "public"."PasswordResetTokenUser"("expiresAt");

-- CreateIndex
CREATE INDEX "Contract_clientCompanyId_idx" ON "public"."Contract"("clientCompanyId");

-- CreateIndex
CREATE INDEX "Contract_providerCompanyId_idx" ON "public"."Contract"("providerCompanyId");

-- CreateIndex
CREATE INDEX "Offer_providerCompanyId_idx" ON "public"."Offer"("providerCompanyId");

-- CreateIndex
CREATE INDEX "Offer_createdByUserId_idx" ON "public"."Offer"("createdByUserId");

-- CreateIndex
CREATE INDEX "Request_clientCompanyId_idx" ON "public"."Request"("clientCompanyId");

-- CreateIndex
CREATE INDEX "Request_createdByUserId_idx" ON "public"."Request"("createdByUserId");

-- AddForeignKey
ALTER TABLE "public"."UserAccount" ADD CONSTRAINT "UserAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("companyPkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Request" ADD CONSTRAINT "Request_clientCompanyId_fkey" FOREIGN KEY ("clientCompanyId") REFERENCES "public"."Company"("companyPkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Request" ADD CONSTRAINT "Request_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."UserAccount"("userPkId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Offer" ADD CONSTRAINT "Offer_providerCompanyId_fkey" FOREIGN KEY ("providerCompanyId") REFERENCES "public"."Company"("companyPkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Offer" ADD CONSTRAINT "Offer_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."UserAccount"("userPkId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_clientCompanyId_fkey" FOREIGN KEY ("clientCompanyId") REFERENCES "public"."Company"("companyPkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_providerCompanyId_fkey" FOREIGN KEY ("providerCompanyId") REFERENCES "public"."Company"("companyPkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PasswordResetTokenUser" ADD CONSTRAINT "PasswordResetTokenUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."UserAccount"("userPkId") ON DELETE CASCADE ON UPDATE CASCADE;
