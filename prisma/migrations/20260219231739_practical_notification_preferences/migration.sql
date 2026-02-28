-- AlterTable
ALTER TABLE "public"."UserAccount" ADD COLUMN     "practicalNotificationPreferences" JSONB NOT NULL DEFAULT '["contracts", "day_to_day", "employment", "dispute_resolution", "m_and_a", "corporate_advisory", "data_protection", "compliance", "legal_training", "banking_and_finance"]';
