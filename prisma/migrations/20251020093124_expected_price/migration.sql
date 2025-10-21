/*
  Warnings:

  - Added the required column `offerExpectedPrice` to the `Offer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Offer" ADD COLUMN     "offerExpectedPrice" DECIMAL NOT NULL;
