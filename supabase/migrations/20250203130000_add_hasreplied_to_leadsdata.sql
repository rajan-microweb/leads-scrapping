-- Add hasReplied column to LeadsData for reply tracking
-- Restrict values to 'YES' or 'NO', defaulting to 'NO'

ALTER TABLE "LeadsData"
  ADD COLUMN IF NOT EXISTS "hasReplied" TEXT NOT NULL DEFAULT 'NO'
  CHECK ("hasReplied" IN ('YES', 'NO'));

-- Backfill existing rows to ensure a consistent value
UPDATE "LeadsData"
SET "hasReplied" = 'NO'
WHERE "hasReplied" IS NULL;

