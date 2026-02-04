-- Add graphSubscription JSONB column to integrations for Microsoft Graph subscription data
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS "graphSubscription" JSONB;
