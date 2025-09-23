-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('PURCHASER', 'PROVIDER', 'ADMIN');

-- CreateTable
CREATE TABLE "public"."AppUser" (
    "userId" BIGSERIAL NOT NULL,
    "role" "public"."Role" NOT NULL,
    "registerStatus" TEXT NOT NULL DEFAULT 'pending',
    "username" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyAddress" TEXT NOT NULL,
    "companyPostalCode" TEXT NOT NULL,
    "companyCity" TEXT NOT NULL,
    "companyCountry" TEXT NOT NULL,
    "companyWebsite" TEXT NOT NULL,
    "companyProfessionals" INTEGER,
    "contactFirstName" TEXT NOT NULL,
    "contactLastName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactTelephone" TEXT NOT NULL,
    "contactPosition" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "companyContactPersons" JSONB NOT NULL,
    "notificationPreferences" JSONB NOT NULL DEFAULT '["no_offers","over_max_price","pending_offer_selection"]',
    "winningOfferSelection" TEXT NOT NULL DEFAULT 'automatic',
    "blockedServiceProviders" JSONB NOT NULL DEFAULT '[]',
    "preferredLegalServiceProviders" JSONB,
    "legalPanelServiceProviders" JSONB NOT NULL DEFAULT '[]',
    "providerTotalRating" DECIMAL,
    "providerIndividualRating" JSONB NOT NULL DEFAULT '[]',
    "invoiceFee" DECIMAL NOT NULL DEFAULT 0,
    "companyInvoiceContactPersons" JSONB NOT NULL,

    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."Request" (
    "requestId" BIGSERIAL NOT NULL,
    "clientId" BIGINT NOT NULL,
    "requestState" TEXT NOT NULL DEFAULT 'pending',
    "requestCategory" TEXT NOT NULL,
    "requestSubcategory" TEXT,
    "assignmentType" TEXT,
    "clientCompanyName" TEXT NOT NULL,
    "primaryContactPerson" TEXT NOT NULL,
    "scopeOfWork" JSONB NOT NULL,
    "description" TEXT NOT NULL,
    "confidential" BOOLEAN,
    "winnerBidderOnlyStatus" TEXT,
    "additionalBackgroundInfo" TEXT,
    "backgroundInfoFiles" JSONB,
    "serviceProviderType" TEXT NOT NULL,
    "domesticOffers" TEXT NOT NULL,
    "providerSize" TEXT NOT NULL,
    "providerCompanyAge" TEXT NOT NULL,
    "providerMinimumRating" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentRate" TEXT NOT NULL,
    "maximumPrice" DECIMAL,
    "advanceRetainerFee" TEXT NOT NULL,
    "invoiceType" TEXT NOT NULL,
    "language" JSONB NOT NULL,
    "offersDeadline" TIMESTAMP(3) NOT NULL,
    "supplierCodeOfConductFiles" JSONB,
    "title" TEXT NOT NULL,
    "objectOfSale" TEXT,
    "transactionStatus" TEXT,
    "purchasePriceRange" TEXT,
    "leaseType" TEXT,
    "contractRole" TEXT,
    "templateType" TEXT,
    "legalSupportHours" TEXT,
    "legalSupportDuration" TEXT,
    "legalSupportArea" JSONB NOT NULL DEFAULT '[]',
    "dueDiligence" TEXT,
    "appDescription" TEXT,
    "policyDescription" TEXT,
    "annualCompanyRevenue" TEXT,
    "companyEmployeeCount" TEXT,
    "companyCustomerCount" TEXT,
    "itApplicationCount" TEXT,
    "personalDataProductCount" TEXT,
    "webDomainCount" TEXT,
    "itApplicationDocumentation" TEXT,
    "applicationDocumentationDescription" TEXT,
    "existingDocumentation" TEXT,
    "itApplicationDedicatedOwners" TEXT,
    "aiProcessing" TEXT,
    "personProfiling" TEXT,
    "interviewSetting" TEXT,
    "interviewLocation" TEXT,
    "documentType" TEXT,
    "dataBreachDescription" TEXT,
    "personalDataOtherCompany" TEXT,
    "trainDuration" TEXT,
    "trainingTiming" TEXT,
    "trainingDateTime" TIMESTAMP(3),
    "trainingSetting" TEXT,
    "trainingLocation" TEXT,
    "dateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateExpired" TIMESTAMP(3),
    "contractResult" TEXT,
    "contractPrice" DECIMAL,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("requestId")
);

-- CreateTable
CREATE TABLE "public"."Offer" (
    "offerId" BIGSERIAL NOT NULL,
    "requestId" BIGINT NOT NULL,
    "providerId" BIGINT NOT NULL,
    "offerLawyer" TEXT NOT NULL,
    "offerPrice" DECIMAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "offerTitle" TEXT NOT NULL,
    "offerStatus" TEXT NOT NULL DEFAULT 'Pending',

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("offerId")
);

-- CreateTable
CREATE TABLE "public"."Contract" (
    "contractId" BIGSERIAL NOT NULL,
    "requestId" BIGINT NOT NULL,
    "clientId" BIGINT NOT NULL,
    "providerId" BIGINT NOT NULL,
    "contractDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contractPrice" DECIMAL NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("contractId")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_username_key" ON "public"."AppUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_companyName_key" ON "public"."AppUser"("companyName");

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_companyId_key" ON "public"."AppUser"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_requestId_providerId_key" ON "public"."Offer"("requestId", "providerId");

-- AddForeignKey
ALTER TABLE "public"."Request" ADD CONSTRAINT "Request_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."AppUser"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Offer" ADD CONSTRAINT "Offer_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "public"."Request"("requestId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Offer" ADD CONSTRAINT "Offer_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "public"."AppUser"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "public"."Request"("requestId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."AppUser"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "public"."AppUser"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
