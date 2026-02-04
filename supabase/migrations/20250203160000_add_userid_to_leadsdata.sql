-- Add userId column to LeadsData for denormalized ownership
-- Backfill from LeadSheets.userId so every row is associated with a user.

ALTER TABLE "LeadsData"
  ADD COLUMN IF NOT EXISTS "userId" TEXT;

UPDATE "LeadsData" ld
SET "userId" = s."userId"
FROM "LeadSheets" s
WHERE ld."leadSheetId" = s.id
  AND ld."userId" IS NULL;

ALTER TABLE "LeadsData"
  ALTER COLUMN "userId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "LeadsData_userId_idx" ON "LeadsData"("userId");

