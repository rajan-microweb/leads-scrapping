-- Add emailStatus column to LeadsData with default 'Pending'
-- Ensures existing rows have Pending if no value exists

-- 1. Add column with default
ALTER TABLE "LeadsData"
  ADD COLUMN IF NOT EXISTS "emailStatus" TEXT NOT NULL DEFAULT 'Pending';

-- 2. Backfill existing rows that may have NULL (if column existed without default)
UPDATE "LeadsData"
SET "emailStatus" = 'Pending'
WHERE "emailStatus" IS NULL;
