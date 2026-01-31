-- Rename LeadRow to LeadsData and add sheetName column
-- sheetName denormalized from LeadSheets for easier identification of which sheet each row belongs to

-- 1. Add sheetName column (nullable initially for backfill)
ALTER TABLE "LeadRow" ADD COLUMN IF NOT EXISTS "sheetName" TEXT;

-- 2. Backfill sheetName from LeadSheets
UPDATE "LeadRow" r
SET "sheetName" = s."sheetName"
FROM "LeadSheets" s
WHERE r."leadFileId" = s.id;

-- 3. Make sheetName NOT NULL for new rows (existing rows now populated)
ALTER TABLE "LeadRow" ALTER COLUMN "sheetName" SET NOT NULL;

-- 4. Rename table
ALTER TABLE "LeadRow" RENAME TO "LeadsData";

-- 5. Drop old index and create new one
DROP INDEX IF EXISTS "LeadRow_leadFileId_idx";
CREATE INDEX IF NOT EXISTS "LeadsData_leadFileId_idx" ON "LeadsData"("leadFileId");

-- 6. Update RLS policies (drop old, create new for LeadsData)
DROP POLICY IF EXISTS "LeadRow_select_own" ON "LeadsData";
DROP POLICY IF EXISTS "LeadRow_insert_own" ON "LeadsData";
DROP POLICY IF EXISTS "LeadRow_update_own" ON "LeadsData";
DROP POLICY IF EXISTS "LeadRow_delete_own" ON "LeadsData";

CREATE POLICY "LeadsData_select_own"
  ON "LeadsData"
  FOR SELECT
  USING (
    "leadFileId" IN (SELECT id FROM "LeadSheets" WHERE "userId" = auth.uid()::text)
  );

CREATE POLICY "LeadsData_insert_own"
  ON "LeadsData"
  FOR INSERT
  WITH CHECK (
    "leadFileId" IN (SELECT id FROM "LeadSheets" WHERE "userId" = auth.uid()::text)
  );

CREATE POLICY "LeadsData_update_own"
  ON "LeadsData"
  FOR UPDATE
  USING (
    "leadFileId" IN (SELECT id FROM "LeadSheets" WHERE "userId" = auth.uid()::text)
  );

CREATE POLICY "LeadsData_delete_own"
  ON "LeadsData"
  FOR DELETE
  USING (
    "leadFileId" IN (SELECT id FROM "LeadSheets" WHERE "userId" = auth.uid()::text)
  );
