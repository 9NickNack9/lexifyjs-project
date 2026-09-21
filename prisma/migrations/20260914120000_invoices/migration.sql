-- CreateTable
CREATE TABLE "Invoice" (
    "invoiceId" BIGSERIAL NOT NULL,
    "contractId" BIGINT NOT NULL,
    "uploadedByUserId" BIGINT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "feesExclVat" DECIMAL(12,2) NOT NULL,
    "disbursementsExclVat" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vatAmount" DECIMAL(12,2),
    "file" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("invoiceId")
);

-- CreateIndex
CREATE INDEX "Invoice_contractId_idx" ON "Invoice"("contractId");

-- CreateIndex
CREATE INDEX "Invoice_uploadedByUserId_idx" ON "Invoice"("uploadedByUserId");

-- CreateIndex
CREATE INDEX "Invoice_invoiceDate_idx" ON "Invoice"("invoiceDate");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("contractId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "UserAccount"("userPkId") ON DELETE RESTRICT ON UPDATE CASCADE;
