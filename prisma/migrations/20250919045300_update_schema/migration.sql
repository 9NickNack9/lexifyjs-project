/*
  Warnings:

  - You are about to drop the column `aiProcessing` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `annualCompanyRevenue` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `appDescription` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `applicationDocumentationDescription` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `companyCustomerCount` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `companyEmployeeCount` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `confidential` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `contractRole` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `dataBreachDescription` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `documentType` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `dueDiligence` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `existingDocumentation` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `interviewLocation` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `interviewSetting` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `itApplicationCount` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `itApplicationDedicatedOwners` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `itApplicationDocumentation` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `leaseType` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `legalSupportArea` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `legalSupportDuration` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `legalSupportHours` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `maximumPrice` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `objectOfSale` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `personProfiling` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `personalDataOtherCompany` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `personalDataProductCount` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `policyDescription` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `purchasePriceRange` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `templateType` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `trainDuration` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `trainingDateTime` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `trainingLocation` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `trainingSetting` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `trainingTiming` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `transactionStatus` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `webDomainCount` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `winnerBidderOnlyStatus` on the `Request` table. All the data in the column will be lost.
  - Made the column `additionalBackgroundInfo` on table `Request` required. This step will fail if there are existing NULL values in that column.
  - Made the column `backgroundInfoFiles` on table `Request` required. This step will fail if there are existing NULL values in that column.
  - Made the column `supplierCodeOfConductFiles` on table `Request` required. This step will fail if there are existing NULL values in that column.
  - Made the column `dateExpired` on table `Request` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Request" DROP COLUMN "aiProcessing",
DROP COLUMN "annualCompanyRevenue",
DROP COLUMN "appDescription",
DROP COLUMN "applicationDocumentationDescription",
DROP COLUMN "companyCustomerCount",
DROP COLUMN "companyEmployeeCount",
DROP COLUMN "confidential",
DROP COLUMN "contractRole",
DROP COLUMN "dataBreachDescription",
DROP COLUMN "documentType",
DROP COLUMN "dueDiligence",
DROP COLUMN "existingDocumentation",
DROP COLUMN "interviewLocation",
DROP COLUMN "interviewSetting",
DROP COLUMN "itApplicationCount",
DROP COLUMN "itApplicationDedicatedOwners",
DROP COLUMN "itApplicationDocumentation",
DROP COLUMN "leaseType",
DROP COLUMN "legalSupportArea",
DROP COLUMN "legalSupportDuration",
DROP COLUMN "legalSupportHours",
DROP COLUMN "maximumPrice",
DROP COLUMN "objectOfSale",
DROP COLUMN "personProfiling",
DROP COLUMN "personalDataOtherCompany",
DROP COLUMN "personalDataProductCount",
DROP COLUMN "policyDescription",
DROP COLUMN "purchasePriceRange",
DROP COLUMN "templateType",
DROP COLUMN "trainDuration",
DROP COLUMN "trainingDateTime",
DROP COLUMN "trainingLocation",
DROP COLUMN "trainingSetting",
DROP COLUMN "trainingTiming",
DROP COLUMN "transactionStatus",
DROP COLUMN "webDomainCount",
DROP COLUMN "winnerBidderOnlyStatus",
ADD COLUMN     "details" JSONB NOT NULL DEFAULT '{}',
ALTER COLUMN "requestState" DROP DEFAULT,
ALTER COLUMN "clientCompanyName" DROP NOT NULL,
ALTER COLUMN "scopeOfWork" SET DATA TYPE TEXT,
ALTER COLUMN "additionalBackgroundInfo" SET NOT NULL,
ALTER COLUMN "additionalBackgroundInfo" SET DEFAULT '',
ALTER COLUMN "backgroundInfoFiles" SET NOT NULL,
ALTER COLUMN "backgroundInfoFiles" SET DEFAULT '[]',
ALTER COLUMN "language" SET DATA TYPE TEXT,
ALTER COLUMN "supplierCodeOfConductFiles" SET NOT NULL,
ALTER COLUMN "supplierCodeOfConductFiles" SET DEFAULT '[]',
ALTER COLUMN "dateExpired" SET NOT NULL;
