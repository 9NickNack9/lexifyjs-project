-- AlterTable
ALTER TABLE "Request" ADD COLUMN "legalPanelGroupId" TEXT;
ALTER TABLE "Request" ADD COLUMN "legalPanelGroupName" TEXT;
ALTER TABLE "Request" ADD COLUMN "legalPanelProviders" JSONB NOT NULL DEFAULT '[]';

-- Snapshot legacy flat legal panels onto currently pending requests so
-- existing exclusive-panel RFPs stay restricted after the per-request change.
UPDATE "Request" AS r
SET
  "legalPanelGroupName" = 'Legal Panel',
  "legalPanelProviders" = ua."legalPanelServiceProviders"
FROM "UserAccount" AS ua
WHERE r."createdByUserId" = ua."userPkId"
  AND r."requestState" = 'PENDING'
  AND jsonb_typeof(ua."legalPanelServiceProviders") = 'array'
  AND jsonb_array_length(ua."legalPanelServiceProviders") > 0
  AND jsonb_typeof(ua."legalPanelServiceProviders" -> 0) = 'string';
