-- AlterTable
ALTER TABLE "public"."UserAccount" ADD COLUMN     "twoFactorRecoveryCodes" JSONB;

-- CreateTable
CREATE TABLE "public"."TrustedDevice" (
    "id" BIGSERIAL NOT NULL,
    "userPkId" BIGINT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "label" TEXT,
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustedDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuthAttempt" (
    "id" BIGSERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "ip" TEXT,
    "kind" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrustedDevice_tokenHash_key" ON "public"."TrustedDevice"("tokenHash");

-- CreateIndex
CREATE INDEX "TrustedDevice_userPkId_idx" ON "public"."TrustedDevice"("userPkId");

-- CreateIndex
CREATE INDEX "TrustedDevice_expiresAt_idx" ON "public"."TrustedDevice"("expiresAt");

-- CreateIndex
CREATE INDEX "AuthAttempt_username_createdAt_idx" ON "public"."AuthAttempt"("username", "createdAt");

-- CreateIndex
CREATE INDEX "AuthAttempt_ip_createdAt_idx" ON "public"."AuthAttempt"("ip", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."TrustedDevice" ADD CONSTRAINT "TrustedDevice_userPkId_fkey" FOREIGN KEY ("userPkId") REFERENCES "public"."UserAccount"("userPkId") ON DELETE CASCADE ON UPDATE CASCADE;
