-- CreateTable
CREATE TABLE "ProviderInvite" (
    "inviteId" BIGSERIAL NOT NULL,
    "referralToken" TEXT NOT NULL,
    "invitedByUserId" BIGINT NOT NULL,
    "firmName" TEXT NOT NULL,
    "contactPersons" JSONB NOT NULL,
    "personalMessage" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "registeredCompanyId" BIGINT,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderInvite_pkey" PRIMARY KEY ("inviteId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderInvite_referralToken_key" ON "ProviderInvite"("referralToken");

-- CreateIndex
CREATE INDEX "ProviderInvite_invitedByUserId_idx" ON "ProviderInvite"("invitedByUserId");

-- CreateIndex
CREATE INDEX "ProviderInvite_status_idx" ON "ProviderInvite"("status");

-- AddForeignKey
ALTER TABLE "ProviderInvite" ADD CONSTRAINT "ProviderInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "UserAccount"("userPkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderInvite" ADD CONSTRAINT "ProviderInvite_registeredCompanyId_fkey" FOREIGN KEY ("registeredCompanyId") REFERENCES "Company"("companyPkId") ON DELETE SET NULL ON UPDATE CASCADE;
