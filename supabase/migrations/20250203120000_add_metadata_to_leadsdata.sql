-- Add metadata column to LeadsData for flexible JSON storage (e.g. scraped fields, custom attributes)
ALTER TABLE "LeadsData"
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;
