-- Make hasReplied column nullable and remove default so it starts empty.
-- Still restrict non-null values to 'YES' or 'NO' via existing CHECK constraint.

ALTER TABLE "LeadsData"
  ALTER COLUMN "hasReplied" DROP DEFAULT,
  ALTER COLUMN "hasReplied" DROP NOT NULL;

-- Optionally clear existing values so they start empty.
-- This keeps the column null until explicitly set to 'YES' or 'NO' later.
UPDATE "LeadsData"
SET "hasReplied" = NULL;

