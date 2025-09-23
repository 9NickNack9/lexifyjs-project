/*
  Warnings:

  - Made the column `preferredLegalServiceProviders` on table `AppUser` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."AppUser" ALTER COLUMN "preferredLegalServiceProviders" SET NOT NULL,
ALTER COLUMN "preferredLegalServiceProviders" SET DEFAULT '[]';
