/*
  Warnings:

  - A unique constraint covering the columns `[requestId]` on the table `Contract` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Contract_requestId_key" ON "public"."Contract"("requestId");
